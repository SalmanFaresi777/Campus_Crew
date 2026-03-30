import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../utils/apiService';
import { showSuccessToast, showErrorToast, showInfoToast } from '../utils/toastUtils';

const AuthContext = createContext();

// Storage key constants to prevent naming errors
const AUTH_STORAGE_KEYS = {
  token: 'auth-token',
  refreshToken: 'refresh-token',
  user: 'auth-user'
};

// Save key user details in localStorage for fast app initialization
const storeUserInfo = (userData) => {
  if (!userData) return;
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify({
    _id: userData._id,
    username: userData.username,
    email: userData.email,
    isAdmin: userData.isAdmin,
    isApprovedAdmin: userData.isApprovedAdmin
  }));
};

// Custom hook to get authentication status and functions
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Fetch preserved user details for quick UI setup
  const initialUser = (() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.user);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
      if (token) {
        try {
          const response = await apiService.getProfile();
          if (response.data.success) {
            setIsAuthenticated(true);
            setUser(response.data.user);
            // Keep only a minimal user snapshot in storage.
            storeUserInfo(response.data.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to fetch profile on load', error);
          showErrorToast('Session expired. Please login again.');
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (token, refreshToken, userData = null) => {
    localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
    if (refreshToken) {
      localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    }
    setIsAuthenticated(true);
    
    // Retrieve complete user profile after authentication
    try {
      const response = await apiService.getProfile();
      if (response.data.success) {
        setUser(response.data.user);
        storeUserInfo(response.data.user);
      } else {
        // Use provided data as backup if profile request fails
        setUser(userData);
        storeUserInfo(userData);
      }
    } catch (error) {
      console.error('Failed to fetch profile after login:', error);
      // Use provided data as backup if profile request fails
      setUser(userData);
      storeUserInfo(userData);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    setIsAuthenticated(false);
    setUser(null);
    showInfoToast('You have been logged out successfully.');
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
    if (token && isAuthenticated) {
      try {
        const response = await apiService.getProfile();
        if (response.data.success) {
          setUser(response.data.user);
          storeUserInfo(response.data.user);
          return response.data.user;
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }
    return null;
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    setUser,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
