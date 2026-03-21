'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          setCurrentUser(user);
          setUserProfile(user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  async function signup(email, password, displayName, referralCode) {
    try {
      const result = await authService.signup(email, password, displayName, referralCode);
      
      // Store pending signup data in localStorage for verification
      if (result.pending) {
        const pendingSignup = {
          email,
          password,
          displayName,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
          timestamp: Date.now()
        };
        localStorage.setItem('pendingSignup', JSON.stringify(pendingSignup));
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const result = await authService.login(email, password);
      
      // Store auth data in localStorage
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('userData', JSON.stringify(result.user));
      
      setCurrentUser(result.user);
      setUserProfile(result.user);
      
      return result.user;
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    try {
      // Clear auth data from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  }

  async function resetPassword(email) {
    try {
      const result = await authService.resetPassword(email);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async function signInWithGoogle(googleUser) {
    try {
      const response = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: googleUser }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      // Store auth data in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      setCurrentUser(data.user);
      setUserProfile(data.user);
      
      return data.user;
    } catch (error) {
      throw error;
    }
  }

  async function verifyPasswordResetToken(email, token, newPassword) {
    try {
      const result = await authService.verifyPasswordResetToken(email, token, newPassword);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async function updateUserProfile(updates) {
    try {
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const updatedUser = await authService.updateUserProfile(currentUser.id, updates);
      
      // Update stored user data
      const updatedUserData = { ...currentUser, ...updates };
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      setCurrentUser(updatedUserData);
      setUserProfile(updatedUserData);
      
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  const loadUserProfile = useCallback(async () => {
    if (currentUser) {
      try {
        console.log('🔍 AuthContext: Loading user profile for:', currentUser.email);
        console.log('🆔 AuthContext: User ID:', currentUser.id);
        
        const user = await authService.getUserById(currentUser.id);
        console.log('📋 AuthContext: User profile loaded:', user);
        
        if (user) {
          setUserProfile(user);
        } else {
          console.log('❌ AuthContext: No user profile found');
        }
      } catch (error) {
        console.error('❌ AuthContext: Error loading user profile:', error);
      }
    }
  }, [currentUser]);

  // Verify token on app load
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('authToken');
      if (token && currentUser) {
        try {
          await authService.verifyAuthToken(token);
        } catch (error) {
          console.error('Token verification failed:', error);
          // Clear invalid auth data
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
    };

    if (currentUser) {
      verifyToken();
    }
  }, [currentUser]);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    signInWithGoogle,
    verifyPasswordResetToken,
    updateUserProfile,
    loadUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
