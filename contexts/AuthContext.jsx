import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../utils/apiService';
import { showSuccessToast, showErrorToast, showInfoToast } from '../utils/toastUtils';

const AuthContext = createContext();

// Constants for localStorage keys to avoid typos
const STORAGE_KEYS = {
  token: 'auth-token',
  refreshToken: 'refresh-token',
  user: 'auth-user'
};

// Function to store a minimal user snapshot in localStorage for faster app initialization
const persistUserSnapshot = (userData) => {
  if (!userData) return;
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({
    _id: userData._id,
    username: userData.username,
    email: userData.email,
    isAdmin: userData.isAdmin,
    isApprovedAdmin: userData.isApprovedAdmin
  }));
};

// Custom hook to access authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Load user snapshot from localStorage for fast initial render
  const initialUser = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.token);
      if (token) {
        try {
          const response = await apiService.getProfile();
          if (response.data.success) {
            setIsAuthenticated(true);
            setUser(response.data.user);
            // Keep only a minimal user snapshot in storage.
            persistUserSnapshot(response.data.user);
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
    localStorage.setItem(STORAGE_KEYS.token, token);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    }
    setIsAuthenticated(true);
    
    // Fetch complete user profile after login
    try {
      const response = await apiService.getProfile();
      if (response.data.success) {
        setUser(response.data.user);
        persistUserSnapshot(response.data.user);
      } else {
        // Fallback to provided userData if profile fetch fails
        setUser(userData);
        persistUserSnapshot(userData);
      }
    } catch (error) {
      console.error('Failed to fetch profile after login:', error);
      // Fallback to provided userData if profile fetch fails
      setUser(userData);
      persistUserSnapshot(userData);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    setIsAuthenticated(false);
    setUser(null);
    showInfoToast('You have been logged out successfully.');
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (token && isAuthenticated) {
      try {
        const response = await apiService.getProfile();
        if (response.data.success) {
          setUser(response.data.user);
          persistUserSnapshot(response.data.user);
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
