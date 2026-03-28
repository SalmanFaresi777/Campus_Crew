import axios from 'axios';
const backend = import.meta.env.VITE_BACKEND_LINK || 'http://localhost:8000';
// Ensure no trailing slash to avoid double slashes in URLs
const cleanBackend = backend.endsWith('/') ? backend.slice(0, -1) : backend;
// Set up API endpoint base using environment configuration
const API_BASE_URL = `${cleanBackend}/api`;
const getAuthToken = () => localStorage.getItem('auth-token');

// Initialize axios client with standard settings
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication token to outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Manage authentication errors in responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access by clearing tokens and redirecting
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Collection of all API endpoint functions
export const apiService = {
  // Retrieve current user information
  getProfile: () => api.get('/profile'),

  // Modify user profile details
  updateProfile: (profileData) => api.put('/profile', profileData),

  // Change password
  changePassword: (passwordData) => api.put('/change-password', passwordData),

  // Upload profile photo
  uploadProfilePhoto: (userId, formData) => {
    // Direct axios call preserves multipart form data headers
    return axios.put(`${API_BASE_URL}/upload-photo/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
  },

  // User authentication
  login: (credentials) => api.post('/login', credentials),

  // User account creation
  register: (userData) => api.post('/signup', userData),

  // Event management endpoints
  createEvent: (eventData) => {
    // Form data includes images and files
    return axios.post(`${API_BASE_URL}/events`, eventData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
  },

  getEvents: () => api.get('/events'),
  getEvent: (eventId) => api.get(`/events/${eventId}`),

  updateEvent: (eventId, eventData) => {
    return axios.put(`${API_BASE_URL}/events/${eventId}`, eventData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
  },

  deleteEvent: (eventId) => api.delete(`/events/${eventId}`),

  // Event participation endpoints
  registerForEvent: (payload) => api.post('/register-event', payload),
  getUserRegistrations: (userId) => api.get(`/registrations/user/${userId}`),
  getEventRegistrations: (eventId) => api.get(`/registrations/event/${eventId}`),
  // Confirm email address with verification token
  verifyEmail: (token, params = {}) => api.get(`/verify-email/${token}`, { params }),
  // Certificate management endpoints
  getUserCertificates: (userId) => api.get(`/certificates/user/${userId}`),
  downloadCertificate: (registrationId) => api.get(`/certificates/${registrationId}/download`, { responseType: 'blob' }),
};

export default api;
