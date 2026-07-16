import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = (req.headers['x-tenant-id'] as string) || undefined;
    const userId = (req.headers['x-user-id'] as string) || undefined;

    // Run request handlers nested inside the storage run context
    this.requestContextService.run({ tenantId, userId }, () => {
      next();
    });
  }
}
