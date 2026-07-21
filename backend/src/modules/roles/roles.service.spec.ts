import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CacheService } from '../../shared/cache/cache.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: PrismaService;

  const mockPrisma = {
    role: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    rolePermission: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userOrganization: {
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();

    // Mock transaction behavior to simply run the callback with mocked prisma
    mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  });

  // ─── listRoles ──────────────────────────────────────────────────────────────
  describe('listRoles', () => {
    it('should return system roles and custom organization roles', async () => {
      const mockRoles = [
        {
          id: 'r-sys',
          name: 'TenantAdmin',
          description: 'Sys Admin',
          organizationId: null,
          rolePermissions: [{ permission: { code: 'leads:read' } }],
          _count: { userOrganizations: 3 },
        },
        {
          id: 'r-custom',
          name: 'Custom Marketing',
          description: 'Local Marketing',
          organizationId: 'org-123',
          rolePermissions: [{ permission: { code: 'leads:write' } }],
          _count: { userOrganizations: 1 },
        },
      ];

      mockPrisma.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.listRoles('org-123');

      expect(result).toHaveLength(2);
      expect(result[0].isSystem).toBe(true);
      expect(result[0].userCount).toBe(3);
      expect(result[1].isSystem).toBe(false);
      expect(result[1].userCount).toBe(1);
      expect(mockPrisma.role.findMany).toHaveBeenCalled();
    });
  });

  // ─── getPermissions ─────────────────────────────────────────────────────────
  describe('getPermissions', () => {
    it('should fetch list of active permissions', async () => {
      const mockPerms = [{ id: 'p1', code: 'iam:read', description: 'Read IAM' }];
      mockPrisma.permission.findMany.mockResolvedValue(mockPerms);

      const result = await service.getPermissions();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('iam:read');
    });
  });

  // ─── getRole ────────────────────────────────────────────────────────────────
  describe('getRole', () => {
    it('should return role detailed profile', async () => {
      const mockRole = {
        id: 'r-1',
        name: 'SalesRepresentative',
        description: 'Sales representative',
        organizationId: null,
        rolePermissions: [
          { permission: { code: 'leads:read' } },
          { permission: { code: 'leads:write' } },
        ],
      };
      mockPrisma.role.findFirst.mockResolvedValue(mockRole);

      const result = await service.getRole('r-1', 'org-123');

      expect(result.id).toBe('r-1');
      expect(result.permissions).toContain('leads:read');
      expect(result.permissions).toContain('leads:write');
    });

    it('should throw NotFoundException if role is missing or scopes differ', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(service.getRole('invalid-id', 'org-123')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createRole ─────────────────────────────────────────────────────────────
  describe('createRole', () => {
    const dto = {
      name: 'Custom Sales Expert',
      description: 'Advanced sales operations role',
      permissionCodes: ['leads:read', 'leads:write'],
    };

    it('should successfully create custom role and map permissions', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null); // No naming conflicts
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p-read', code: 'leads:read' },
        { id: 'p-write', code: 'leads:write' },
      ]);
      mockPrisma.role.create.mockResolvedValue({
        id: 'new-role-uuid',
        name: dto.name,
        description: dto.description,
        organizationId: 'org-123',
      });

      const result = await service.createRole(dto, 'org-123', 'actor-123', '127.0.0.1');

      expect(result.id).toBe('new-role-uuid');
      expect(mockPrisma.role.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'Custom Sales Expert', organizationId: 'org-123' }),
      }));
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if role name matches standard system roles', async () => {
      await expect(
        service.createRole({ ...dto, name: 'TenantAdmin' }, 'org-123', 'actor-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on duplicate role name in the tenant', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'conflicting-id', name: dto.name });

      await expect(service.createRole(dto, 'org-123', 'actor-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if one or more permissions are invalid codes', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'p-read', code: 'leads:read' }, // Only 1 returned, but 2 requested
      ]);

      await expect(service.createRole(dto, 'org-123', 'actor-123')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateRole ─────────────────────────────────────────────────────────────
  describe('updateRole', () => {
    const dto = {
      name: 'Super Leads Specialist',
      description: 'Handles all leads',
      permissionCodes: ['leads:read'],
    };

    it('should update role settings and recreate permission mappings', async () => {
      mockPrisma.role.findFirst
        .mockResolvedValueOnce({ id: 'role-123', name: 'Leads Specialist', organizationId: 'org-123' }) // initial check
        .mockResolvedValueOnce(null); // name conflict check

      mockPrisma.permission.findMany.mockResolvedValue([{ id: 'p-read', code: 'leads:read' }]);
      mockPrisma.role.update.mockResolvedValue({
        id: 'role-123',
        name: dto.name,
        description: dto.description,
        organizationId: 'org-123',
      });

      const result = await service.updateRole('role-123', dto, 'org-123', 'actor-123');

      expect(result.name).toBe('Super Leads Specialist');
      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role-123' } });
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when updating a default system role', async () => {
      mockPrisma.role.findFirst
        .mockResolvedValueOnce(null) // Not a tenant role
        .mockResolvedValueOnce({ id: 'sys-role', name: 'TenantAdmin', organizationId: null }); // System role check

      await expect(service.updateRole('sys-role', dto, 'org-123', 'actor-123')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── deleteRole ─────────────────────────────────────────────────────────────
  describe('deleteRole', () => {
    it('should successfully delete custom role if not assigned to any user', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-123', name: 'Custom Sales Rep', organizationId: 'org-123' });
      mockPrisma.userOrganization.count.mockResolvedValue(0); // Zero users assigned
      mockPrisma.role.delete.mockResolvedValue({ id: 'role-123', name: 'Custom Sales Rep', description: '' });

      const result = await service.deleteRole('role-123', 'org-123', 'actor-123');

      expect(result.success).toBe(true);
      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role-123' } });
      expect(mockPrisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-123' } });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if custom role is assigned to users', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-123', name: 'Custom Sales Rep', organizationId: 'org-123' });
      mockPrisma.userOrganization.count.mockResolvedValue(3); // 3 users mapped to it

      await expect(service.deleteRole('role-123', 'org-123', 'actor-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when attempting to delete system role', async () => {
      mockPrisma.role.findFirst
        .mockResolvedValueOnce(null) // Not custom role
        .mockResolvedValueOnce({ id: 'sys-role', name: 'TenantAdmin', organizationId: null }); // System role check

      await expect(service.deleteRole('sys-role', 'org-123', 'actor-123')).rejects.toThrow(ForbiddenException);
    });
  });
});
