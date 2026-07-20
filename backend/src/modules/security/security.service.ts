import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class SecurityService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Chronological Audit Log Queries ────────────────────────────────────────

  async getAuditLogs(
    orgId: string,
    params: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      resourceName?: string;
      search?: string;
    },
  ) {
    // Validate pagination parameters
    const page = Math.max(Number(params.page || 1), 1);
    const limit = Math.min(Math.max(Number(params.limit || 20), 1), 100); // Cap at 100
    const skip = (page - 1) * limit;

    // Build WHERE clause with mandatory organization filter
    const where: any = { organizationId: orgId };

    // Optional filters
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.action) {
      where.action = { contains: params.action, mode: 'insensitive' };
    }
    if (params.resourceName) {
      where.resourceName = { contains: params.resourceName, mode: 'insensitive' };
    }
    if (params.search) {
      where.OR = [
        { ipAddress: { contains: params.search, mode: 'insensitive' } },
        { action: { contains: params.search, mode: 'insensitive' } },
        { resourceName: { contains: params.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: params.search, mode: 'insensitive' } },
              { firstName: { contains: params.search, mode: 'insensitive' } },
              { lastName: { contains: params.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Execute query
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
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
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Active User Sessions Management ────────────────────────────────────────

  async getSessions(orgId: string) {
    // Validate organization ID
    if (!orgId || typeof orgId !== 'string') {
      throw new BadRequestException('Invalid organization ID');
    }

    return this.prisma.userSession.findMany({
      where: {
        user: {
          userOrganizations: {
            some: {
              organizationId: orgId,
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
    });
  }

  async revokeSession(orgId: string, sessionId: string, actorId: string) {
    // Validate inputs
    if (!orgId || typeof orgId !== 'string') {
      throw new BadRequestException('Invalid organization ID');
    }
    if (!sessionId || typeof sessionId !== 'string') {
      throw new BadRequestException('Invalid session ID');
    }
    if (!actorId || typeof actorId !== 'string') {
      throw new BadRequestException('Invalid actor ID');
    }

    // Find session with organization authorization check
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        user: {
          userOrganizations: {
            some: {
              organizationId: orgId,
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`User Session with ID ${sessionId} not found`);
    }

    // Update session to revoked
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    // Write audit log noting administrative revocation of user credentials family
    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorId,
        action: 'session.administrative_revocation',
        resourceName: 'session',
        resourceId: sessionId,
        payloadBefore: {
          sessionId,
          targetUserId: session.userId,
          isRevoked: session.isRevoked,
        },
        payloadAfter: {
          sessionId,
          targetUserId: session.userId,
          isRevoked: true,
        },
      },
    });

    return { success: true };
  }
}