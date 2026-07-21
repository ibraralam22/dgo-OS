import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './cache/cache.module';
import { AuditModule } from './audit/audit.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    PrismaModule,
    RedisModule,
    CacheModule,
    AuditModule,
  ],
  exports: [ConfigModule, PrismaModule, RedisModule, CacheModule, AuditModule],
})
export class SharedModule {}
