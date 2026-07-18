import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

const mockPrisma = {
  calendarEvent: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  eventAttendee: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  userOrganization: {
    findMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const ORG_ID = 'org-uuid';
const ACTOR_ID = 'user-uuid';
const OTHER_ID = 'other-user-uuid';
const EVENT_ID = 'event-uuid';

const FUTURE = new Date(Date.now() + 3_600_000).toISOString(); // 1h from now
const PAST = new Date(Date.now() - 3_600_000).toISOString();  // 1h ago

const mockEvent = {
  id: EVENT_ID,
  organizationId: ORG_ID,
  title: 'Stand-up',
  type: 'MEETING',
  startAt: new Date(FUTURE),
  endAt: new Date(new Date(FUTURE).getTime() + 1_800_000),
  allDay: false,
  recurrence: 'NONE',
  createdById: ACTOR_ID,
  deletedAt: null,
};

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── listEvents ─────────────────────────────────────────────────────────────

  describe('listEvents', () => {
    it('should return events in date window', async () => {
      mockPrisma.calendarEvent.findMany.mockResolvedValue([mockEvent]);
      const result = await service.listEvents(ORG_ID, ACTOR_ID, { from: PAST, to: FUTURE });
      expect(result).toHaveLength(1);
      expect(mockPrisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_ID }) }),
      );
    });

    it('should apply myOnly OR filter when requested', async () => {
      mockPrisma.calendarEvent.findMany.mockResolvedValue([]);
      await service.listEvents(ORG_ID, ACTOR_ID, { from: PAST, to: FUTURE, myOnly: true });
      expect(mockPrisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ createdById: ACTOR_ID }]),
          }),
        }),
      );
    });
  });

  // ─── getUpcoming ────────────────────────────────────────────────────────────

  describe('getUpcoming', () => {
    it('should return events starting from now, respecting limit', async () => {
      mockPrisma.calendarEvent.findMany.mockResolvedValue([mockEvent]);
      const result = await service.getUpcoming(ORG_ID, ACTOR_ID, 3);
      expect(mockPrisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ─── getEventById ────────────────────────────────────────────────────────────

  describe('getEventById', () => {
    it('should return event when found', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(mockEvent);
      const result = await service.getEventById(EVENT_ID, ORG_ID);
      expect(result.id).toBe(EVENT_ID);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(null);
      await expect(service.getEventById('bad-id', ORG_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createEvent ─────────────────────────────────────────────────────────────

  describe('createEvent', () => {
    it('should create an event successfully', async () => {
      mockPrisma.calendarEvent.create.mockResolvedValue({ ...mockEvent, title: 'Demo Call' });
      const result = await service.createEvent(
        { title: 'Demo Call', type: 'CALL', startAt: FUTURE, endAt: new Date(new Date(FUTURE).getTime() + 1_800_000).toISOString() },
        ORG_ID, ACTOR_ID,
      );
      expect(result.title).toBe('Demo Call');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when endAt <= startAt', async () => {
      await expect(
        service.createEvent({ title: 'Bad', type: 'MEETING', startAt: FUTURE, endAt: FUTURE }, ORG_ID, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate attendees belong to org', async () => {
      mockPrisma.userOrganization.findMany.mockResolvedValue([]); // nobody found
      await expect(
        service.createEvent(
          { title: 'T', type: 'CALL', startAt: PAST, endAt: FUTURE, attendeeIds: ['foreign-user'] },
          ORG_ID, ACTOR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateEvent ─────────────────────────────────────────────────────────────

  describe('updateEvent', () => {
    it('should update event when actor is owner', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(mockEvent);
      mockPrisma.calendarEvent.update.mockResolvedValue({ ...mockEvent, title: 'Updated' });
      const result = await service.updateEvent(EVENT_ID, { title: 'Updated' }, ORG_ID, ACTOR_ID, false);
      expect(result.title).toBe('Updated');
    });

    it('should throw ForbiddenException when non-owner non-admin tries to update', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(mockEvent); // createdById = ACTOR_ID
      await expect(
        service.updateEvent(EVENT_ID, { title: 'Hacked' }, ORG_ID, OTHER_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update others\' events', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(mockEvent);
      mockPrisma.calendarEvent.update.mockResolvedValue({ ...mockEvent, title: 'Admin Edit' });
      await expect(
        service.updateEvent(EVENT_ID, { title: 'Admin Edit' }, ORG_ID, OTHER_ID, true),
      ).resolves.toBeDefined();
    });
  });

  // ─── deleteEvent ─────────────────────────────────────────────────────────────

  describe('deleteEvent', () => {
    it('should soft-delete event when actor is owner', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(mockEvent);
      mockPrisma.calendarEvent.update.mockResolvedValue({ ...mockEvent, deletedAt: new Date() });
      const result = await service.deleteEvent(EVENT_ID, ORG_ID, ACTOR_ID, false);
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException for non-owner non-admin delete', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(mockEvent);
      await expect(service.deleteEvent(EVENT_ID, ORG_ID, OTHER_ID, false)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── rsvp ───────────────────────────────────────────────────────────────────

  describe('rsvp', () => {
    it('should update attendee status on valid RSVP', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(mockEvent);
      mockPrisma.eventAttendee.findUnique.mockResolvedValue({ eventId: EVENT_ID, userId: ACTOR_ID, status: 'INVITED' });
      mockPrisma.eventAttendee.update.mockResolvedValue({ eventId: EVENT_ID, userId: ACTOR_ID, status: 'ACCEPTED' });
      const result = await service.rsvp(EVENT_ID, { status: 'ACCEPTED' }, ORG_ID, ACTOR_ID);
      expect(result.status).toBe('ACCEPTED');
    });

    it('should throw ForbiddenException when user is not an attendee', async () => {
      mockPrisma.calendarEvent.findFirst.mockResolvedValue(mockEvent);
      mockPrisma.eventAttendee.findUnique.mockResolvedValue(null);
      await expect(service.rsvp(EVENT_ID, { status: 'ACCEPTED' }, ORG_ID, OTHER_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
