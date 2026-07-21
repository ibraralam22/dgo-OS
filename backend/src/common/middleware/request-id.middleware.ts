import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../context/request-context.service';

/**
 * RequestIdMiddleware: Generates and attaches unique request IDs to each incoming request
 * for traceability across logs, headers, and audit trails.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestId');

  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Generate a unique request ID (using timestamp + random for uniqueness)
    const randomString = Math.random().toString(36).substring(2, 11);
    const requestId = `req-${Date.now()}-${randomString}`;

    // Store in request context for access throughout the request lifecycle
    this.requestContextService.setRequestId(requestId);

    // Also set as response header for client-side tracing
    res.setHeader('X-Request-ID', requestId);

    // Log the incoming request with ID
    this.logger.log(`Incoming request: ${req.method} ${req.path} [ID: ${requestId}]`);

    next();
  }
}