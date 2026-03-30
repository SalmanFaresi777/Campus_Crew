// Centralized API client with token injection and error handling
import axios from 'axios';

// Configure backend URL with localhost fallback
const backendUrl = import.meta.env.VITE_BACKEND_LINK || 'http://localhost:8000';
const cleanedBackendUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;

const API_BASE_URL = `${cleanedBackendUrl}/api`;

// Build shared axios client with default headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const authToken = localStorage.getItem('auth-token');
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors by redirecting to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // User profile endpoints
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
