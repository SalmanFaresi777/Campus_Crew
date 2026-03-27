/**
 * Cache Management Utilities
 * 
 * Handles localStorage-based caching for:
 * - Event data
 * - User registration information
 * - Cache expiration and invalidation
 * 
 * Reduces API calls and improves performance through intelligent caching
 */

// Cache key identifiers for localStorage
const CACHE_KEYS = {
  EVENTS: "events_cache",                    // Cached events list
  USER_REGISTRATIONS: "user_registrations_cache", // User registration data
};

/**
 * Clear all event-related caches from localStorage
 */
export const clearEventCaches = () => {
  localStorage.removeItem(CACHE_KEYS.EVENTS);
  localStorage.removeItem(CACHE_KEYS.USER_REGISTRATIONS);
  console.log('Event caches cleared');
};

/**
 * Clear a specific cache by key from localStorage
 * @param {string} cacheKey - The cache key to clear
 */
export const clearCache = (cacheKey) => {
  localStorage.removeItem(cacheKey);
  console.log(`Cache cleared: ${cacheKey}`);
};

/**
 * Force refresh events by clearing the events cache
 */
export const forceRefreshEvents = () => {
  clearCache(CACHE_KEYS.EVENTS);
};

/**
 * Check if cached data has expired based on time-to-live
 * @param {string} cacheKey - The cache key to check
 * @param {number} ttl - Time-to-live in milliseconds
 * @returns {boolean} True if cache is expired or missing, false if valid
 */
export const isCacheExpired = (cacheKey, ttl) => {
  const cachedData = localStorage.getItem(cacheKey);
  if (!cachedData) return true;
  
  try {
    const parsedData = JSON.parse(cachedData);
    const isExpired = Date.now() - parsedData.timestamp > ttl;
    return isExpired;
  } catch (error) {
    // Invalid JSON or parsing error - treat as expired
    return true;
  }
};

export { CACHE_KEYS };
