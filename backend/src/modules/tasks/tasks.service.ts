import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException, Optional,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PatchStatusDto } from './dto/patch-status.dto';
import { NotificationsService } from '../notifications/notifications.service';

/** Status transitions that are always blocked */
const BLOCKED_TRANSITIONS: Record<string, string[]> = {
  CANCELLED: ['TODO', 'IN_PROGRESS'], // Cannot reopen a cancelled task
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly notifications?: NotificationsService) {}

  // ─── List ────────────────────────────────────────────────────────────────────

  async listTasks(
    orgId: string,
    query: {
      page: number;
      limit: number;
      status?: string;
      priority?: string;
      assignedToId?: string;
      entityType?: string;
      entityId?: string;
      overdue?: boolean;
      search?: string;
      myId?: string; // when "my tasks" toggle is active
    },
  ) {
    const skip = (query.page - 1) * query.limit;
    const where: any = { organizationId: orgId, deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.myId) where.assignedToId = query.myId;
    else if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['DONE', 'CANCELLED'] };
    }

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return { total, data };
  }

  // ─── KPI Counts ──────────────────────────────────────────────────────────────

  async getKpis(orgId: string, actorId: string) {
    const now = new Date();

    const [total, overdue, completedToday, urgentHigh, myOpen] = await Promise.all([
      this.prisma.task.count({
        where: { organizationId: orgId, deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { lt: now },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: 'DONE',
          completedAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: { notIn: ['DONE', 'CANCELLED'] },
          priority: { in: ['HIGH', 'URGENT'] },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: { notIn: ['DONE', 'CANCELLED'] },
          assignedToId: actorId,
        },
      }),
    ]);

    return { total, overdue, completedToday, urgentHigh, myOpen };
  }

  // ─── Get One ─────────────────────────────────────────────────────────────────

  async getTaskById(id: string, orgId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async createTask(dto: CreateTaskDto, orgId: string, actorId: string) {
    // Validate entityType + entityId must come together
    if ((dto.entityType && !dto.entityId) || (!dto.entityType && dto.entityId)) {
      throw new BadRequestException('entityType and entityId must both be provided or both omitted');
    }

    // Validate assignedToId belongs to the org
    if (dto.assignedToId) {
      await this.assertUserInOrg(dto.assignedToId, orgId);
    }

    const task = await this.prisma.task.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        description: dto.description,
        priority: (dto.priority as any) || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        entityType: dto.entityType || null,
        entityId: dto.entityId || null,
        assignedToId: dto.assignedToId || null,
        createdById: actorId,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.writeAudit(orgId, actorId, 'task.create', task.id, null, task);
    await this.notify(task, orgId, actorId, 'assigned');
    return task;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async updateTask(id: string, dto: UpdateTaskDto, orgId: string, actorId: string) {
    const existing = await this.assertTaskExists(id, orgId);

    if (dto.assignedToId) {
      await this.assertUserInOrg(dto.assignedToId, orgId);
    }

    const data: any = {
      title: dto.title ?? existing.title,
      description: dto.description !== undefined ? dto.description : existing.description,
      priority: dto.priority !== undefined ? dto.priority : existing.priority,
      dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : existing.dueDate,
      entityType: dto.entityType !== undefined ? dto.entityType : existing.entityType,
      entityId: dto.entityId !== undefined ? dto.entityId : existing.entityId,
      assignedToId: dto.assignedToId !== undefined ? dto.assignedToId : existing.assignedToId,
    };

    const updated = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.writeAudit(orgId, actorId, 'task.update', id, existing, updated);
    await this.notify(updated, orgId, actorId, 'updated');
    return updated;
  }

  // ─── Patch Status ─────────────────────────────────────────────────────────────

  async patchStatus(id: string, dto: PatchStatusDto, orgId: string, actorId: string) {
    const existing = await this.assertTaskExists(id, orgId);

    // Guard blocked transitions
    const blocked = BLOCKED_TRANSITIONS[existing.status];
    if (blocked?.includes(dto.status)) {
      throw new ForbiddenException(
        `Cannot transition task from '${existing.status}' to '${dto.status}'`,
      );
    }

    const data: any = { status: dto.status };

    // Record completedAt when transitioning into DONE
    if (dto.status === 'DONE' && existing.status !== 'DONE') {
      data.completedAt = new Date();
    } else if (dto.status !== 'DONE' && existing.status === 'DONE') {
      data.completedAt = null;
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.writeAudit(orgId, actorId, 'task.status_changed', id, existing, updated);
    await this.notify(updated, orgId, actorId, `status changed to ${updated.status}`);
    return updated;
  }

  // ─── Delete (Soft) ───────────────────────────────────────────────────────────

  async deleteTask(id: string, orgId: string, actorId: string) {
    const existing = await this.assertTaskExists(id, orgId);

    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.writeAudit(orgId, actorId, 'task.delete', id, existing, null);
    await this.notify(existing, orgId, actorId, 'deleted');
    return { success: true };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async notify(task: { id: string; title: string; assignedToId: string | null; createdById: string }, orgId: string, actorId: string, action: string): Promise<void> {
    await this.notifications?.createActivity({ organizationId: orgId, actorId, recipientIds: [task.assignedToId, task.createdById].filter((id): id is string => Boolean(id)), resourceType: 'task', resourceId: task.id, title: `Task ${action}`, body: task.title, dedupeKey: `task:${task.id}:${action}:${Date.now()}` });
  }

  private async assertTaskExists(id: string, orgId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  private async assertUserInOrg(userId: string, orgId: string) {
    const member = await this.prisma.userOrganization.findFirst({
      where: { userId, organizationId: orgId },
    });
    if (!member) {
      throw new BadRequestException('Assigned user is not a member of this organization');
    }
  }

  private async writeAudit(
    orgId: string,
    userId: string,
    action: string,
    resourceId: string,
    before: any,
    after: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action,
        resourceName: 'task',
        resourceId,
        payloadBefore: before ?? undefined,
        payloadAfter: after ?? undefined,
      },
    });
  }
}
