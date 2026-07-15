import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestContextService } from '../../common/context/request-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // We expose a public "client" property containing the extended Prisma client that applies RLS
  public readonly client: any;

  constructor(private readonly requestContextService: RequestContextService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    // Create the extended client mapping automatic tenant context queries
    this.client = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, args, query }) {
            const tenantId = requestContextService.getTenantId();

            // Set of models that enforce row-level organization filters
            const tenantBoundModels = ['AuditLog', 'UserOrganization'];

            // If we have a tenant ID in context and the model is tenant-bound,
            // we inject the organizationId directly into the query filters.
            if (tenantId && tenantBoundModels.includes(model)) {
              const queryArgs = (args || {}) as {
                where?: Record<string, unknown>;
              };
              queryArgs.where = queryArgs.where || {};
              queryArgs.where.organizationId = tenantId;
              return query(queryArgs);
            }

            return query(args);
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
