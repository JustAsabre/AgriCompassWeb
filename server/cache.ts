/**
 * Server-side caching utility
 * Uses Redis if available, falls back to in-memory cache
 */
import getRedisClient from './redis';

// In-memory cache as fallback
const memoryCache = new Map<string, { value: any; expiry: number }>();

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 30,        // 30 seconds - for frequently changing data
  MEDIUM: 120,      // 2 minutes - for moderately changing data
  LONG: 300,        // 5 minutes - for slow-changing data
  VERY_LONG: 600,   // 10 minutes - for static-ish data
} as const;

// Cache key prefixes for easy invalidation
export const CacheKeys = {
  LISTINGS: 'listings',
  LISTINGS_WITH_FARMER: 'listings:with-farmer',
  LISTING_DETAIL: 'listing',
  USER: 'user',
  FARMER_STATS: 'farmer:stats:',
  FARMER_LISTINGS: 'farmer:listings:',
  FARMER_ORDERS: 'farmer:orders:',
  BUYER_STATS: 'buyer:stats:',
  BUYER_ORDERS: 'buyer:orders:',
  CART: 'cart:',
  NOTIFICATIONS: 'notifications:',
  REVIEWS: 'reviews',
} as const;

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient();
    
    if (redis) {
      const value = await redis.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    }
    
    // Fallback to memory cache
    const cached = memoryCache.get(key);
    if (cached) {
      if (Date.now() < cached.expiry) {
        return cached.value as T;
      }
      // Expired, remove it
      memoryCache.delete(key);
    }
    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set cached value with TTL
 */
export async function setCache(key: string, value: any, ttlSeconds: number = CacheTTL.MEDIUM): Promise<void> {
  try {
    const redis = await getRedisClient();
    
    if (redis) {
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return;
    }
    
    // Fallback to memory cache
    memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    
    if (redis) {
      await redis.del(key);
      return;
    }
    
    // Fallback to memory cache
    memoryCache.delete(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Delete all keys matching a pattern (for invalidation)
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    
    if (redis) {
      // Use SCAN to find matching keys
      const keys: string[] = [];
      for await (const key of redis.scanIterator({ MATCH: `${pattern}*` })) {
        keys.push(key);
      }
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return;
    }
    
    // Fallback to memory cache - delete matching keys
    for (const key of memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        memoryCache.delete(key);
      }
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
}

/**
 * Cache-through helper: Get from cache or fetch and cache
 */
export async function cacheThrough<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try cache first
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetcher();
  
  // Cache it
  await setCache(key, data, ttlSeconds);
  
  return data;
}

/**
 * Invalidate caches related to a specific entity
 */
export async function invalidateListingCaches(listingId?: string): Promise<void> {
  await deleteCachePattern(CacheKeys.LISTINGS);
  if (listingId) {
    await deleteCache(`${CacheKeys.LISTING_DETAIL}:${listingId}`);
  }
}

export async function invalidateFarmerCaches(farmerId: string): Promise<void> {
  await deleteCache(`${CacheKeys.FARMER_STATS}${farmerId}`);
  await deleteCache(`${CacheKeys.FARMER_LISTINGS}${farmerId}`);
  await deleteCache(`${CacheKeys.FARMER_ORDERS}${farmerId}`);
}

export async function invalidateBuyerCaches(buyerId: string): Promise<void> {
  await deleteCache(`${CacheKeys.BUYER_STATS}${buyerId}`);
  await deleteCache(`${CacheKeys.BUYER_ORDERS}${buyerId}`);
  await deleteCache(`${CacheKeys.CART}${buyerId}`);
}

export async function invalidateUserCaches(userId: string): Promise<void> {
  await deleteCache(`${CacheKeys.USER}:${userId}`);
  await deleteCache(`${CacheKeys.NOTIFICATIONS}${userId}`);
}

// Cleanup expired entries periodically (for memory cache)
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of memoryCache.entries()) {
    if (now >= cached.expiry) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Run every minute
