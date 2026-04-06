import axios from 'axios';
const backend = import.meta.env.VITE_BACKEND_LINK || 'http://localhost:8000';
// Normalizes backend URL by removing trailing slashes
const cleanBackend = backend.endsWith('/') ? backend.slice(0, -1) : backend;
// Sets API base URL from environment configuration
const API_BASE_URL = `${cleanBackend}/api`;
const fetchAuthToken = () => localStorage.getItem('auth-token');

// Initializes axios with default headers and base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically includes auth token in request headers
api.interceptors.request.use(
  (config) => {
    const token = fetchAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepts unauthorized responses and clears credentials
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clears auth tokens and redirects on 401 status
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Repository of all API request methods
export const apiService = {
  // Fetches authenticated user profile
  getProfile: () => api.get('/profile'),

  // Updates user profile information
  updateProfile: (profileData) => api.put('/profile', profileData),

  // Updates user password
  changePassword: (passwordData) => api.put('/change-password', passwordData),

  // Uploads user profile image
  uploadProfilePhoto: (userId, formData) => {
    // Uses direct axios call to preserve multipart form data headers
    return axios.put(`${API_BASE_URL}/upload-photo/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${fetchAuthToken()}`,
      },
    });
  },

  // Authenticates user credentials
  login: (credentials) => api.post('/login', credentials),

  // Registers new user account
  register: (userData) => api.post('/signup', userData),

  // API methods for event operations
  createEvent: (eventData) => {
    // Request uses multipart form data encoding
    return axios.post(`${API_BASE_URL}/events`, eventData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${fetchAuthToken()}`,
      },
    });
  },

  getEvents: () => api.get('/events'),
  getEvent: (eventId) => api.get(`/events/${eventId}`),

  updateEvent: (eventId, eventData) => {
    return axios.put(`${API_BASE_URL}/events/${eventId}`, eventData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${fetchAuthToken()}`,
      },
    });
  },

  deleteEvent: (eventId) => api.delete(`/events/${eventId}`),

  // API methods for user event registrations
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
