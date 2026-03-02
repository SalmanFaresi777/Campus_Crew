/**
 * Cache management utilities for the frontend
 */

const CACHE_KEYS = {
  EVENTS: "events_cache",
  USER_REGISTRATIONS: "user_registrations_cache",
};

/**
 * Clear all event-related caches
 */
export const clearEventCaches = () => {
  localStorage.removeItem(CACHE_KEYS.EVENTS);
  localStorage.removeItem(CACHE_KEYS.USER_REGISTRATIONS);
  console.log('Event caches cleared');
};

/**
 * Clear specific cache by key
 */
export const clearCache = (key) => {
  localStorage.removeItem(key);
  console.log(`Cache cleared: ${key}`);
};

/**
 * Force refresh events by clearing cache
 */
export const forceRefreshEvents = () => {
  clearCache(CACHE_KEYS.EVENTS);
};

/**
 * Check if cache is expired
 */
export const isCacheExpired = (cacheKey, ttl) => {
  const cached = localStorage.getItem(cacheKey);
  if (!cached) return true;
  
  try {
    const { timestamp } = JSON.parse(cached);
    return Date.now() - timestamp > ttl;
  } catch (e) {
    return true;
  }
};

export { CACHE_KEYS };
