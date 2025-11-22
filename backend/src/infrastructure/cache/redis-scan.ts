import type { RedisClientType } from 'redis';
import type Redis from 'ioredis';

/**
 * Utility functions for Redis SCAN operations
 * 
 * Replaces blocking KEYS command with non-blocking SCAN for better performance
 */

/**
 * Scans Redis keys matching a pattern using SCAN command (for redis package)
 * 
 * @param client - Redis client instance from 'redis' package
 * @param pattern - Pattern to match (e.g., "graph:*")
 * @param maxKeys - Maximum number of keys to return (default: 10000)
 * @returns Array of matching keys
 */
export async function scanKeys(
  client: RedisClientType,
  pattern: string,
  maxKeys: number = 10000
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = 0;

  do {
    const result = await client.scan(cursor, {
      MATCH: pattern,
      COUNT: 100, // Scan 100 keys at a time
    });

    cursor = result.cursor;
    keys.push(...result.keys);

    // Safety limit to prevent infinite loops
    if (keys.length >= maxKeys) {
      break;
    }
  } while (cursor !== 0);

  return keys;
}

/**
 * Scans Redis keys matching a pattern using SCAN command (for ioredis package)
 * 
 * @param client - Redis client instance from 'ioredis' package
 * @param pattern - Pattern to match (e.g., "graph:*")
 * @param maxKeys - Maximum number of keys to return (default: 10000)
 * @returns Array of matching keys
 */
export async function scanKeysIoredis(
  client: Redis,
  pattern: string,
  maxKeys: number = 10000
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);

    // Safety limit to prevent infinite loops
    if (keys.length >= maxKeys) {
      break;
    }
  } while (cursor !== '0');

  return keys;
}

