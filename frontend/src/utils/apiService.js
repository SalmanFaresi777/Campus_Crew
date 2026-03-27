/**
 * API Service Configuration & Methods
 * 
 * Centralized API client using axios with:
 * - Automatic authentication token injection
 * - Unauthorized request handling (401 redirects to login)
 * - Base URL configuration (avoids double slashes)
 * - Request/response interceptors
 * 
 * All API calls should use these methods to ensure consistent
 * error handling and authentication across the application
 */

import axios from 'axios';

// Retrieve backend URL from environment or use localhost default
const backendUrl = import.meta.env.VITE_BACKEND_LINK || 'http://localhost:8000';

// Remove trailing slash to prevent double slashes in URLs
const cleanedBackendUrl = backendUrl.endsWith('/') 
  ? backendUrl.slice(0, -1) 
  : backendUrl;

const API_BASE_URL = `${cleanedBackendUrl}/api`;

// Configure axios instance with base URL and default headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor: Attach authentication token to all requests
 * Automatically includes JWT bearer token if available in localStorage
 */
api.interceptors.request.use(
  (config) => {
    // Retrieve stored authentication token
    const authToken = localStorage.getItem('auth-token');
    if (authToken) {
      // Attach token to Authorization header
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor: Handle authentication errors
 * Redirects to login on 401 Unauthorized responses
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check for unauthorized response (401)
    if (error.response?.status === 401) {
      // Clear stored authentication tokens
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API method collection organized by resource type
export const apiService = {
  // ===== User/Profile APIs =====
  
  /**
   * Fetch current user's profile information
   */
  getProfile: () => api.get('/profile'),

  /**
   * Update user profile data
   */
  updateProfile: (profileData) => api.put('/profile', profileData),

  /**
   * Change user password
   */
  changePassword: (passwordData) => api.put('/change-password', passwordData),

  /**
   * Upload profile photo with multipart/form-data
   */
  uploadProfilePhoto: (userId, formData) => {
    return axios.put(`${API_BASE_URL}/upload-photo/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
  },

  // ===== Authentication APIs =====
  
  /**
   * User login with credentials
   */
  login: (credentials) => api.post('/login', credentials),

  /**
   * User registration/signup
   */
  register: (userData) => api.post('/signup', userData),

  // ===== Event APIs =====
  
  /**
   * Create new event with multipart form data (file upload)
   */
  createEvent: (eventData) => {
    return axios.post(`${API_BASE_URL}/events`, eventData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
  },

  /**
   * Fetch all events
   */
  getEvents: () => api.get('/events'),
  
  /**
   * Fetch specific event by ID
   */
  getEvent: (eventId) => api.get(`/events/${eventId}`),

  /**
   * Update event with multipart form data (file upload)
   */
  updateEvent: (eventId, eventData) => {
    return axios.put(`${API_BASE_URL}/events/${eventId}`, eventData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
  },

  /**
   * Delete event by ID
   */
  deleteEvent: (eventId) => api.delete(`/events/${eventId}`),

  // ===== Event Registration APIs =====
  
  /**
   * Register user for an event
   */
  registerForEvent: (payload) => api.post('/register-event', payload),
  
  /**
   * Get all registrations for a specific user
   */
  getUserRegistrations: (userId) => api.get(`/registrations/user/${userId}`),
  
  /**
   * Get all registrations for a specific event
   */
  getEventRegistrations: (eventId) => api.get(`/registrations/event/${eventId}`),
  
  // ===== Certificate APIs =====
  
  /**
   * Get all certificates for a user
   */
  getUserCertificates: (userId) => api.get(`/certificates/user/${userId}`),
  
  /**
   * Download certificate as blob (PDF file)
   */
  downloadCertificate: (registrationId) => api.get(`/certificates/${registrationId}/download`, { responseType: 'blob' }),
};

export default api;
