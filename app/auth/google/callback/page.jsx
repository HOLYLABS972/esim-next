'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../src/lib/supabase';
import { useAuth } from '../../../../src/contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

function GoogleCallbackContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          console.error('Google OAuth error:', error);
          setError('Authentication failed. Please try again.');
          setIsLoading(false);
          return;
        }

        if (!code) {
          setError('No authorization code received from Google.');
          setIsLoading(false);
          return;
        }

        // Exchange code for tokens
        const response = await fetch('/api/auth/google/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange code for tokens');
        }

        const data = await response.json();
        
        if (data.user) {
          // Establish a real Supabase session using the server-generated token
          if (data.token_hash && supabase) {
            try {
              const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: data.token_hash,
                type: 'magiclink',
              });
              if (verifyError) {
                console.warn('⚠️ Could not establish Supabase session:', verifyError.message);
              } else {
                console.log('✅ Supabase session established for Google user');
              }
            } catch (sessionErr) {
              console.warn('⚠️ Session establishment failed:', sessionErr.message);
            }
          }

          // Store user data in localStorage (aligned keys for AuthContext fallback)
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('userData', JSON.stringify(data.user));
          localStorage.setItem('authToken', 'google-oauth');

          // Notify AuthContext about the login
          window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { user: data.user, token: 'google-oauth', action: 'login' }
          }));

          toast.success(`Welcome, ${data.user.name || data.user.email}!`);

          // Preserve current language preference
          const currentLanguage = localStorage.getItem('roamjet-language') || 'en';
          localStorage.setItem('roamjet-language', currentLanguage);

          // Check for return URL (query param or stored before OAuth redirect, e.g. from /config)
          const returnUrl = searchParams.get('returnUrl') || (typeof window !== 'undefined' ? sessionStorage.getItem('loginReturnUrl') : null);
          if (returnUrl) {
            if (typeof window !== 'undefined') sessionStorage.removeItem('loginReturnUrl');
            router.push(decodeURIComponent(returnUrl));
          } else {
            // Default redirect to homepage with correct language
            const redirectPath = currentLanguage === 'en' ? '/' : `/${currentLanguage}/`;
            router.push(redirectPath);
          }
        } else {
          throw new Error('No user data received');
        }

      } catch (error) {
        console.error('Google callback error:', error);
        setError(error.message || 'Authentication failed. Please try again.');
        setIsLoading(false);
      }
    };

    handleGoogleCallback();
  }, [searchParams, router, login]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completing Google Sign-In...
          </h2>
          <p className="text-gray-600">
            Please wait while we finish setting up your account.
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading...
        </h2>
        <p className="text-gray-600">
          Please wait while we process your request.
        </p>
      </motion.div>
    </div>
  );
}

// Main component with Suspense boundary
export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
