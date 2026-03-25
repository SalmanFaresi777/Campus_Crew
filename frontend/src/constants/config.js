/**
 * Frontend Configuration Constants
 * Centralized place for magic numbers, timeouts, and configuration values
 */

export const LOADER_TIMEOUTS = {
  PAGE_LOAD: 800, // Initial page load animation delay (ms)
  API_TIMEOUT: 10000, // API request timeout (ms)
  TOAST_DURATION: 1000, // Toast notification display time (ms)
  DEBOUNCE_DELAY: 500, // Search/input debounce delay (ms)
};

export const PAGINATION = {
  ITEMS_PER_PAGE: 10, // Default items per page
  DEFAULT_PAGE: 0, // Default starting page (0-indexed)
};

export const CACHE = {
  SESSION_TTL: 120000, // Session cache TTL in milliseconds (2 min)
  DATA_REFRESH_INTERVAL: 600000, // Data refresh interval (10 min)
};

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

export const THEME = {
  DARK: 'dark',
  LIGHT: 'light',
  DARK_COLOR: '#ffffff',
  LIGHT_COLOR: '#000000',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth-token',
  REFRESH_TOKEN: 'refresh-token',
  USER_DATA: 'user-data',
  THEME: 'theme-preference',
};

export const HTTP_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SESSION_EXPIRED: 'Session expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  INVALID_INPUT: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
};

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_USERNAME_LENGTH: 50,
  MAX_EVENT_TITLE_LENGTH: 100,
};

export const EVENT_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};
