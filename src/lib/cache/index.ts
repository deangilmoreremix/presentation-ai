// Redis client for caching (when Redis is available)
// This is a simple implementation - for production, consider using a more robust solution

interface CacheEntry {
  data: any;
  expires: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000),
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Use memory cache as fallback, Redis would be better for production
export const cache = new MemoryCache();

// Cache keys
export const CACHE_KEYS = {
  PRESENTATION_THEMES: "presentation:themes",
  USER_PRESENTATIONS: (userId: string) => `user:${userId}:presentations`,
  PRESENTATION_DATA: (id: string) => `presentation:${id}:data`,
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  PRESENTATION_THEMES: 3600, // 1 hour
  USER_PRESENTATIONS: 1800, // 30 minutes
  PRESENTATION_DATA: 900, // 15 minutes
} as const;

// Cache wrapper functions
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  await cache.set(key, data, ttl);
  return data;
}

export async function invalidateCache(key: string): Promise<void> {
  await cache.delete(key);
}

export async function invalidateUserCache(userId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.USER_PRESENTATIONS(userId));
}

export async function invalidatePresentationCache(presentationId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.PRESENTATION_DATA(presentationId));
}