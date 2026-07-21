import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContextService } from '../../context/request-context.service';

/**
 * AuditLogService: Centralized service for creating audit log entries
 * Reduces boilerplate code and ensures consistent audit logging format
 */
@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
  ) {}

  /**
   * Create an audit log entry
   * @param organizationId - Organization ID
   * @param userId - User ID performing the action
   * @param action - Action being performed (use AuditLogAction constants)
   * @param resourceName - Name of the resource being affected
   * @param resourceId - ID of the resource being affected
   * @param ipAddress - Optional IP address
   * @param payloadBefore - Optional state before the change
   * @param payloadAfter - Optional state after the change
   */
  async create(
    organizationId: string,
    userId: string,
    action: string,
    resourceName: string,
    resourceId: string,
    ipAddress?: string,
    payloadBefore?: any,
    payloadAfter?: any,
  ) {
    // Validate organizationId and userId
    if (!organizationId || typeof organizationId !== 'string') {
      throw new Error('Invalid organization ID');
    }

    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Get request ID from context for traceability
    const requestId = this.requestContextService.getRequestId();

    return this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        resourceName,
        resourceId,
        ipAddress: ipAddress ?? null,
        payloadBefore: payloadBefore ?? null,
        payloadAfter: payloadAfter ?? null,
        requestId: requestId || undefined,
      },
    });
  }

  /**
   * Create an audit log entry with automatic request ID capture
   * Overloaded version that gets request ID from context
   */
  async createWithContext(
    organizationId: string,
    userId: string,
    action: string,
    resourceName: string,
    resourceId: string,
    payloadBefore?: any,
    payloadAfter?: any,
  ) {
    const requestId = this.requestContextService.getRequestId();
    const ipAddress = this.requestContextService.getIpAddress();

    return this.create(
      organizationId,
      userId,
      action,
      resourceName,
      resourceId,
      ipAddress,
      payloadBefore,
      payloadAfter,
    );
  }
}