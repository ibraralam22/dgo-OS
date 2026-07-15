import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { RequestContextModule } from './common/context/request-context.module';
import { TenantMiddleware } from './common/context/tenant.middleware';

@Module({
  imports: [SharedModule, RequestContextModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*'); // Apply tenant-scoping middleware globally to all endpoints
  }
}
