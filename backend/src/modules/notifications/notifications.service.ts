import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationCategory, NotificationPriority, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { ListNotificationsDto, NotificationStatusFilter } from './dto/list-notifications.dto';

export interface ActivityNotificationInput {
  organizationId: string;
  actorId?: string;
  recipientIds: string[];
  resourceType: string;
  resourceId?: string;
  title: string;
  body: string;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  metadata?: Prisma.InputJsonValue;
  dedupeKey: string;
}

const RESOURCE_PERMISSIONS: Record<string, string> = {
  lead: 'leads:read', account: 'clients:read', contact: 'clients:read', opportunity: 'opportunities:read',
  quotation: 'quotations:read', project: 'projects:read', milestone: 'projects:read', task: 'tasks:read',
  calendar: 'calendar:read', invoice: 'billing:read', payment: 'billing:read', ticket: 'tickets:read', report: 'reports:read',
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: NotificationsGateway) {}

  async createActivity(input: ActivityNotificationInput): Promise<void> {
    const candidates = [...new Set(input.recipientIds)].filter((id) => id && id !== input.actorId);
    if (!candidates.length) return;
    const permission = RESOURCE_PERMISSIONS[input.resourceType] || 'notifications:read';
    const { recipientIds: _recipientIds, ...data } = input;
    const memberships = await this.prisma.userOrganization.findMany({
      where: { organizationId: input.organizationId, userId: { in: candidates }, deletedAt: null, user: { status: 'active' } },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });
    await Promise.all(memberships.filter((member) => member.role.name === 'SuperAdmin' || member.role.rolePermissions.some((rp) => rp.permission.code === permission)).map(async (member) => {
      const notification = await this.prisma.notification.upsert({
        where: { recipientId_dedupeKey: { recipientId: member.userId, dedupeKey: input.dedupeKey } },
        update: {},
        create: { ...data, recipientId: member.userId, category: input.category ?? NotificationCategory.CRM_ACTIVITY, priority: input.priority ?? NotificationPriority.NORMAL },
      });
      this.gateway.emitToUser(input.organizationId, member.userId, notification);
    }));
  }

  async list(organizationId: string, recipientId: string, query: ListNotificationsDto) {
    const where = { organizationId, recipientId, ...(query.status === NotificationStatusFilter.UNREAD ? { readAt: null } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total };
  }

  async unreadCount(organizationId: string, recipientId: string) {
    return { count: await this.prisma.notification.count({ where: { organizationId, recipientId, readAt: null } }) };
  }

  async markRead(id: string, organizationId: string, recipientId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, organizationId, recipientId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { readAt: notification.readAt ?? new Date() } });
  }

  async markAllRead(organizationId: string, recipientId: string) {
    const result = await this.prisma.notification.updateMany({ where: { organizationId, recipientId, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  async runMaintenance(now = new Date()): Promise<void> {
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tasks = await this.prisma.task.findMany({ where: { dueDate: { gte: now, lte: soon }, status: { notIn: ['DONE', 'CANCELLED'] }, deletedAt: null, assignedToId: { not: null } } });
    await Promise.all(tasks.map((task) => this.createActivity({ organizationId: task.organizationId, recipientIds: [task.assignedToId!], resourceType: 'task', resourceId: task.id, title: 'Task due within 24 hours', body: task.title, category: NotificationCategory.TASK_REMINDER, priority: NotificationPriority.HIGH, dedupeKey: `task:due-soon:${task.id}:${task.dueDate!.toISOString().slice(0, 10)}` })));
    const overdue = await this.prisma.task.findMany({ where: { dueDate: { lt: now }, status: { notIn: ['DONE', 'CANCELLED'] }, deletedAt: null, assignedToId: { not: null } } });
    await Promise.all(overdue.map((task) => this.createActivity({ organizationId: task.organizationId, recipientIds: [task.assignedToId!], resourceType: 'task', resourceId: task.id, title: 'Task is overdue', body: task.title, category: NotificationCategory.TASK_REMINDER, priority: NotificationPriority.HIGH, dedupeKey: `task:overdue:${task.id}:${now.toISOString().slice(0, 10)}` })));
    const starts = new Date(now.getTime() + 15 * 60 * 1000);
    const events = await this.prisma.calendarEvent.findMany({ where: { startAt: { gte: new Date(starts.getTime() - 60_000), lte: starts }, allDay: false, deletedAt: null }, include: { attendees: true } });
    await Promise.all(events.flatMap((event) => event.attendees.map((attendee) => this.createActivity({ organizationId: event.organizationId, recipientIds: [attendee.userId], resourceType: 'calendar', resourceId: event.id, title: 'Calendar event starts in 15 minutes', body: event.title, category: NotificationCategory.CALENDAR_REMINDER, dedupeKey: `calendar:reminder:${event.id}:${event.startAt.toISOString()}` }))));
    await this.prisma.notification.deleteMany({ where: { readAt: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } } });
  }
}
