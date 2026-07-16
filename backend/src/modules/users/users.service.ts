import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import * as bcrypt from 'bcrypt';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  timezone: string;
  createdAt: Date;
  role: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface PaginatedUsers {
  data: UserListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all users belonging to an organization with pagination and filtering.
   */
  async listUsers(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    roleName?: string,
  ): Promise<PaginatedUsers> {
    const skip = (page - 1) * limit;

    // Build the full nested where using Prisma types
    const where: Prisma.UserOrganizationWhereInput = {
      organizationId,
      deletedAt: null,
      ...(roleName ? { role: { name: roleName } } : {}),
      user: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    };

    const [userOrgs, total] = await Promise.all([
      this.prisma.userOrganization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          role: true,
        },
      }),
      this.prisma.userOrganization.count({ where }),
    ]);

    const data: UserListItem[] = userOrgs.map((uo) => ({
      id: uo.user.id,
      email: uo.user.email,
      firstName: uo.user.firstName,
      lastName: uo.user.lastName,
      phone: uo.user.phone,
      status: uo.user.status,
      timezone: uo.user.timezone,
      createdAt: uo.user.createdAt,
      role: {
        id: uo.role.id,
        name: uo.role.name,
        description: uo.role.description,
      },
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single user's profile within an organization context.
   */
  async getUser(
    userId: string,
    organizationId: string,
    requesterId: string,
    requesterHasIamRead: boolean,
  ): Promise<UserListItem> {
    // Users can view their own profile; others need iam:read
    if (userId !== requesterId && !requesterHasIamRead) {
      throw new ForbiddenException('Insufficient permissions to view this user profile');
    }

    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId, organizationId, deletedAt: null },
      include: {
        user: true,
        role: true,
      },
    });

    if (!userOrg) {
      throw new NotFoundException('User not found in this organization');
    }

    return {
      id: userOrg.user.id,
      email: userOrg.user.email,
      firstName: userOrg.user.firstName,
      lastName: userOrg.user.lastName,
      phone: userOrg.user.phone,
      status: userOrg.user.status,
      timezone: userOrg.user.timezone,
      createdAt: userOrg.user.createdAt,
      role: {
        id: userOrg.role.id,
        name: userOrg.role.name,
        description: userOrg.role.description,
      },
    };
  }

  /**
   * Create a new user and associate them to the organization with a role.
   * If the user already exists globally, associate without duplicating.
   */
  async createUser(
    dto: CreateUserDto,
    organizationId: string,
    actorId: string,
    actorIp?: string,
  ) {
    // Find the role record
    const role = await this.prisma.role.findUnique({
      where: { name: dto.roleName },
    });
    if (!role) {
      throw new BadRequestException(`Role "${dto.roleName}" does not exist`);
    }

    // Check if user already exists globally
    let user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (user) {
      // User exists — check if already in this organization
      const existingLink = await this.prisma.userOrganization.findFirst({
        where: { userId: user.id, organizationId, deletedAt: null },
      });
      if (existingLink) {
        throw new BadRequestException(
          'This user is already a member of the organization',
        );
      }

      // Associate existing user to the organization with the chosen role
      await this.prisma.userOrganization.create({
        data: { userId: user.id, organizationId, roleId: role.id },
      });

      await this.writeAuditLog(actorId, organizationId, 'user.assign', 'user', user.id, actorIp, null, { roleName: dto.roleName });
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(dto.password, 12);
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          passwordHash,
          status: dto.status ?? 'active',
        },
      });

      await this.prisma.userOrganization.create({
        data: { userId: user.id, organizationId, roleId: role.id },
      });

      await this.writeAuditLog(actorId, organizationId, 'user.create', 'user', user.id, actorIp, null, { email: dto.email, roleName: dto.roleName });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
    };
  }

  /**
   * Update user profile fields within org context.
   * Suspending a user immediately revokes all their active sessions.
   */
  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    organizationId: string,
    requesterId: string,
    requesterHasIamWrite: boolean,
    actorIp?: string,
  ) {
    // Only iam:write holders can edit others; users can edit themselves (limited fields)
    if (userId !== requesterId && !requesterHasIamWrite) {
      throw new ForbiddenException('Insufficient permissions to update this user');
    }

    // Non-admin users cannot change status
    if (dto.status && userId === requesterId && !requesterHasIamWrite) {
      throw new ForbiddenException('You cannot change your own account status');
    }

    // Verify the user exists in the organization
    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId, organizationId, deletedAt: null },
      include: { user: true },
    });
    if (!userOrg) {
      throw new NotFoundException('User not found in this organization');
    }

    const before = {
      firstName: userOrg.user.firstName,
      lastName: userOrg.user.lastName,
      phone: userOrg.user.phone,
      status: userOrg.user.status,
    };

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    // Revoke all sessions if user is being suspended
    if (dto.status === 'suspended') {
      await this.prisma.userSession.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    await this.writeAuditLog(requesterId, organizationId, 'user.update', 'user', userId, actorIp, before, dto);

    return updatedUser;
  }

  /**
   * Update the role of a user within the organization.
   */
  async updateUserRole(
    userId: string,
    dto: UpdateUserRoleDto,
    organizationId: string,
    actorId: string,
    actorIp?: string,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { name: dto.roleName },
    });
    if (!role) {
      throw new BadRequestException(`Role "${dto.roleName}" does not exist`);
    }

    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId, organizationId, deletedAt: null },
      include: { role: true },
    });
    if (!userOrg) {
      throw new NotFoundException('User not found in this organization');
    }

    const beforeRole = userOrg.role.name;

    await this.prisma.userOrganization.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { roleId: role.id },
    });

    await this.writeAuditLog(actorId, organizationId, 'user.role_change', 'user', userId, actorIp, { role: beforeRole }, { role: dto.roleName });

    return { success: true, message: 'User role updated successfully' };
  }

  /**
   * Remove a user's membership from the organization (soft delete of the link).
   */
  async removeUser(
    userId: string,
    organizationId: string,
    actorId: string,
    actorIp?: string,
  ) {
    if (userId === actorId) {
      throw new BadRequestException('You cannot remove yourself from the organization');
    }

    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId, organizationId, deletedAt: null },
    });
    if (!userOrg) {
      throw new NotFoundException('User not found in this organization');
    }

    // Soft-delete the org membership
    await this.prisma.userOrganization.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { deletedAt: new Date() },
    });

    // Revoke all sessions
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    await this.writeAuditLog(actorId, organizationId, 'user.remove', 'user', userId, actorIp, null, null);

    return { success: true, message: 'User membership removed from organization' };
  }

  /**
   * Helper to write audit log entries
   */
  private async writeAuditLog(
    actorId: string,
    organizationId: string,
    action: string,
    resourceName: string,
    resourceId: string,
    ipAddress?: string,
    before?: unknown,
    after?: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        organizationId,
        action,
        resourceName,
        resourceId,
        ipAddress,
        payloadBefore: before ? (before as object) : undefined,
        payloadAfter: after ? (after as object) : undefined,
      },
    });
  }
}
