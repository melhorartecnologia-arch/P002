import IORedis from 'ioredis';

export function createRedisConnection(url?: string): IORedis {
  const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export const defaultConnection = createRedisConnection();
