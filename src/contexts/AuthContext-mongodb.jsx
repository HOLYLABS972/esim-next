'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
// import authService from '../services/authService'; // Removed - causes client-side issues

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

    // Listen for auth state changes from external sources (like Yandex login)
    const handleAuthStateChange = (event) => {
      const { user, token, action } = event.detail;
      
      if (action === 'login') {
        console.log('🔍 AuthContext: Received login event from external source');
        setCurrentUser(user);
        setUserProfile(user);
      } else if (action === 'logout') {
        console.log('🔍 AuthContext: Received logout event from external source');
        setCurrentUser(null);
        setUserProfile(null);
      }
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  async function signup(email, password, displayName, referralCode) {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, displayName, referralCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store pending signup data in localStorage for verification
      if (data.pending) {
        const pendingSignup = {
          email,
          password,
          displayName,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
          timestamp: Date.now()
        };
        localStorage.setItem('pendingSignup', JSON.stringify(pendingSignup));
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
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

  async function logout() {
    try {
      // Clear auth data from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      setCurrentUser(null);
      setUserProfile(null);
      
      // Trigger auth state change event for components listening
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { action: 'logout' } 
      }));
    } catch (error) {
      throw error;
    }
  }

  async function resetPassword(email) {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      return data;
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

  async function verifyEmailToken(token, email) {
    try {
      // Get pending email verification data from localStorage
      const pendingEmailVerification = localStorage.getItem('pendingEmailVerification');
      if (!pendingEmailVerification) {
        throw new Error('No pending email verification found');
      }

      const pendingVerification = JSON.parse(pendingEmailVerification);
      
      // Simple verification - just check if email matches and token matches
      if (pendingVerification.email !== email.toLowerCase().trim()) {
        throw new Error('Email mismatch');
      }
      
      if (pendingVerification.token !== token) {
        throw new Error('Invalid verification token');
      }
      
      // Check if token has expired (24 hours)
      const expiresAt = pendingVerification.expiresAt;
      if (Date.now() > expiresAt) {
        localStorage.removeItem('pendingEmailVerification');
        throw new Error('Verification link has expired');
      }

      // Create account with verified email
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: pendingVerification.email,
          password: pendingVerification.password,
          displayName: pendingVerification.displayName,
          emailVerified: true,
          referralCode: pendingVerification.referralCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Account creation failed');
      }

      // Store auth data in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      // Clear pending verification data
      localStorage.removeItem('pendingEmailVerification');
      
      setCurrentUser(data.user);
      setUserProfile(data.user);
      
      return data.user;
    } catch (error) {
      throw error;
    }
  }

  async function verifyPasswordResetToken(email, token, newPassword) {
    try {
      const response = await fetch('/api/auth/verify-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset verification failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async function updateUserProfile(updates) {
    try {
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUser.id, updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed');
      }

      // Update stored user data
      const updatedUserData = { ...currentUser, ...updates };
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      setCurrentUser(updatedUserData);
      setUserProfile(updatedUserData);
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  const loadUserProfile = useCallback(async () => {
    if (currentUser) {
      try {
        console.log('🔍 AuthContext: Loading user profile for:', currentUser.email);
        console.log('🆔 AuthContext: User ID:', currentUser.id);
        
        const response = await fetch(`/api/auth/user/${currentUser.id}`);
        const user = await response.json();
        
        if (response.ok) {
          console.log('📋 AuthContext: User profile loaded:', user);
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
          const response = await fetch('/api/auth/verify-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          if (!response.ok) {
            throw new Error('Token verification failed');
          }
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
    verifyEmailToken,
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