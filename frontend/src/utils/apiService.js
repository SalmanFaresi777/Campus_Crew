import axios from 'axios';
const backend = import.meta.env.VITE_BACKEND_LINK || 'http://localhost:8000';
// Trim trailing slash to avoid duplicated separators
const cleanBackend = backend.endsWith('/') ? backend.slice(0, -1) : backend;
const API_BASE_URL = `${cleanBackend}/api`;

// Build a shared axios client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token on outbound requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle unauthorized sessions
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear stale credentials and redirect to login
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API method collection
export const apiService = {
  // Fetch user profile
  getProfile: () => api.get('/profile'),

  // Save user profile updates
  updateProfile: (profileData) => api.put('/profile', profileData),

  // Submit password change
  changePassword: (passwordData) => api.put('/change-password', passwordData),

  // Upload user profile image
  uploadProfilePhoto: (userId, formData) => {
    return axios.put(`${API_BASE_URL}/upload-photo/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
  },

  // Sign in user
  login: (credentials) => api.post('/login', credentials),

  // Create user account
  register: (userData) => api.post('/signup', userData),

  // Event-related endpoints
  createEvent: (eventData) => {
    return axios.post(`${API_BASE_URL}/events`, eventData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
  },

  getEvents: () => api.get('/events'),
  getEvent: (eventId) => api.get(`/events/${eventId}`),

  updateEvent: (eventId, eventData) => {
    return axios.put(`${API_BASE_URL}/events/${eventId}`, eventData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
  },

  deleteEvent: (eventId) => api.delete(`/events/${eventId}`),

  // Registration endpoints
  registerForEvent: (payload) => api.post('/register-event', payload),
  getUserRegistrations: (userId) => api.get(`/registrations/user/${userId}`),
  getEventRegistrations: (eventId) => api.get(`/registrations/event/${eventId}`),
  // Certificate endpoints
  getUserCertificates: (userId) => api.get(`/certificates/user/${userId}`),
  downloadCertificate: (registrationId) => api.get(`/certificates/${registrationId}/download`, { responseType: 'blob' }),
};

export default api;
