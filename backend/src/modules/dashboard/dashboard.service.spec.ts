import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

const mockPrisma = {
  userOrganization: {
    count: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
  },
  opportunity: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  lead: {
    count: jest.fn().mockResolvedValue(0),
  },
};

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should aggregate metrics and count active users for Admin roles', async () => {
      mockPrisma.userOrganization.count.mockResolvedValue(12);

      const res = await service.getMetrics('TenantAdmin');

      expect(res.role).toBe('TenantAdmin');
      expect(res.userCount).toBe(12);
      expect(res.leads).toBeDefined();
      expect(res.pipeline).toBeDefined();
      expect(res.billing).toBeDefined();
      expect(res.tickets).toBeDefined();
      expect(prisma.userOrganization.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should aggregate only sales metrics for SalesRepresentative role', async () => {
      const res = await service.getMetrics('SalesRepresentative');

      expect(res.role).toBe('SalesRepresentative');
      expect(res.leads).toBeDefined();
      expect(res.pipeline).toBeDefined();
      expect(res.billing).toBeUndefined();
      expect(res.tickets).toBeUndefined();
      expect(prisma.userOrganization.count).not.toHaveBeenCalled();
    });

    it('should aggregate only service desk metrics for ClientContact role', async () => {
      const res = await service.getMetrics('ClientContact');

      expect(res.role).toBe('ClientContact');
      expect(res.tickets).toBeDefined();
      expect(res.leads).toBeUndefined();
      expect(res.pipeline).toBeUndefined();
      expect(prisma.userOrganization.count).not.toHaveBeenCalled();
    });

    it('should return default fallback object for other unrecognized roles', async () => {
      const res = await service.getMetrics('GuestUser');

      expect(res.role).toBe('GuestUser');
      expect(res.leads).toBeUndefined();
      expect(res.pipeline).toBeUndefined();
      expect(res.tickets).toBeUndefined();
      expect(prisma.userOrganization.count).not.toHaveBeenCalled();
    });
  });

  describe('getActivity', () => {
    it('should query the last 5 audit logs sorted descending', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'user.create',
          createdAt: new Date(),
          user: { firstName: 'Alice', lastName: 'Smith' },
        },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const res = await service.getActivity();

      expect(res).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          resourceName: true,
          resourceId: true,
          payloadBefore: true,
          payloadAfter: true,
          ipAddress: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });
  });
});
