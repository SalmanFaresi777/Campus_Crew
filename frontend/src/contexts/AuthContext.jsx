import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../utils/apiService';
import { showSuccessToast, showErrorToast, showInfoToast } from '../utils/toastUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Retrieve cached user profile from local storage on startup
  const initialUser = (() => {
    try {
      const cached = localStorage.getItem('auth-user');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  })();
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('auth-token');
      if (token) {
        try {
          const response = await apiService.getProfile();
          if (response.data.success) {
            setIsAuthenticated(true);
            setUser(response.data.user);
            // Cache user essentials for fast app startup
            localStorage.setItem('auth-user', JSON.stringify({
              _id: response.data.user._id,
              username: response.data.user.username,
              email: response.data.user.email,
              isAdmin: response.data.user.isAdmin,
              isApprovedAdmin: response.data.user.isApprovedAdmin
            }));
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
    localStorage.setItem('auth-token', token);
    if (refreshToken) {
      localStorage.setItem('refresh-token', refreshToken);
    }
    setIsAuthenticated(true);
    
    // Fetch and cache complete user profile after authentication
    try {
      const response = await apiService.getProfile();
      if (response.data.success) {
        setUser(response.data.user);
        localStorage.setItem('auth-user', JSON.stringify({
          _id: response.data.user._id,
          username: response.data.user.username,
          email: response.data.user.email,
          isAdmin: response.data.user.isAdmin,
          isApprovedAdmin: response.data.user.isApprovedAdmin
        }));
      } else {
        // Use provided user data if profile fetch fails
        setUser(userData);
        if (userData) localStorage.setItem('auth-user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to fetch profile after login:', error);
      // Fallback to initial user data on fetch failure
      setUser(userData);
      if (userData) localStorage.setItem('auth-user', JSON.stringify(userData));
    }
  };

  const logout = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('refresh-token');
    localStorage.removeItem('auth-user');
    setIsAuthenticated(false);
    setUser(null);
    showInfoToast('Logged out successfully.');
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem('auth-token');
    if (token && isAuthenticated) {
      try {
        const response = await apiService.getProfile();
        if (response.data.success) {
          const userData = response.data.user;
          setUser(userData);
          localStorage.setItem('auth-user', JSON.stringify({
            _id: userData._id,
            username: userData.username,
            email: userData.email,
            isAdmin: userData.isAdmin,
            isApprovedAdmin: userData.isApprovedAdmin
          }));
          return userData;
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
