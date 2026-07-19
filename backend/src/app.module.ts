import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { RequestContextModule } from './common/context/request-context.module';
import { TenantMiddleware } from './common/context/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ClientsModule } from './modules/clients/clients.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';

import { ConfigModule, ConfigService } from '@nestjs/config';

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
    LeadsModule,
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
    consumer.apply(TenantMiddleware).forRoutes('*'); // Apply tenant-scoping middleware globally to all endpoints
  }
}
