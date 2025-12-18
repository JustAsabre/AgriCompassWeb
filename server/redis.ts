import { createRequire } from 'module';

let client: any = null;

export async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;
  try {
    const require = createRequire(import.meta.url);
    const redis = require('redis');
    // Create client using the redis v4 API
    client = redis.createClient({ 
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });
    client.on('error', (err: any) => console.error('Redis client error:', err.message));
    client.on('reconnecting', () => console.log('Redis: Reconnecting...'));
    await client.connect();
    console.log('Redis connected');
    return client;
  } catch (err) {
    console.warn('Redis not available or failed to initialize', err);
    client = null;
    return null;
  }
}

export default getRedisClient;
