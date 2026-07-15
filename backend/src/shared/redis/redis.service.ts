import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL configuration is missing!');
    }
    this.logger.log(`Connecting to Redis instance at: ${redisUrl}`);

    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Successfully connected to Redis database.');
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis database connection error:', err);
    });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
    this.logger.log('Disconnected from Redis database.');
  }

  get client(): Redis {
    return this.redisClient;
  }

  // Common Key-Value Helpers
  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds) {
      return this.redisClient.set(key, value, 'EX', ttlSeconds);
    }
    return this.redisClient.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.redisClient.exists(key);
  }

  // Distributed Lock Mechanism (For round-robin safety)
  async acquireLock(
    lockKey: string,
    ttlSeconds: number = 10,
  ): Promise<boolean> {
    const uniqueValue = Math.random().toString(36).substring(2);
    const result = await this.redisClient.set(
      lockKey,
      uniqueValue,
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async releaseLock(lockKey: string): Promise<boolean> {
    const result = await this.redisClient.del(lockKey);
    return result > 0;
  }
}
