import axios from 'axios';
const backend = import.meta.env.VITE_BACKEND_LINK || 'http://localhost:8000';
// Remove trailing slash to prevent double slashes
const cleanBackend = backend.endsWith('/') ? backend.slice(0, -1) : backend;
// Configure API base URL with environment variable
const API_BASE_URL = `${cleanBackend}/api`;
const getAuthToken = () => localStorage.getItem('auth-token');

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically add auth token to headers
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

// Response interceptor to handle authentication failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Centralized auth failure handling.
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Exported API service object with all endpoint methods
export const apiService = {
  // Get user profile
  getProfile: () => api.get('/profile'),

  // Update user profile
  updateProfile: (profileData) => api.put('/profile', profileData),

  // Change password
  changePassword: (passwordData) => api.put('/change-password', passwordData),

  // Upload profile photo
  uploadProfilePhoto: (userId, formData) => {
    // Use direct axios call to ensure multipart headers are preserved.
    return axios.put(`${API_BASE_URL}/upload-photo/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
  },

  // Login
  login: (credentials) => api.post('/login', credentials),

  // Register
  register: (userData) => api.post('/signup', userData),

  // Event APIs
  createEvent: (eventData) => {
    // Multipart payload includes images/files.
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

  // Registration APIs
  registerForEvent: (payload) => api.post('/register-event', payload),
  getUserRegistrations: (userId) => api.get(`/registrations/user/${userId}`),
  getEventRegistrations: (eventId) => api.get(`/registrations/event/${eventId}`),
  // Certificate APIs
  getUserCertificates: (userId) => api.get(`/certificates/user/${userId}`),
  downloadCertificate: (registrationId) => api.get(`/certificates/${registrationId}/download`, { responseType: 'blob' }),
};

export default api;
