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
  private redisClient?: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeClient();
  }

  private initializeClient(): void {
    if (this.redisClient) {
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL configuration is missing!');
    }

    this.logger.log(`Connecting to Redis instance at: ${redisUrl}`);

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    });

    client.on('connect', () => {
      this.logger.log('Successfully connected to Redis database.');
    });

    client.on('error', (err) => {
      this.logger.error('Redis database connection error:', err);
    });

    this.redisClient = client;
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
    this.logger.log('Disconnected from Redis database.');
  }

  get client(): Redis {
    return this.getClient();
  }

  private getClient(): Redis {
    if (!this.redisClient) {
      this.initializeClient();
    }

    if (!this.redisClient) {
      throw new Error('Redis client is not initialized');
    }

    return this.redisClient;
  }

  // Common Key-Value Helpers
  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    const client = this.getClient();
    if (ttlSeconds) {
      return client.set(key, value, 'EX', ttlSeconds);
    }
    return client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.getClient().del(key);
  }

  async exists(key: string): Promise<number> {
    return this.getClient().exists(key);
  }

  /**
   * Acquires a distributed lock.
   * @param lockKey The key representing the lock
   * @param ttlSeconds Lock duration in seconds
   * @returns The unique token string if lock is successfully acquired, or null otherwise
   */
  async acquireLock(
    lockKey: string,
    ttlSeconds: number = 10,
  ): Promise<string | null> {
    const uniqueToken =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    const result = await this.getClient().set(
      lockKey,
      uniqueToken,
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK' ? uniqueToken : null;
  }

  /**
   * Releases a distributed lock safely using a Lua script to ensure
   * that a process only deletes the lock if it holds the matching token.
   * @param lockKey The key representing the lock
   * @param token The unique token returned during lock acquisition
   * @returns true if the lock was successfully released, false otherwise
   */
  async releaseLock(lockKey: string, token: string): Promise<boolean> {
    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.getClient().eval(
      releaseScript,
      1,
      lockKey,
      token,
    );
    return result === 1;
  }
}
