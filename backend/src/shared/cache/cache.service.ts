import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private defaultTTL = 300; // 5 minutes default TTL

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get a value from cache by key
   * @param key Cache key
   * @returns Parsed value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisService.client.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache (will be JSON.stringified)
   * @param ttlSeconds Time to live in seconds (optional, uses default if not provided)
   * @returns True if successful
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds ?? this.defaultTTL;
      await this.redisService.client.set(key, serialized, 'EX', ttl);
      return true;
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a value from cache by key
   * @param key Cache key
   * @returns Number of keys deleted
   */
  async del(key: string): Promise<number> {
    try {
      return await this.redisService.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns True if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisService.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment a numeric value in cache
   * @param key Cache key
   * @param amount Amount to increment by (default: 1)
   * @returns New value after increment
   */
  async incr(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redisService.client.incrby(key, amount);
    } catch (error) {
      this.logger.error(`Error incrementing cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set a hash field in cache
   * @param key Cache key
   * @param field Hash field
   * @param value Value to set (will be JSON.stringified)
   * @returns True if successful
   */
  async hSet<T>(
    key: string,
    field: string,
    value: T,
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await this.redisService.client.hset(key, field, serialized);
      return true;
    } catch (error) {
      this.logger.error(`Error setting hash field ${key}.${field}:`, error);
      return false;
    }
  }

  /**
   * Get a hash field from cache
   * @param key Cache key
   * @param field Hash field
   * @returns Parsed value or null if not found
   */
  async hGet<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.redisService.client.hget(key, field);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting hash field ${key}.${field}:`, error);
      return null;
    }
  }

  /**
   * Get all fields and values from a hash
   * @param key Cache key
   * @returns Object with all fields and parsed values
   */
  async hGetAll<T>(key: string): Promise<Record<string, T>> {
    try {
      const hash = await this.redisService.client.hgetall(key);
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value) as T;
        } catch (parseError) {
          this.logger.warn(
            `Failed to parse hash field ${key}.${field}: ${value}`,
          );
          // Store as string if parsing fails
          result[field] = value as unknown as T;
        }
      }
      return result;
    } catch (error) {
      this.logger.error(`Error getting hash ${key}:`, error);
      return {};
    }
  }

  /**
   * Delete a hash field
   * @param key Cache key
   * @param field Hash field
   * @returns Number of fields deleted
   */
  async hDel(key: string, field: string): Promise<number> {
    try {
      return await this.redisService.client.hdel(key, field);
    } catch (error) {
      this.logger.error(`Error deleting hash field ${key}.${field}:`, error);
      return 0;
    }
  }

  /**
   * Add a value to a set
   * @param key Cache key
   * @param value Value to add (will be JSON.stringified)
   * @returns Number of elements added to the set
   */
  async sAdd<T>(key: string, value: T): Promise<number> {
    try {
      const serialized = JSON.stringify(value);
      return await this.redisService.client.sadd(key, serialized);
    } catch (error) {
      this.logger.error(`Error adding to set ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get all members of a set
   * @param key Cache key
   * @returns Array of parsed values
   */
  async sMembers<T>(key: string): Promise<T[]> {
    try {
      const members = await this.redisService.client.smembers(key);
      return members.map((member) => {
        try {
          return JSON.parse(member) as T;
        } catch (parseError) {
          this.logger.warn(
            `Failed to parse set member: ${member}`,
          );
          return member as unknown as T;
        }
      });
    } catch (error) {
      this.logger.error(`Error getting set members ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove a value from a set
   * @param key Cache key
   * @param value Value to remove (will be JSON.stringified)
   * @returns Number of elements removed from the set
   */
  async sRem<T>(key: string, value: T): Promise<number> {
    try {
      const serialized = JSON.stringify(value);
      return await this.redisService.client.srem(key, serialized);
    } catch (error) {
      this.logger.error(`Error removing from set ${key}:`, error);
      return 0;
    }
  }

  /**
   * Flush all keys in the current database (use with caution)
   * @returns True if successful
   */
  async flushdb(): Promise<boolean> {
    try {
      await this.redisService.client.flushdb();
      return true;
    } catch (error) {
      this.logger.error('Error flushing database:', error);
      return false;
    }
  }
}