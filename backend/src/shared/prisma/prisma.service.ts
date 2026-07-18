import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from '../../common/context/request-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // We expose a public "client" property containing the extended Prisma client that applies RLS
  public readonly client: any;
  private readonly pool: Pool;

  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly configService: ConfigService,
  ) {
    const dbUrl = configService.get<string>('DATABASE_URL');
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is missing');
    }

    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    this.pool = pool;

    // Create the extended client mapping automatic tenant context queries
    this.client = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = requestContextService.getTenantId();

            // Set of models that enforce row-level organization filters
            const tenantBoundModels = ['AuditLog', 'UserOrganization'];

            // If we have a tenant ID in context and the model is tenant-bound,
            // we inject the organizationId directly into the query / operation payload.
            if (tenantId && tenantBoundModels.includes(model)) {
              const queryArgs = (args || {}) as any;

              // Read operations: inject filter condition
              if (
                [
                  'findFirst',
                  'findMany',
                  'count',
                  'aggregate',
                  'groupBy',
                ].includes(operation)
              ) {
                queryArgs.where = queryArgs.where || {};
                queryArgs.where.organizationId = tenantId;
                return query(queryArgs);
              }

              // findUnique: translate dynamically to findFirst to allow non-unique filters (like organizationId)
              if (operation === 'findUnique') {
                queryArgs.where = queryArgs.where || {};
                queryArgs.where.organizationId = tenantId;
                const ctx = Prisma.getExtensionContext(this);
                return (ctx as any).findFirst(queryArgs);
              }

              // create: inject organizationId directly into data payload
              if (operation === 'create') {
                queryArgs.data = queryArgs.data || {};
                queryArgs.data.organizationId = tenantId;
                return query(queryArgs);
              }

              // createMany: inject organizationId into all array records
              if (operation === 'createMany') {
                if (Array.isArray(queryArgs.data)) {
                  queryArgs.data = queryArgs.data.map((item: any) => ({
                    ...item,
                    organizationId: tenantId,
                  }));
                } else if (queryArgs.data) {
                  queryArgs.data.organizationId = tenantId;
                }
                return query(queryArgs);
              }

              // update, updateMany, delete, deleteMany: filter mutation targets
              if (
                [
                  'update',
                  'updateMany',
                  'delete',
                  'deleteMany',
                ].includes(operation)
              ) {
                queryArgs.where = queryArgs.where || {};
                queryArgs.where.organizationId = tenantId;
                return query(queryArgs);
              }

              // upsert: inject organizationId into scoping criteria, create, and update templates
              if (operation === 'upsert') {
                queryArgs.where = queryArgs.where || {};
                queryArgs.where.organizationId = tenantId;

                queryArgs.create = queryArgs.create || {};
                queryArgs.create.organizationId = tenantId;

                queryArgs.update = queryArgs.update || {};
                queryArgs.update.organizationId = tenantId;
                return query(queryArgs);
              }
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
    await this.pool.end();
  }
}
