import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RsvpDto } from './dto/rsvp.dto';

/** Shared include block for event queries */
const EVENT_INCLUDE = {
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  attendees: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} as const;

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── List Events (date-range window) ──────────────────────────────────────────

  async listEvents(
    orgId: string,
    actorId: string,
    query: {
      from: string;
      to: string;
      type?: string;
      entityType?: string;
      entityId?: string;
      myOnly?: boolean;
    },
  ) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const where: any = {
      organizationId: orgId,
      deletedAt: null,
      startAt: { gte: from },
      endAt: { lte: to },
    };

    if (query.type) where.type = query.type;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;

    if (query.myOnly) {
      where.OR = [
        { createdById: actorId },
        { attendees: { some: { userId: actorId } } },
      ];
    }

    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: EVENT_INCLUDE,
    });
  }

  // ─── Upcoming Events (dashboard widget) ───────────────────────────────────────

  async getUpcoming(orgId: string, actorId: string, limit = 5) {
    return this.prisma.calendarEvent.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        startAt: { gte: new Date() },
        OR: [
          { createdById: actorId },
          { attendees: { some: { userId: actorId } } },
        ],
      },
      orderBy: { startAt: 'asc' },
      take: limit,
      include: EVENT_INCLUDE,
    });
  }

  // ─── Get One ──────────────────────────────────────────────────────────────────

  async getEventById(id: string, orgId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: EVENT_INCLUDE,
    });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  // ─── Create ───────────────────────────────────────────────────────────────────

  async createEvent(dto: CreateEventDto, orgId: string, actorId: string) {
    this.assertDateOrder(dto.startAt, dto.endAt);

    if (dto.attendeeIds?.length) {
      await this.assertUsersInOrg(dto.attendeeIds, orgId);
    }

    const event = await this.prisma.calendarEvent.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        type: dto.type as any,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        allDay: dto.allDay ?? false,
        description: dto.description || null,
        location: dto.location || null,
        recurrence: (dto.recurrence as any) || 'NONE',
        entityType: dto.entityType || null,
        entityId: dto.entityId || null,
        createdById: actorId,
        attendees: dto.attendeeIds?.length
          ? {
              createMany: {
                data: dto.attendeeIds.map((userId) => ({ userId, status: 'INVITED' })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: EVENT_INCLUDE,
    });

    await this.writeAudit(orgId, actorId, 'calendar_event.create', event.id, null, event);
    return event;
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  async updateEvent(id: string, dto: UpdateEventDto, orgId: string, actorId: string, isAdmin: boolean) {
    const existing = await this.assertEventExists(id, orgId);
    this.assertOwnerOrAdmin(existing, actorId, isAdmin);

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    this.assertDateOrder(startAt.toISOString(), endAt.toISOString());

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        type: dto.type !== undefined ? (dto.type as any) : existing.type,
        startAt,
        endAt,
        allDay: dto.allDay !== undefined ? dto.allDay : existing.allDay,
        description: dto.description !== undefined ? dto.description : existing.description,
        location: dto.location !== undefined ? dto.location : existing.location,
        recurrence: dto.recurrence !== undefined ? (dto.recurrence as any) : existing.recurrence,
        entityType: dto.entityType !== undefined ? dto.entityType : existing.entityType,
        entityId: dto.entityId !== undefined ? dto.entityId : existing.entityId,
      },
      include: EVENT_INCLUDE,
    });

    await this.writeAudit(orgId, actorId, 'calendar_event.update', id, existing, updated);
    return updated;
  }

  // ─── Delete (Soft) ─────────────────────────────────────────────────────────────

  async deleteEvent(id: string, orgId: string, actorId: string, isAdmin: boolean) {
    const existing = await this.assertEventExists(id, orgId);
    this.assertOwnerOrAdmin(existing, actorId, isAdmin);

    await this.prisma.calendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.writeAudit(orgId, actorId, 'calendar_event.delete', id, existing, null);
    return { success: true };
  }

  // ─── Attendees: Add ───────────────────────────────────────────────────────────

  async addAttendees(eventId: string, userIds: string[], orgId: string, actorId: string, isAdmin: boolean) {
    const existing = await this.assertEventExists(eventId, orgId);
    this.assertOwnerOrAdmin(existing, actorId, isAdmin);
    await this.assertUsersInOrg(userIds, orgId);

    await this.prisma.eventAttendee.createMany({
      data: userIds.map((userId) => ({ eventId, userId, status: 'INVITED' })),
      skipDuplicates: true,
    });

    return this.getEventById(eventId, orgId);
  }

  // ─── Attendees: Remove ────────────────────────────────────────────────────────

  async removeAttendee(eventId: string, userId: string, orgId: string, actorId: string, isAdmin: boolean) {
    const existing = await this.assertEventExists(eventId, orgId);
    this.assertOwnerOrAdmin(existing, actorId, isAdmin);

    await this.prisma.eventAttendee.delete({
      where: { eventId_userId: { eventId, userId } },
    });

    return { success: true };
  }

  // ─── RSVP ─────────────────────────────────────────────────────────────────────

  async rsvp(eventId: string, dto: RsvpDto, orgId: string, actorId: string) {
    await this.assertEventExists(eventId, orgId);

    const attendee = await this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId: actorId } },
    });

    if (!attendee) {
      throw new ForbiddenException('You are not an attendee of this event');
    }

    return this.prisma.eventAttendee.update({
      where: { eventId_userId: { eventId, userId: actorId } },
      data: { status: dto.status },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private assertDateOrder(startAt: string, endAt: string) {
    if (new Date(endAt) <= new Date(startAt)) {
      throw new BadRequestException('endAt must be strictly after startAt');
    }
  }

  private assertOwnerOrAdmin(event: any, actorId: string, isAdmin: boolean) {
    if (!isAdmin && event.createdById !== actorId) {
      throw new ForbiddenException('You do not have permission to modify this event');
    }
  }

  private async assertEventExists(id: string, orgId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  private async assertUsersInOrg(userIds: string[], orgId: string) {
    const members = await this.prisma.userOrganization.findMany({
      where: { organizationId: orgId, userId: { in: userIds } },
      select: { userId: true },
    });
    const foundIds = new Set(members.map((m) => m.userId));
    const missing = userIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(`These users are not members of the organization: ${missing.join(', ')}`);
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
        resourceName: 'calendar_event',
        resourceId,
        payloadBefore: before ?? undefined,
        payloadAfter: after ?? undefined,
      },
    });
  }
}
