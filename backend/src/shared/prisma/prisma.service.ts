import { Injectable, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from '../../common/context/request-context.service';

/**
 * PrismaService: Handles database pooling and query lifecycle extensions.
 * 
 * SECURITY WARNING ON RLS LIMITATIONS:
 * - Row-Level Security (RLS) organization filters are automatically enforced on standard 
 *   Prisma Client model methods (e.g. findFirst, findMany, create, update, delete, etc.).
 * - CRITICAL: Prisma query extensions do NOT intercept raw DB commands ($queryRaw, $executeRaw, etc.).
 *   Any custom raw SQL operations MUST manually bind and sanitize `organizationId` parameters
 *   to prevent cross-tenant database leakage!
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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
    const extendedClient = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = requestContextService.getTenantId();

            // Set of models that enforce row-level organization filters
            const tenantBoundModels = [
              'AuditLog',
              'UserOrganization',
              'Role',
              'Lead',
              'Account',
              'Contact',
              'Opportunity',
              'ProjectOnboarding',
              'OnboardingMilestone',
              'Quotation',
              'Task',
              'CalendarEvent',
              'EventAttendee',
              'Invoice',
              'InvoiceLineItem',
              'Payment',
              'Ticket',
              'TicketComment',
            ];

            if (tenantId && tenantBoundModels.includes(model)) {
              const queryArgs = (args || {}) as any;

              // Special multi-tenant read filter for Role: allow tenant role OR global system role (null organizationId)
              const isReadOp = [
                'findFirst',
                'findMany',
                'count',
                'aggregate',
                'groupBy',
              ].includes(operation);

              if (model === 'Role' && isReadOp) {
                const existingWhere = queryArgs.where || {};
                queryArgs.where = {
                  AND: [
                    existingWhere,
                    {
                      OR: [
                        { organizationId: tenantId },
                        { organizationId: null },
                      ],
                    },
                  ],
                };
                return query(queryArgs);
              }

              // Strict RLS for all other operations and models
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
                const modelDelegate = typeof (ctx as any).findFirst === 'function'
                  ? ctx
                  : (ctx as any)[model.charAt(0).toLowerCase() + model.slice(1)];
                return modelDelegate.findFirst(queryArgs);
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

              // update, delete: verify tenant ownership using findFirst before mutating via unique key
              if (operation === 'update' || operation === 'delete') {
                const queryArgs = (args || {}) as any;
                const existingWhere = queryArgs.where || {};
                const ctx = Prisma.getExtensionContext(this);
                const modelDelegate = typeof (ctx as any).findFirst === 'function'
                  ? ctx
                  : (ctx as any)[model.charAt(0).toLowerCase() + model.slice(1)];
                const checkArgs = {
                  where: {
                    ...existingWhere,
                    organizationId: tenantId,
                  },
                };
                const record = await modelDelegate.findFirst(checkArgs);
                if (!record) {
                  throw new NotFoundException(`Record not found or access denied`);
                }
                return query(args);
              }

              // updateMany, deleteMany: filter mutation targets directly
              if (
                [
                  'updateMany',
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

    this.client = extendedClient;

    // NestJS lifecycle context hooks setup
    const onModuleInit = this.onModuleInit.bind(this);
    const onModuleDestroy = this.onModuleDestroy.bind(this);

    // Return the proxy client wrapping the extended instance. This routes standard calls
    // (e.g. this.prisma.user.findMany) directly through the tenant-scoping extension layer!
    return new Proxy(extendedClient, {
      get(target, prop, receiver) {
        if (prop === 'onModuleInit') return onModuleInit;
        if (prop === 'onModuleDestroy') return onModuleDestroy;
        return Reflect.get(target, prop, receiver);
      },
    }) as any;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
