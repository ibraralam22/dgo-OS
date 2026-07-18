import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const SYSTEM_ROLES = ['SuperAdmin', 'TenantAdmin', 'SalesRepresentative', 'ClientContact'];

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all roles visible to the organization (system roles + tenant custom roles).
   */
  async listRoles(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        OR: [
          { organizationId: null }, // System roles
          { organizationId },       // Tenant custom roles
        ],
        deletedAt: null,
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: {
          select: {
            userOrganizations: {
              where: {
                organizationId,
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: [
        { organizationId: 'asc' }, // System roles first
        { name: 'asc' },
      ],
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      organizationId: role.organizationId,
      isSystem: role.organizationId === null,
      permissionCount: role.rolePermissions.length,
      userCount: role._count.userOrganizations,
    }));
  }

  /**
   * Return all functional system permissions available for mapping.
   */
  async getPermissions() {
    return this.prisma.permission.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Fetch a single role details.
   */
  async getRole(roleId: string, organizationId: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { organizationId: null },
          { organizationId },
        ],
        deletedAt: null,
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found or access denied');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      organizationId: role.organizationId,
      isSystem: role.organizationId === null,
      permissions: role.rolePermissions.map((rp) => rp.permission.code),
    };
  }

  /**
   * Create a new custom role scoped to the tenant.
   */
  async createRole(
    dto: CreateRoleDto,
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const trimmedName = dto.name.trim();

    // 1. Block reserving default system role names
    if (SYSTEM_ROLES.some((sr) => sr.toLowerCase() === trimmedName.toLowerCase())) {
      throw new BadRequestException(`Role name "${trimmedName}" is reserved for system roles.`);
    }

    // 2. Ensure name uniqueness within the organization (custom roles + system roles)
    const existing = await this.prisma.role.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        OR: [
          { organizationId: null },
          { organizationId },
        ],
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(`A role named "${trimmedName}" already exists in your organization.`);
    }

    // 3. Verify permissions existence
    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: dto.permissionCodes },
        deletedAt: null,
      },
    });

    if (permissions.length !== dto.permissionCodes.length) {
      throw new BadRequestException('One or more selected permission codes are invalid.');
    }

    // 4. Create Role and RolePermissions in transaction
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: trimmedName,
          description: dto.description,
          organizationId,
        },
      });

      // Map permissions
      if (dto.permissionCodes.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
        });
      }

      // Log audit record
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'role.create',
          resourceName: 'role',
          resourceId: role.id,
          payloadAfter: {
            name: role.name,
            description: role.description,
            permissions: dto.permissionCodes,
          },
          ipAddress,
        },
      });

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        organizationId: role.organizationId,
      };
    });
  }

  /**
   * Update an existing custom role's properties and permission mappings.
   */
  async updateRole(
    roleId: string,
    dto: UpdateRoleDto,
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!role) {
      // Check if it exists as a system role to return custom error message
      const systemCheck = await this.prisma.role.findFirst({
        where: { id: roleId, organizationId: null, deletedAt: null },
      });
      if (systemCheck) {
        throw new ForbiddenException('System roles cannot be modified.');
      }
      throw new NotFoundException('Role not found');
    }

    const payloadBefore = {
      name: role.name,
      description: role.description,
    };

    let trimmedName = role.name;
    if (dto.name) {
      trimmedName = dto.name.trim();

      // Block reserving default system role names
      if (SYSTEM_ROLES.some((sr) => sr.toLowerCase() === trimmedName.toLowerCase())) {
        throw new BadRequestException(`Role name "${trimmedName}" is reserved for system roles.`);
      }

      // Ensure new name is unique
      const duplicate = await this.prisma.role.findFirst({
        where: {
          id: { not: roleId },
          name: { equals: trimmedName, mode: 'insensitive' },
          OR: [
            { organizationId: null },
            { organizationId },
          ],
          deletedAt: null,
        },
      });
      if (duplicate) {
        throw new BadRequestException(`A role named "${trimmedName}" already exists in your organization.`);
      }
    }

    // Verify permissions if supplied
    let permissions: { id: string; code: string }[] = [];
    if (dto.permissionCodes) {
      permissions = await this.prisma.permission.findMany({
        where: {
          code: { in: dto.permissionCodes },
          deletedAt: null,
        },
      });
      if (permissions.length !== dto.permissionCodes.length) {
        throw new BadRequestException('One or more selected permission codes are invalid.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id: roleId },
        data: {
          name: trimmedName,
          description: dto.description !== undefined ? dto.description : role.description,
        },
      });

      if (dto.permissionCodes) {
        // Clear existing mappings
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // Insert new mappings
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleId,
              permissionId: p.id,
            })),
          });
        }
      }

      // Log audit record
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'role.update',
          resourceName: 'role',
          resourceId: roleId,
          payloadBefore,
          payloadAfter: {
            name: updatedRole.name,
            description: updatedRole.description,
            permissions: dto.permissionCodes,
          },
          ipAddress,
        },
      });

      return {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        organizationId: updatedRole.organizationId,
      };
    });
  }

  /**
   * Remove a custom role.
   */
  async deleteRole(
    roleId: string,
    organizationId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!role) {
      // Check if it exists as a system role to return custom error message
      const systemCheck = await this.prisma.role.findFirst({
        where: { id: roleId, organizationId: null, deletedAt: null },
      });
      if (systemCheck) {
        throw new ForbiddenException('System roles cannot be deleted.');
      }
      throw new NotFoundException('Role not found');
    }

    // Check if the role is currently in use by any user in this organization
    const usageCount = await this.prisma.userOrganization.count({
      where: {
        roleId,
        organizationId,
        deletedAt: null,
      },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" because it is currently assigned to ${usageCount} active user(s).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete permission mappings (cascade is supported, but clean manually to be safe)
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Delete the role
      const deletedRole = await tx.role.delete({
        where: { id: roleId },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'role.delete',
          resourceName: 'role',
          resourceId: roleId,
          payloadBefore: {
            name: deletedRole.name,
            description: deletedRole.description,
          },
          ipAddress,
        },
      });

      return { success: true, message: 'Role deleted successfully.' };
    });
  }
}
