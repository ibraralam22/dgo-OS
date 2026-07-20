import { Test, TestingModule } from '@nestjs/testing';
import { SecurityService } from './security.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  userSession: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((callbackOrArray) => {
    if (typeof callbackOrArray === 'function') {
      return callbackOrArray(mockPrisma);
    }
    return Promise.all(callbackOrArray);
  }),
};

const ORG_ID = 'org-uuid';
const ACTOR_ID = 'user-uuid';
const SESSION_ID = 'session-uuid';

describe('SecurityService', () => {
  let service: SecurityService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getAuditLogs', () => {
    it('should query tenant audit logs with search parameters and return page metrics', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'auth.login', resourceName: 'auth' },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs(ORG_ID, {
        page: 1,
        limit: 10,
        search: 'login',
      });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_ID,
          }),
        }),
      );
    });

    it('should apply default pagination when not provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs(ORG_ID, {});

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20, // default limit
        }),
      );
    });

    it('should limit max page size to 100', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs(ORG_ID, { limit: 200 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // capped at max
        }),
      );
    });

    it('should handle invalid page numbers gracefully', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs(ORG_ID, { page: -5 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // page corrected to 1
        }),
      );
    });

    it('should filter by userId when provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs(ORG_ID, { userId: 'user-123' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            organizationId: ORG_ID,
          }),
        }),
      );
    });

    it('should case-insensitively filter by action when provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs(ORG_ID, { action: 'LOGIN' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: 'LOGIN', mode: 'insensitive' },
            organizationId: ORG_ID,
          }),
        }),
      );
    });

    it('should handle search across multiple fields', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs(ORG_ID, { search: 'test' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                ipAddress: { contains: 'test', mode: 'insensitive' },
              }),
              expect.objectContaining({
                action: { contains: 'test', mode: 'insensitive' },
              }),
              expect.objectContaining({
                resourceName: { contains: 'test', mode: 'insensitive' },
              }),
              expect.objectContaining({
                user: {
                  OR: expect.arrayContaining([
                    expect.objectContaining({
                      email: { contains: 'test', mode: 'insensitive' },
                    }),
                    expect.objectContaining({
                      firstName: { contains: 'test', mode: 'insensitive' },
                    }),
                    expect.objectContaining({
                      lastName: { contains: 'test', mode: 'insensitive' },
                    }),
                  ]),
                },
              }),
            ]),
            organizationId: ORG_ID,
          }),
        }),
      );
    });
  });

  describe('getSessions', () => {
    it('should query active user sessions inside the tenant organization scope', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([
        { id: SESSION_ID, userId: ACTOR_ID, isRevoked: false },
      ]);

      const result = await service.getSessions(ORG_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(SESSION_ID);
      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              userOrganizations: {
                some: {
                  organizationId: ORG_ID,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      );
    });

    it('should return empty array when no sessions found', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([]);

      const result = await service.getSessions(ORG_ID);

      expect(result).toEqual([]);
      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              userOrganizations: {
                some: {
                  organizationId: ORG_ID,
                },
              },
            },
          },
        }),
      );
    });

    it('should throw BadRequestException for invalid organization ID', async () => {
      await expect(service.getSessions('')).rejects.toThrow(BadRequestException);
      await expect(service.getSessions(null as any)).rejects.toThrow(BadRequestException);
      await expect(service.getSessions(undefined as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeSession', () => {
    it('should set isRevoked true and write administrative audit logs within a transaction', async () => {
      mockPrisma.userSession.findFirst.mockResolvedValue({
        id: SESSION_ID,
        userId: ACTOR_ID,
        isRevoked: false,
      });
      mockPrisma.userSession.update.mockResolvedValue({
        id: SESSION_ID,
        isRevoked: true,
      });

      const result = await service.revokeSession(ORG_ID, SESSION_ID, ACTOR_ID);

      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify the transaction callback was called with operations
      const transactionCallback = mockPrisma.$transaction.mock.calls[0][0];
      expect(typeof transactionCallback).toBe('function');

      // Verify findFirst was called within transaction
      expect(transactionCallback.userSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: SESSION_ID,
            user: {
              userOrganizations: {
                some: {
                  organizationId: ORG_ID,
                },
              },
            },
          }),
        }),
      );

      // Verify update was called within transaction
      expect(transactionCallback.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SESSION_ID },
          data: { isRevoked: true },
        }),
      );

      // Verify audit log creation was called within transaction
      expect(transactionCallback.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG_ID,
            userId: ACTOR_ID,
            action: 'session.administrative_revocation',
            resourceName: 'session',
            resourceId: SESSION_ID,
          }),
        }),
      );
    });

    it('should throw NotFoundException if session is not found under tenant organization scope', async () => {
      mockPrisma.userSession.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeSession(ORG_ID, 'non-existent', ACTOR_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid inputs', async () => {
      // Test invalid orgId
      await expect(
        service.revokeSession('', SESSION_ID, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.revokeSession(null as any, SESSION_ID, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);

      // Test invalid sessionId
      await expect(
        service.revokeSession(ORG_ID, '', ACTOR_ID),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.revokeSession(ORG_ID, null as any, ACTOR_ID),
      ).rejects.toThrow(BadRequestException);

      // Test invalid actorId
      await expect(
        service.revokeSession(ORG_ID, SESSION_ID, ''),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.revokeSession(ORG_ID, SESSION_ID, null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle transaction rollback on error', async () => {
      mockPrisma.userSession.findFirst.mockResolvedValue({
        id: SESSION_ID,
        userId: ACTOR_ID,
        isRevoked: false,
      });

      // Make update throw an error to simulate failure
      mockPrisma.userSession.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.revokeSession(ORG_ID, SESSION_ID, ACTOR_ID),
      ).rejects.toThrow(Error);

      // Verify that audit log was NOT created due to transaction rollback
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });
});