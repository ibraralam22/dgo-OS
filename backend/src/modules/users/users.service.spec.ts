import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../../shared/audit/audit-log.service';
import { CacheService } from '../../shared/cache/cache.service';
import { RequestContextService } from '../../common/context/request-context.service';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrisma = {
    userOrganization: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    userSession: {
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockAuditLog = {
    createWithContext: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRequestContext = {
    getTenantId: jest.fn(),
    getUserId: jest.fn(),
    getRequestId: jest.fn(),
    getIpAddress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
        { provide: CacheService, useValue: mockCache },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  // ─── listUsers ────────────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('should return paginated user list', async () => {
      const mockUserOrgs = [
        {
          user: {
            id: 'u1',
            email: 'a@dgo.com',
            firstName: 'Alice',
            lastName: 'Smith',
            phone: null,
            status: 'active',
            timezone: 'UTC',
            createdAt: new Date(),
          },
          role: { id: 'r1', name: 'TenantAdmin', description: null },
        },
      ];
      (prisma.userOrganization.findMany as jest.Mock).mockResolvedValue(mockUserOrgs);
      (prisma.userOrganization.count as jest.Mock).mockResolvedValue(1);

      const result = await service.listUsers('org-1', 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  // ─── getUser ──────────────────────────────────────────────────────────────────

  describe('getUser', () => {
    it('should return user profile for iam:read holder', async () => {
      const mockUserOrg = {
        user: { id: 'u1', email: 'a@dgo.com', firstName: 'Alice', lastName: 'Smith', phone: null, status: 'active', timezone: 'UTC', createdAt: new Date() },
        role: { id: 'r1', name: 'SalesRepresentative', description: null },
      };
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue(mockUserOrg);

      const result = await service.getUser('u1', 'org-1', 'admin-1', true);
      expect(result.id).toBe('u1');
      expect(result.role.name).toBe('SalesRepresentative');
    });

    it('should allow a user to view their own profile without iam:read', async () => {
      const mockUserOrg = {
        user: { id: 'u1', email: 'a@dgo.com', firstName: 'Alice', lastName: 'Smith', phone: null, status: 'active', timezone: 'UTC', createdAt: new Date() },
        role: { id: 'r1', name: 'ClientContact', description: null },
      };
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue(mockUserOrg);

      const result = await service.getUser('u1', 'org-1', 'u1', false);
      expect(result.id).toBe('u1');
    });

    it('should throw ForbiddenException when accessing another user without iam:read', async () => {
      await expect(service.getUser('u2', 'org-1', 'u1', false)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not in org', async () => {
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getUser('u99', 'org-1', 'admin-1', true)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createUser ───────────────────────────────────────────────────────────────

  describe('createUser', () => {
    const dto = {
      email: 'new@dgo.com',
      firstName: 'New',
      lastName: 'Hire',
      roleName: 'SalesRepresentative',
      password: 'Secure@Password2026!',
      status: 'active',
    };

    it('should create new user and assign to org', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue({ id: 'r1', name: 'SalesRepresentative' });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'u-new', email: 'new@dgo.com', firstName: 'New', lastName: 'Hire', status: 'active' });
      (prisma.userOrganization.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.createUser(dto, 'org-1', 'admin-1', '127.0.0.1');
      expect(result.email).toBe('new@dgo.com');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should assign existing user to org if not already a member', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue({ id: 'r1', name: 'SalesRepresentative' });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'u-existing', email: 'new@dgo.com', firstName: 'New', lastName: 'Hire', status: 'active' });
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.userOrganization.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.createUser(dto, 'org-1', 'admin-1');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.userOrganization.create).toHaveBeenCalled();
      expect(result.email).toBe('new@dgo.com');
    });

    it('should throw BadRequestException if user already in org', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue({ id: 'r1', name: 'SalesRepresentative' });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'u-existing' });
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue({ userId: 'u-existing', organizationId: 'org-1' });

      await expect(service.createUser(dto, 'org-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if role is invalid', async () => {
      (prisma.role.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.createUser({ ...dto, roleName: 'FakeRole' }, 'org-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateUser ───────────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('should update user fields and write audit log', async () => {
      const mockUserOrg = {
        user: { id: 'u1', firstName: 'Old', lastName: 'Name', phone: null, status: 'active' },
      };
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue(mockUserOrg);
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'u1', firstName: 'New', lastName: 'Name', phone: null, status: 'active' });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.updateUser('u1', { firstName: 'New' }, 'org-1', 'admin-1', true);
      expect(result.firstName).toBe('New');
    });

    it('should revoke sessions when suspending a user', async () => {
      const mockUserOrg = { user: { id: 'u1', firstName: 'A', lastName: 'B', phone: null, status: 'active' } };
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue(mockUserOrg);
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'u1', status: 'suspended' });
      (prisma.userSession.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await service.updateUser('u1', { status: 'suspended' }, 'org-1', 'admin-1', true);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { isRevoked: true } }));
    });

    it('should throw ForbiddenException when non-admin tries to update another user', async () => {
      await expect(
        service.updateUser('u2', { firstName: 'X' }, 'org-1', 'u1', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── removeUser ───────────────────────────────────────────────────────────────

  describe('removeUser', () => {
    it('should soft-delete user org membership and revoke sessions', async () => {
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue({ userId: 'u2', organizationId: 'org-1' });
      (prisma.userOrganization.update as jest.Mock).mockResolvedValue({});
      (prisma.userSession.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const result = await service.removeUser('u2', 'org-1', 'admin-1');
      expect(result.success).toBe(true);
      expect(prisma.userOrganization.update).toHaveBeenCalled();
      expect(prisma.userSession.updateMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException when removing self', async () => {
      await expect(service.removeUser('admin-1', 'org-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user is not in org', async () => {
      (prisma.userOrganization.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.removeUser('u99', 'org-1', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});
