import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  ticket: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  ticketComment: {
    create: jest.fn(),
  },
  account: {
    findFirst: jest.fn(),
  },
  contact: {
    findFirst: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

const ORG_ID = 'org-uuid';
const ACTOR_ID = 'user-uuid';
const TICKET_ID = 'ticket-uuid';
const ACCOUNT_ID = 'account-uuid';
const CLIENT_EMAIL = 'client@example.com';

const mockTicket = {
  id: TICKET_ID,
  organizationId: ORG_ID,
  accountId: ACCOUNT_ID,
  subject: 'Stripe Payment Issue',
  description: 'Cannot pay invoices with credit card.',
  status: 'OPEN',
  priority: 'HIGH',
  category: 'BILLING',
  createdById: ACTOR_ID,
  assignedToId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  comments: [],
};

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTicket', () => {
    it('should allow sales rep to log a ticket for a client account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: ACCOUNT_ID });
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);

      const dto = {
        accountId: ACCOUNT_ID,
        subject: 'ACME technical integration issue',
        description: 'Unable to access the Git pod environment.',
        priority: 'HIGH',
        category: 'TECHNICAL',
      };

      const result = await service.createTicket(dto, ORG_ID, ACTOR_ID, 'SalesRepresentative', 'sales@dgo.com');

      expect(result).toBeDefined();
      expect(mockPrisma.ticket.create).toHaveBeenCalled();
      expect(mockPrisma.account.findFirst).toHaveBeenCalled();
    });

    it('should look up account and force accountId when client contact logs ticket', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ accountId: ACCOUNT_ID });
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);

      const dto = {
        accountId: 'any-id-ignored',
        subject: 'General feedback support request',
        description: 'Need to review overall B2B billing logs.',
      };

      await service.createTicket(dto, ORG_ID, ACTOR_ID, 'ClientContact', CLIENT_EMAIL);

      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: CLIENT_EMAIL, organizationId: ORG_ID, deletedAt: null } }),
      );
      expect(mockPrisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: ACCOUNT_ID,
            status: 'OPEN',
          }),
        }),
      );
    });
  });

  describe('listTickets', () => {
    it('should return all tickets for TenantAdmin', async () => {
      mockPrisma.ticket.count.mockResolvedValue(1);
      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);

      const result = await service.listTickets(ORG_ID, { page: 1, limit: 15 }, 'TenantAdmin', 'admin@dgo.com');

      expect(result.total).toBe(1);
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: ORG_ID }),
        }),
      );
    });

    it('should scope listings to own accountId for ClientContact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ accountId: ACCOUNT_ID });
      mockPrisma.ticket.count.mockResolvedValue(1);
      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);

      await service.listTickets(ORG_ID, { page: 1, limit: 15 }, 'ClientContact', CLIENT_EMAIL);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: ACCOUNT_ID, organizationId: ORG_ID }),
        }),
      );
    });
  });

  describe('createComment', () => {
    it('should save a comment and reopen ticket if client replies to resolved ticket', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({ ...mockTicket, status: 'RESOLVED' });
      mockPrisma.ticketComment.create.mockResolvedValue({ id: 'comment-1' });

      await service.createComment(TICKET_ID, { comment: 'Need more clarification.' }, ORG_ID, ACTOR_ID, 'ClientContact', CLIENT_EMAIL);

      expect(mockPrisma.ticketComment.create).toHaveBeenCalled();
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TICKET_ID },
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        }),
      );
    });
  });

  describe('deleteTicket', () => {
    it('should throw ForbiddenException if ClientContact attempts to delete a ticket', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.contact.findFirst.mockResolvedValue({ accountId: ACCOUNT_ID });

      await expect(
        service.deleteTicket(TICKET_ID, ORG_ID, ACTOR_ID, 'ClientContact', CLIENT_EMAIL),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
