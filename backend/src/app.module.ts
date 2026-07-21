import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } = require('./app.service');
import { SharedModule } = require('./shared/shared.module');
import { RequestContextModule } = require('./common/context/request-context.module');
import { TenantMiddleware } = require('./common/context/tenant.middleware');
import { RequestIdMiddleware } = require('./common/middleware/request-id.middleware');
import { AuthModule } = require('./modules/auth/auth.module');
import { UsersModule } = require('./modules/users/users.module');
import { RolesModule } = require('./modules/roles/roles.module');
import { DashboardModule } = require('./modules/dashboard/dashboard.module');
import { LeadsModule } = require('./modules/leads/leads.module');
import { ClientsModule } = require('./modules/clients/clients.module');
import { OpportunitiesModule } = require('./modules/opportunities/opportunities.module');
import { QuotationsModule } = require('./modules/quotations/quotations.module');
import { ProjectsModule } = require('./modules/projects/projects.module');
import { TasksModule } = require('./modules/tasks/tasks.module');
import { CalendarModule } = require('./modules/calendar/calendar.module');
import { InvoicesModule } = require('./modules/invoices/invoices.module');
import { PaymentsModule } = require('./modules/payments/payments.module');
import { TicketsModule } = require('./modules/tickets/tickets.module');
import { ReportsModule } = require('./modules/reports/reports.module');
import { SecurityModule } = require('./modules/security/security.module');
import { ConfigModule } = require('@nestjs/config');
import { ConfigService } = require('@nestjs/config');

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') || 60_000,
          limit: config.get<number>('THROTTLE_LIMIT') || 100,
        },
      ],
    }),
    SharedModule,
    RequestContextModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DashboardModule,
    ClientsModule,
    OpportunitiesModule,
    QuotationsModule,
    ProjectsModule,
    TasksModule,
    CalendarModule,
    InvoicesModule,
    PaymentsModule,
    TicketsModule,
    ReportsModule,
    SettingsModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware, RequestIdMiddleware)
      .forRoutes('*'); // Apply tenant-scoping and request ID middleware globally to all endpoints
  }
}