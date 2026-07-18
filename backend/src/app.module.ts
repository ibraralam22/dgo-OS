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

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute
        limit: 100,  // 100 requests per IP per minute
      },
    ]),
    SharedModule,
    RequestContextModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DashboardModule,
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
