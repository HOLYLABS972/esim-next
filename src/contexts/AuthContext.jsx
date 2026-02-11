'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [session, setSession] = useState(null);
  
  // OTP state management
  const [otpState, setOtpState] = useState({ status: 'idle' }); // 'idle' | 'sending' | 'sent' | 'verifying' | 'error'
  const [otpEmail, setOtpEmail] = useState(null);

  // Create user profile if it doesn't exist
  const createUserProfile = useCallback(async (user) => {
    try {
      console.log('📝 Attempting to create user profile for:', user.id);
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          display_name: user.displayName || user.email?.split('@')[0],
          full_name: user.user_metadata?.full_name || user.user_metadata?.display_name,
          email_verified: user.emailVerified || false
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ User profile created successfully:', result);
        return result;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to create user profile:', errorData);
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      return null;
    }
  }, []);

  // Fetch user profile from users table
  const fetchUserProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (error) {
        // Ignore AbortError — happens when component unmounts during navigation
        if (error.message?.includes('AbortError') || error.code === 'PGRST000') {
          console.log('ℹ️ Profile fetch aborted (navigation in progress)');
          return null;
        }
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data; // Will be null if no profile exists
    } catch (error) {
      if (error?.message?.includes('AbortError')) {
        console.log('ℹ️ Profile fetch aborted (navigation in progress)');
        return null;
      }
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  // Initialize auth state (Supabase + localStorage for Yandex)
  useEffect(() => {
    // First check localStorage for Yandex/other OAuth tokens
    const checkLocalStorageAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          console.log('🔍 Found localStorage auth (Yandex/OAuth):', user.email);
          setCurrentUser(user);
          setUserProfile(user);
          setLoading(false);
          return true; // Found localStorage auth
        }
      } catch (error) {
        console.error('Error reading localStorage auth:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
      return false; // No localStorage auth
    };

    // Check Supabase Auth session with timeout
    console.log('🔍 Checking Supabase auth session...');

    // Check if Supabase is properly configured
    if (!supabase) {
      console.error('❌ Supabase client is null - env vars may be missing');
      if (!checkLocalStorageAuth()) {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
      return;
    }

    // Track whether any auth path has resolved (getSession, onAuthStateChange, or localStorage)
    // so the timeout doesn't overwrite a valid session.
    let authResolved = false;

    let authTimeout = setTimeout(() => {
      if (authResolved) return; // Another path already handled auth
      authResolved = true;
      console.warn('⚠️ Auth check timed out after 2s, checking localStorage...');
      if (!checkLocalStorageAuth()) {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    }, 2000);

    // Call getSession — may hang if setSession() is in progress on callback pages
    supabase.auth.getSession()
      .then((result) => {
        clearTimeout(authTimeout);
        if (authResolved) return; // Timeout or onAuthStateChange already handled auth
        authResolved = true;
        const { data: { session }, error } = result;

      if (error) {
        console.error('❌ Error getting session:', error);
        // Try localStorage as fallback
        if (!checkLocalStorageAuth()) {
          setLoading(false);
        }
        return;
      }

      console.log('🔍 Session check result:', session ? 'Session found' : 'No session');
      setSession(session);

      if (session?.user) {
        console.log('✅ User found in session:', session.user.id, session.user.email);
        const user = {
          id: session.user.id,
          email: session.user.email,
          emailVerified: !!session.user.email_confirmed_at,
          displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
          provider: session.user.app_metadata?.provider || 'email'
        };
        
        setCurrentUser(user);
        
        // Fetch full profile (non-blocking - don't wait for it)
        fetchUserProfile(session.user.id).then(async profile => {
          if (profile) {
            setUserProfile({
              ...user,
              ...profile,
              displayName: profile.display_name || user.displayName,
              role: profile.role || 'customer'
            });
          } else {
            // No profile found, create one automatically
            console.log('📝 Creating user profile for:', session.user.id);
            try {
              const createdProfile = await createUserProfile({
                id: session.user.id,
                email: session.user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                user_metadata: session.user.user_metadata
              });
              
              if (createdProfile) {
                // Fetch the newly created profile
                const newProfile = await fetchUserProfile(session.user.id);
                if (newProfile) {
                  setUserProfile({
                    ...user,
                    ...newProfile,
                    displayName: newProfile.display_name || user.displayName,
                    role: newProfile.role || 'customer'
                  });
                } else {
                  setUserProfile(user);
                }
              } else {
                setUserProfile(user);
              }
            } catch (error) {
              console.error('Error creating user profile:', error);
              // Still set user profile even if creation fails
              setUserProfile(user);
            }
          }
        }).catch(error => {
          console.error('Error fetching/creating user profile:', error);
          // Set basic user profile even if fetch fails
          setUserProfile(user);
        });
        setLoading(false);
      } else {
        // No Supabase session, check localStorage (for Yandex)
        if (!checkLocalStorageAuth()) {
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    }).catch((err) => {
      clearTimeout(authTimeout);
      if (authResolved) return; // Another path already handled auth
      authResolved = true;
      console.warn('⚠️ Session check failed:', err.message);
      // Try localStorage as fallback
      if (!checkLocalStorageAuth()) {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Listen for auth changes from Supabase (only if supabase is configured)
    let subscription = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Supabase auth event:', event);

      // Skip INITIAL_SESSION — getSession() above already handles the initial load.
      // Processing it again causes duplicate profile fetches and AbortError races.
      if (event === 'INITIAL_SESSION') return;

      // If SIGNED_IN fires before getSession resolves (e.g. on /auth/callback),
      // cancel the timeout and mark auth as resolved so it doesn't overwrite us.
      if (event === 'SIGNED_IN' && !authResolved) {
        authResolved = true;
        clearTimeout(authTimeout);
      }

      setSession(session);

      if (session?.user) {
        const user = {
          id: session.user.id,
          email: session.user.email,
          emailVerified: !!session.user.email_confirmed_at,
          displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
          provider: session.user.app_metadata?.provider || 'email'
        };

        setCurrentUser(user);
        setLoading(false); // Unblock UI immediately — profile fetch is non-blocking

        // Fetch full profile in the background (don't block loading state)
        fetchUserProfile(session.user.id).then(async profile => {
          if (profile) {
            setUserProfile({
              ...user,
              ...profile,
              displayName: profile.display_name || user.displayName,
              role: profile.role || 'customer'
            });
          } else {
            console.log('📝 Creating user profile for:', session.user.id);
            try {
              const createdProfile = await createUserProfile({
                id: session.user.id,
                email: session.user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                user_metadata: session.user.user_metadata
              });
              if (createdProfile) {
                const newProfile = await fetchUserProfile(session.user.id);
                if (newProfile) {
                  setUserProfile({
                    ...user,
                    ...newProfile,
                    displayName: newProfile.display_name || user.displayName,
                    role: newProfile.role || 'customer'
                  });
                } else {
                  setUserProfile(user);
                }
              } else {
                setUserProfile(user);
              }
            } catch (createError) {
              console.error('Error creating user profile:', createError);
              setUserProfile(user);
            }
          }
        }).catch(error => {
          console.error('Error fetching user profile:', error);
          setUserProfile(user);
        });
      } else {
        // Check localStorage for Yandex auth if Supabase session is cleared
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        if (token && userData) {
          const user = JSON.parse(userData);
          setCurrentUser(user);
          setUserProfile(user);
        } else {
          setCurrentUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    });
      subscription = data.subscription;
    }

    // Listen for auth state changes from external sources (like Yandex OAuth)
    const handleAuthStateChange = (event) => {
      const { user, token, action } = event.detail || {};
      
      if (action === 'login' && user && token) {
        console.log('🔍 AuthContext: Received login event from external source (Yandex)');
        setCurrentUser(user);
        setUserProfile(user);
        setLoading(false);
      } else if (action === 'logout') {
        console.log('🔍 AuthContext: Received logout event from external source');
        setCurrentUser(null);
        setUserProfile(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setLoading(false);
      }
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      clearTimeout(authTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, [fetchUserProfile, createUserProfile]);

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

      return data;
    } catch (error) {
      throw error;
    }
  }

  const DEMO_EMAIL = 'polskoydm@outlook.com';
  const DEMO_OTP = '123456';

  async function loginWithPassword(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }
      if (!data.session?.user) {
        throw new Error('Login failed');
      }
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      setSession(data.session);
      const user = {
        id: data.session.user.id,
        email: data.session.user.email,
        displayName: data.user?.displayName || data.session.user.user_metadata?.display_name ||
          data.session.user.user_metadata?.full_name ||
          data.session.user.email?.split('@')[0],
        emailVerified: !!data.session.user.email_confirmed_at,
      };
      setCurrentUser(user);
      let profile = await fetchUserProfile(data.session.user.id);
      if (!profile) {
        profile = data.user;
      }
      if (profile) {
        setUserProfile({
          ...user,
          ...profile,
          displayName: profile.display_name || user.displayName,
        });
      } else {
        setUserProfile(user);
      }
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { user: profile || user, action: 'login' },
      }));
      return { success: true, session: data.session };
    } catch (error) {
      throw error;
    }
  }

  async function login(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('🔐 Sending OTP code via Supabase to:', normalizedEmail);
      setOtpState({ status: 'sending' });
      setOtpEmail(normalizedEmail);

      // Demo account: skip Supabase OTP, pretend we sent it
      if (normalizedEmail === DEMO_EMAIL) {
        console.log('✅ Demo account: skipping OTP send');
        setOtpState({ status: 'sent', email: normalizedEmail });
        return { success: true, message: 'OTP code sent! Check your email for the 6-8 digit code.' };
      }

      // Send OTP via API (server-side) so it works even when client Supabase has issues
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMessage = data.error || 'Failed to send OTP code';
        setOtpState({ status: 'error', error: errorMessage });
        throw new Error(errorMessage);
      }

      console.log('✅ OTP code sent via API');
      setOtpState({ status: 'sent', email: normalizedEmail });
      return { success: true, message: 'OTP code sent! Check your email for the 6-8 digit code.' };
    } catch (error) {
      console.error('🔐 OTP send error:', error);
      setOtpState({ status: 'error', error: error.message });
      throw error;
    }
  }
  
  async function verifyOTP(email, code) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedCode = code.trim().replace(/\s/g, ''); // Remove any spaces

      console.log('🔐 Verifying OTP for email:', normalizedEmail, 'code length:', normalizedCode.length);
      setOtpState({ status: 'verifying' });

      // Demo account: sign in via API with fixed OTP
      if (normalizedEmail === DEMO_EMAIL && normalizedCode === DEMO_OTP) {
        const res = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, otp: normalizedCode }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.session) {
          const errMsg = json.error || 'Demo login failed';
          setOtpState({ status: 'error', error: errMsg });
          throw new Error(errMsg);
        }
        await supabase.auth.setSession({
          access_token: json.session.access_token,
          refresh_token: json.session.refresh_token,
        });
        const data = { session: json.session };
        setSession(data.session);
        const user = {
          id: data.session.user.id,
          email: data.session.user.email,
          displayName: data.session.user.user_metadata?.display_name ||
            data.session.user.user_metadata?.full_name ||
            data.session.user.email?.split('@')[0],
          emailVerified: !!data.session.user.email_confirmed_at,
        };
        setCurrentUser(user);
        let profile = await fetchUserProfile(data.session.user.id);
        if (!profile) {
          await createUserProfile({
            ...user,
            user_metadata: data.session.user.user_metadata,
          });
          profile = await fetchUserProfile(data.session.user.id);
        }
        if (profile) {
          setUserProfile({
            ...user,
            ...profile,
            displayName: profile.display_name || user.displayName,
          });
        }
        setOtpState({ status: 'idle' });
        setOtpEmail(null);
        window.dispatchEvent(new CustomEvent('authStateChanged', {
          detail: { user: profile || user, action: 'login' },
        }));
        console.log('✅ Demo account signed in successfully');
        return { success: true, session: data.session };
      }

      // Verify OTP via API first (OTP was sent via API; same server client avoids expired/invalid mismatch)
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, token: normalizedCode }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));

      if (verifyRes.ok && verifyData?.session?.user) {
        await supabase.auth.setSession({
          access_token: verifyData.session.access_token,
          refresh_token: verifyData.session.refresh_token,
        });
        const data = verifyData;
        setSession(data.session);
        const user = {
          id: data.session.user.id,
          email: data.session.user.email,
          displayName: data.session.user.user_metadata?.display_name ||
            data.session.user.user_metadata?.full_name ||
            data.session.user.email?.split('@')[0],
          emailVerified: !!data.session.user.email_confirmed_at,
        };
        setCurrentUser(user);
        let profile = await fetchUserProfile(data.session.user.id);
        if (!profile) {
          await createUserProfile({
            ...user,
            user_metadata: data.session.user.user_metadata,
          });
          profile = await fetchUserProfile(data.session.user.id);
        }
        if (profile) {
          setUserProfile({
            ...user,
            ...profile,
            displayName: profile.display_name || user.displayName,
          });
        }
        setOtpState({ status: 'idle' });
        setOtpEmail(null);
        console.log('✅ OTP verified via API');
        return { success: true, session: data.session };
      }

      // Fallback: verify on client (try all OTP types)
      const otpTypes = ['email', 'sms', 'signup', 'magiclink'];
      let data = null;
      let error = null;
      let successType = null;

      for (const otpType of otpTypes) {
        const result = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: normalizedCode,
          type: otpType,
        });

        if (!result.error && result.data?.session?.user) {
          data = result.data;
          error = null;
          successType = otpType;
          break;
        }
        error = result.error;
      }

      if (error || !data?.session?.user) {
        // Generic message (no "expired") so user is not confused when code is correct
        const errorMessage = 'Неверный код. Проверьте правильность ввода или запросите новый код.';
        setOtpState({ status: 'error', error: errorMessage });
        throw new Error(errorMessage);
      }

      setSession(data.session);
      const user = {
        id: data.session.user.id,
        email: data.session.user.email,
        displayName: data.session.user.user_metadata?.display_name ||
          data.session.user.user_metadata?.full_name ||
          data.session.user.email?.split('@')[0],
        emailVerified: !!data.session.user.email_confirmed_at,
      };
      setCurrentUser(user);

      let profile = await fetchUserProfile(data.session.user.id);
      if (!profile) {
        await createUserProfile({
          ...user,
          user_metadata: data.session.user.user_metadata,
        });
        profile = await fetchUserProfile(data.session.user.id);
      }
      
      if (profile) {
        setUserProfile({
          ...user,
          ...profile,
          displayName: profile.display_name || user.displayName,
        });
      }

      // Reset OTP state
      setOtpState({ status: 'idle' });
      setOtpEmail(null);

      // Dispatch auth state change event
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { user: profile || user, action: 'login' } 
      }));

      console.log('✅ OTP verified successfully, session created');
      return { success: true, session: data.session };
    } catch (error) {
      console.error('OTP verification error:', error);
      setOtpState({ status: 'error', error: error.message });
      throw error;
    }
  }
  
  function resetOTPState() {
    setOtpState({ status: 'idle' });
    setOtpEmail(null);
  }

  async function signupWithMagicLink(email, displayName, referralCode) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback?type=signup`,
          data: {
            display_name: displayName || email.split('@')[0],
            referral_code: referralCode || null
          }
        }
      });

      if (error) throw error;
      // Profile will be created when user clicks magic link (in callback)
      return { success: true, message: 'Magic link sent! Check your email.' };
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    // Clear state immediately (optimistic update)
    setCurrentUser(null);
    setUserProfile(null);
    setSession(null);
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('user');
    
    // Try to sign out from Supabase (non-blocking)
    supabase.auth.getSession().then(({ data: session }) => {
      if (session?.session) {
        supabase.auth.signOut().catch(() => {
          // Ignore errors - state is already cleared
        });
      }
    }).catch(() => {
      // Ignore errors - state is already cleared
    });
    
    // Dispatch event for other parts of the app
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { action: 'logout' } 
    }));
  }

  async function resetPassword(email) {
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, redirectTo }),
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

  async function loginWithGoogle() {
    try {
      // Fetch Google OAuth config from our API
      const configRes = await fetch('/api/config/auth-status');
      const config = await configRes.json();

      if (!config.googleAuthEnabled) {
        throw new Error('Google authentication is not enabled');
      }

      if (config.googleId) {
        // Preferred: direct redirect using admin_config credentials
        // This feeds into the manual code exchange flow at /auth/google/callback
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const scope = 'openid email profile';
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', config.googleId);
        googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', scope);
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent');

        window.location.href = googleAuthUrl.toString();
      } else {
        // Fallback: use Supabase's built-in Google OAuth provider
        // (credentials configured in Supabase Dashboard)
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });
        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  async function loginWithYandex() {
    try {
      // Yandex OAuth still uses custom flow for now
      const response = await fetch('/api/auth/yandex/auth-url');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get Yandex auth URL');
      }
    } catch (error) {
      console.error('Yandex login error:', error);
      throw error;
    }
  }

  async function verifyEmailWithCode(email, code) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: code,
        type: 'email'
      });

      if (error) throw error;

      return { success: true, message: 'Email verified successfully!' };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  async function resendVerificationEmail(email) {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async function updateProfile(updates) {
    try {
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: currentUser.id,
          ...updates 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed');
      }

      // Refresh user profile
      const profile = await fetchUserProfile(currentUser.id);
      if (profile) {
        setUserProfile({
          ...currentUser,
          ...profile,
          displayName: profile.display_name || currentUser.displayName
        });
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Function to reload user profile
  const loadUserProfile = useCallback(async () => {
    if (!currentUser?.id) return null;
    const profile = await fetchUserProfile(currentUser.id);
    if (profile) {
      setUserProfile({
        ...currentUser,
        ...profile,
        displayName: profile.display_name || currentUser.displayName,
        role: profile.role || 'customer'
      });
    }
    return profile;
  }, [currentUser, fetchUserProfile]);

  const value = {
    currentUser,
    userProfile,
    loading,
    session,
    signup,
    signupWithMagicLink,
    login,
    loginWithPassword,
    logout,
    resetPassword,
    loginWithGoogle,
    loginWithYandex,
    verifyEmailWithCode,
    resendVerificationEmail,
    updateProfile,
    loadUserProfile,
    // OTP functions
    otpState,
    otpEmail,
    verifyOTP,
    resetOTPState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
