"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { detectLanguageFromPath } from '../utils/languageUtils';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState(null); // null: show buttons, 'email': show email form, 'google'|'yandex': processing
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [yandexAuthEnabled, setYandexAuthEnabled] = useState(false);
  const [yandexAppId, setYandexAppId] = useState('');
  const { loginWithPassword, loginWithGoogle } = useAuth();
  const { t, locale } = useI18n();

  // Hardcoded by domain: globalbanka.roamjet.net = Yandex + Email, others = Google + Email
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isGlobalBanka = hostname === 'globalbanka.roamjet.net';
  const showEmail = true;
  const showGoogle = !isGlobalBanka && googleAuthEnabled;
  const showYandex = isGlobalBanka && yandexAuthEnabled;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();


  // Fetch auth status on mount
  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        const response = await fetch('/api/config/auth-status');
        const data = await response.json();
        if (data.success) {
          setGoogleAuthEnabled(data.googleAuthEnabled);
          setYandexAuthEnabled(data.yandexAuthEnabled);
          setYandexAppId(data.yandexAppId);
        }
      } catch (error) {
        console.error('❌ Error fetching auth status:', error);
      }
    };
    
    fetchAuthStatus();
  }, []);

  // Get current language for localized URLs
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('roamjet-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();

  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('auth.login.fillFields', 'Please enter your email and password'));
      return;
    }
    try {
      setLoading(true);
      await loginWithPassword(email, password);
      toast.success('Login successful! Redirecting...');
      const returnUrl = searchParams.get('returnUrl');
      const redirectTo = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
      setTimeout(() => router.push(redirectTo), 500);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailMethodClick = () => setLoginMethod('email');
  const handleBackToMethods = () => {
    setLoginMethod(null);
    setEmail('');
    setPassword('');
  };



  const handleCredentialResponse = useCallback(async (response) => {
    setLoading(true);
    
    try {
      // Send the credential directly to our API
      const apiResponse = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      // Establish a real Supabase session using the server-generated token
      if (data.token_hash && supabase) {
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: 'magiclink',
          });
          if (verifyError) {
            console.warn('⚠️ Could not establish Supabase session (One Tap):', verifyError.message);
          } else {
            console.log('✅ Supabase session established for Google One Tap user');
          }
        } catch (sessionErr) {
          console.warn('⚠️ Session establishment failed (One Tap):', sessionErr.message);
        }
      }

      // Store auth data in localStorage (aligned keys for AuthContext fallback)
      localStorage.setItem('authToken', 'google-oauth');
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.setItem('user', JSON.stringify(data.user));

      // Trigger auth state change event for AuthContext
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { user: data.user, token: 'google-oauth', action: 'login' }
      }));
      
      toast.success(t('auth.login.googleSignInSuccess', 'Successfully signed in with Google'));
      
      // Check for return URL parameter
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(decodeURIComponent(returnUrl));
      } else {
        // Default redirect to homepage with correct language (to continue purchase)
        const redirectPath = currentLanguage === 'en' ? '/' : `/${currentLanguage}/`;
        router.push(redirectPath);
      }
      
    } catch (err) {
      console.error('Google sign-in error:', err);
      toast.error(err.message || t('auth.login.googleSignInFailed', 'Failed to sign in with Google'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  const initializeYandexLogin = useCallback(() => {
    // Only use Supabase value, no env var fallback
    const appId = yandexAppId;
    
    if (!appId) {
      console.error('Yandex App ID not configured in admin config');
      return;
    }

    console.log('🔍 Initializing Yandex login...');
    console.log('🔍 YaSendSuggestToken available:', !!window.YaSendSuggestToken);

    // Initialize Yandex Passport SDK
    if (window.YaSendSuggestToken) {
      try {
        // Use exact redirect URI that matches Yandex configuration
        // Must match exactly: https://globalbanka.roamjet.net/auth/yandex/callback
        const redirectUri = 'https://globalbanka.roamjet.net/auth/yandex/callback';
        
        window.YaSendSuggestToken('https://globalbanka.roamjet.net/login', {
          client_id: appId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: 'login:email login:info',
          popup: true,
          onSuccess: (data) => {
            console.log('Yandex authentication success:', data);
            // Handle successful authentication
            const user = {
              id: data.id,
              name: data.display_name || data.real_name || data.login,
              email: data.default_email,
              picture: data.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200` : null,
              provider: 'yandex'
            };
            
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('authToken', 'yandex-token');
            
            toast.success(t('auth.login.yandexSignInSuccess', 'Successfully signed in with Yandex'));
            router.push('/dashboard');
          },
          onError: (error) => {
            console.error('Yandex authentication error:', error);
            toast.error(t('auth.login.yandexSignInFailed', 'Failed to sign in with Yandex'));
          }
        });
        console.log('🔍 Yandex SDK initialized successfully');
      } catch (error) {
        console.error('Error initializing Yandex SDK:', error);
        // Fallback to custom button
        createFallbackButton();
      }
    } else {
      console.error('YaSendSuggestToken not available, creating fallback button');
      // Fallback to custom button
      createFallbackButton();
    }
  }, [router, t, yandexAppId]);

  const createFallbackButton = useCallback(() => {
    const buttonContainer = document.getElementById('yandex-login-button');
    if (buttonContainer) {
      buttonContainer.innerHTML = `
        <button
          type="button"
          class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          onclick="window.handleYandexLoginFallback && window.handleYandexLoginFallback()"
        >
          <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#FF0000"/>
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#FF0000"/>
            <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">Я</text>
          </svg>
          Sign in with Yandex
        </button>
      `;
    }
  }, []);

  const handleYandexLoginFallback = useCallback(() => {
    // Only use Supabase value, no env var fallback
    // Trim whitespace and check if it's a valid non-empty string
    const appId = yandexAppId?.trim();
    // Use exact redirect URI that matches Yandex configuration
    // Must match exactly: https://globalbanka.roamjet.net/auth/yandex/callback
    const redirectUri = 'https://globalbanka.roamjet.net/auth/yandex/callback';
    
    console.log('🔍 Yandex login clicked:', {
      hasYandexAppId: !!yandexAppId,
      yandexAppIdRaw: yandexAppId,
      yandexAppIdLength: yandexAppId?.length || 0,
      yandexAppIdTrimmed: appId,
      appIdLength: appId?.length || 0,
      yandexAuthEnabled
    });
    
    if (!appId || appId.length === 0) {
      console.error('❌ Yandex App ID not configured:', {
        yandexAppId,
        appId,
        yandexAuthEnabled,
        type: typeof yandexAppId
      });
      // Try to reload auth status in case it wasn't loaded yet
      fetch('/api/config/auth-status')
        .then(res => res.json())
        .then(data => {
          console.log('🔄 Reloaded auth status:', {
            yandexAppId: data.yandexAppId ? `${data.yandexAppId.substring(0, 10)}...` : 'empty',
            yandexAppIdLength: data.yandexAppId?.length || 0
          });
          if (data.yandexAppId) {
            setYandexAppId(data.yandexAppId);
            toast.success('Yandex App ID loaded. Please try again.');
          } else {
            toast.error('Yandex App ID not found in admin config. Please check the admin config and save.');
          }
        })
        .catch(err => {
          console.error('Error reloading auth status:', err);
          toast.error('Yandex App ID not configured. Please add it in the admin config and save.');
        });
      return;
    }

    // Open Yandex OAuth in popup
    const popup = window.open(
      `https://oauth.yandex.ru/authorize?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      'yandex-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for messages from popup
    const messageListener = (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'YANDEX_AUTH_SUCCESS') {
        const { user, token } = event.data;
        
        console.log('🔍 Received Yandex auth success message:', { user, token });
        
        // Store auth data in localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        
        // Preserve current language preference (use component-level currentLanguage)
        localStorage.setItem('roamjet-language', currentLanguage);
        
        // Trigger custom event to notify AuthContext of login
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
          detail: { user, token, action: 'login' } 
        }));
        
        toast.success(t('auth.login.yandexSignInSuccess', 'Successfully signed in with Yandex'));
        
        // Close popup first
        if (popup && !popup.closed) {
          popup.close();
        }
        
        // Remove listener
        window.removeEventListener('message', messageListener);
        
        // Small delay to ensure popup closes before redirect
        setTimeout(() => {
          console.log('🔍 Redirecting after Yandex login...');
          console.log('🔍 Current URL:', window.location.href);
          console.log('🔍 Search params:', new URLSearchParams(window.location.search));
          console.log('🔍 Preserved language:', currentLanguage);
          
          // Check for return URL parameter
          const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
          if (returnUrl) {
            router.push(decodeURIComponent(returnUrl));
          } else {
            // Default redirect to homepage with correct language (to continue purchase)
            const redirectPath = currentLanguage === 'en' ? '/' : `/${currentLanguage}/`;
            router.push(redirectPath);
          }
        }, 100);
      } else if (event.data.type === 'YANDEX_AUTH_ERROR') {
        const { error } = event.data;
        console.error('Yandex authentication error from popup:', error);
        toast.error(t('auth.login.yandexSignInFailed', 'Failed to sign in with Yandex'));
        
        popup.close();
        window.removeEventListener('message', messageListener);
      }
    };

    window.addEventListener('message', messageListener);

    // Cleanup if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
      }
    }, 1000);
  }, [router, t, yandexAppId, currentLanguage]);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('loginReturnUrl', returnUrl);
        } catch (e) {}
      }
      await loginWithGoogle();
      // loginWithGoogle will redirect to /auth/google, which handles the callback
    } catch (error) {
      console.error('Google login error:', error);
      toast.error(error.message || t('auth.login.googleSignInFailed', 'Failed to sign in with Google'));
      setLoading(false);
    }
  }, [loginWithGoogle, searchParams, t]);

  // Removed complex SDK initialization - using simple button approach


  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900 transition-colors">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-4 lg:px-16 xl:px-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {t('auth.login.title', 'Sign in to your account')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                {t('auth.login.subtitle', 'Sign in with your account')}
              </p>
            </div>
          
            {loginMethod === null ? (
              // Show enabled buttons: Google, Yandex, Email (filtered by site config)
              <div className="space-y-4">
                {showGoogle && (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {/* Google Logo */}
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('auth.login.signInWithGoogle', 'Sign in with Google')}
              </button>
                )}

                {showYandex && (
              <button
                type="button"
                onClick={handleYandexLoginFallback}
                disabled={loading || !yandexAppId}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 transition-colors min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Yandex Logo */}
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#FF0000"/>
                  <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#FF0000"/>
                  <text x="12" y="16" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">Я</text>
                </svg>
                {t('auth.login.signInWithYandex', 'Sign in with Yandex')}
              </button>
                )}

                {showEmail && (
              <button
                type="button"
                onClick={handleEmailMethodClick}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors min-h-[52px]"
              >
                <Mail className="w-5 h-5 mr-3 text-gray-700 dark:text-gray-300" />
                {t('auth.login.signInWithEmail', 'Sign in with Email & Password')}
              </button>
                )}

                {!showGoogle && !showYandex && !showEmail && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {t('auth.login.noMethods', 'No login methods are enabled for this site. Please contact support.')}
                  </p>
                )}

                <p className="text-center text-sm text-gray-600 dark:text-gray-400 pt-2">
                  {t('auth.login.noAccount', "Don't have an account?")}{' '}
                  <Link href="/signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                    {t('auth.login.signUp', 'Sign up')}
                  </Link>
                </p>
            </div>
          ) : loginMethod === 'email' ? (
            <form className="space-y-6" onSubmit={handleEmailPasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="form-label">
                    {t('auth.login.emailLabel', 'Email address')}
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-12"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="form-label">
                    {t('auth.login.passwordLabel', 'Password')}
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-12"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  {t('auth.login.forgotPassword', 'Forgot password?')}
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                ) : (
                  t('auth.login.signIn', 'Sign in')
                )}
              </button>
              
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={handleBackToMethods}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                >
                  {t('auth.login.back', 'Back')}
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.login.noAccount', "Don't have an account?")}{' '}
                  <Link href="/signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                    {t('auth.login.signUp', 'Sign up')}
                  </Link>
                </p>
              </div>
            </form>
          ) : null}
          </div>
        </motion.div>
      </div>

      {/* Right side - Image/Branding */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0">
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src="/images/logo_icon/vwvw.avif"
            alt="Travel background"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;