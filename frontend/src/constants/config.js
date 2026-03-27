/**
 * Frontend Configuration Constants
 * 
 * Centralized configuration for:
 * - Loading and timing delays
 * - API endpoint paths
 * - Theme configuration
 * - Local storage keys
 * - HTTP status codes
 * - Validation rules
 * - Error messages
 * 
 * All magic numbers and configuration values should be defined here
 * to maintain consistency and ease future maintenance.
 */

// Page load and interaction timeouts (in milliseconds)
export const LOADER_TIMEOUTS = {
  PAGE_LOAD: 800,              // Initial page load animation
  API_TIMEOUT: 10000,          // API request timeout
  TOAST_DURATION: 1000,        // Toast notification visibility
  DEBOUNCE_DELAY: 500,         // Search/input debounce delay
};

// Pagination configuration
export const PAGINATION = {
  ITEMS_PER_PAGE: 10,           // Number of items displayed per page
  DEFAULT_PAGE: 0,              // Initial page (0-indexed)
};

// Browser cache and session management
export const CACHE = {
  SESSION_TTL: 120000,          // Session cache time-to-live (2 minutes)
  DATA_REFRESH_INTERVAL: 600000, // Background data refresh interval (10 minutes)
};

// Backend API endpoint paths (relative to base URL)
export const API_ENDPOINTS = {
  LOGIN: '/api/login',
  REGISTER: '/api/register',
  VERIFY_EMAIL: '/api/verify-email',
  FORGOT_PASSWORD: '/api/forgot-password',
  RESET_PASSWORD: '/api/reset-password',
  EVENTS: '/api/events',
  REGISTRATIONS: '/api/registrations',
  CHAT: '/api/chat',
  RECOMMENDATIONS: '/api/recommendations',
  USERS: '/api/users',
};

// Theme configuration for dark/light mode support
export const THEME = {
  DARK: 'dark',                 // Dark theme identifier
  LIGHT: 'light',               // Light theme identifier
  DARK_COLOR: '#ffffff',        // Text color for dark theme
  LIGHT_COLOR: '#000000',       // Text color for light theme
};

// Local storage key identifiers for persisting user data
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth-token',                    // JWT authentication token
  REFRESH_TOKEN: 'refresh-token',              // Refresh token for reauth
  USER_DATA: 'user-data',                      // Cached user profile data
  THEME: 'theme-preference',                   // User theme preference
};

// HTTP status codes for response handling
export const HTTP_STATUS = {
  SUCCESS: 200,                 // Request successful
  CREATED: 201,                 // Resource created
  BAD_REQUEST: 400,             // Invalid request format
  UNAUTHORIZED: 401,            // Authentication required
  FORBIDDEN: 403,               // Not authorized to access
  NOT_FOUND: 404,               // Resource not found
  SERVER_ERROR: 500,            // Server-side error
};

// User-friendly error messages for common error scenarios
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SESSION_EXPIRED: 'Session expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  INVALID_INPUT: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
};

// Form input validation rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,       // Minimum password length requirement
  MAX_USERNAME_LENGTH: 50,      // Maximum username character limit
  MAX_EVENT_TITLE_LENGTH: 100,  // Maximum event title length
};

// Event format types
export const EVENT_TYPES = {
  ONLINE: 'online',             // Virtual/online event
  OFFLINE: 'offline',           // In-person/physical event
};
