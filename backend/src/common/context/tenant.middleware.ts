import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const rawTenantId = req.headers['x-tenant-id'];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    let tenantId: string | undefined;
    if (typeof rawTenantId === 'string' && uuidRegex.test(rawTenantId)) {
      tenantId = rawTenantId;
    }

    // Run request handlers nested inside the storage run context
    // Never trust x-user-id header; it will only be set by validated JWT token strategy
    this.requestContextService.run({ tenantId, userId: undefined }, () => {
      next();
    });
  }
}
