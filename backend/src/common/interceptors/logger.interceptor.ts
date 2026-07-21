import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RequestContextService } from '../context/request-context.service';

/**
 * LoggingInterceptor: Logs incoming requests and outgoing responses with
 * request IDs for traceability and correlation with audit logs.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly requestContextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url } = request;
    const startTime = Date.now();

    // Get request ID from context
    const requestId = this.requestContextService.getRequestId() || 'UNKNOWN';

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const duration = Date.now() - startTime;
        this.logger.log(
          `[${method}] ${url} - Status: ${statusCode} - Latency: ${duration}ms - Request ID: ${requestId}`,
        );
      }),
    );
  }
}