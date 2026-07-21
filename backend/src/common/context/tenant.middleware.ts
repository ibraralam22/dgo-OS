import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';

/**
 * TenantMiddleware: Extracts and validates tenant ID from request headers
 * and sets up request context with tenant ID, user ID (from JWT), and request ID
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger('TenantMiddleware');

  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extract and validate tenant ID from headers
    const rawTenantId = req.headers['x-tenant-id'];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    let tenantId: string | undefined;
    if (typeof rawTenantId === 'string' && uuidRegex.test(rawTenantId)) {
      tenantId = rawTenantId;
    }

    // Generate a unique request ID for tracing
    const randomString = Math.random().toString(36).substring(2, 11);
    const requestId = `req-${Date.now()}-${randomString}`;

    // Set up request context store
    const store: any = {
      tenantId,
      userId: undefined, // Will be set by JWT auth strategy later
      requestId,
      ipAddress: req.ip
    };

    // Run request handlers nested inside the storage context
    this.requestContextService.run(store, () => {
      // Set response header for client-side tracing
      res.setHeader('X-Request-ID', requestId);
      next();
    });
  }
}