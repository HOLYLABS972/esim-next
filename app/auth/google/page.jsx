'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../src/lib/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

function GoogleOAuthContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleGoogleOAuth = async () => {
      try {
        // Log the full URL to debug
        console.log('🔍 Google OAuth callback URL:', window.location.href);
        console.log('🔍 Hash:', window.location.hash);
        console.log('🔍 Search:', window.location.search);
        
        // First, check if a session already exists (e.g. user navigated here manually)
        let existingSession = null;
        try {
          const result = await supabase.auth.getSession();
          existingSession = result.data?.session;
        } catch (e) {
          console.warn('⚠️ getSession() failed, continuing with token processing:', e.message);
        }

        if (existingSession?.user) {
          console.log('✅ Supabase session already exists, user is logged in');
          const user = existingSession.user;
          
          // Check if user profile exists, create if not
          const { data: existingProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!existingProfile) {
            // Create user profile
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
                full_name: user.user_metadata?.full_name || user.user_metadata?.name,
                role: 'customer',
                email_verified: !!user.email_confirmed_at,
                is_active: true,
                provider: 'google',
                avatar: user.user_metadata?.avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('Error creating user profile:', profileError);
            }
          }

          toast.success(`Welcome, ${user.user_metadata?.full_name || user.email}!`);
          
          // Preserve current language preference
          const currentLanguage = localStorage.getItem('roamjet-language') || 'en';
          localStorage.setItem('roamjet-language', currentLanguage);

          // Redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
          return;
        }
        
        // Supabase OAuth can return code in hash (#) or query params (?)
        // Check hash first (most common for OAuth)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const codeFromHash = hashParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorFromHash = hashParams.get('error');
        const errorDescriptionFromHash = hashParams.get('error_description');
        
        // Check query params as fallback
        const codeFromQuery = searchParams.get('code');
        const errorFromQuery = searchParams.get('error');
        const errorDescriptionFromQuery = searchParams.get('error_description');
        
        console.log('🔍 Code from hash:', codeFromHash);
        console.log('🔍 Code from query:', codeFromQuery);
        console.log('🔍 Access token:', accessToken ? 'present' : 'missing');
        console.log('🔍 Refresh token:', refreshToken ? 'present' : 'missing');
        
        // Use hash values if available, otherwise use query params
        const code = codeFromHash || codeFromQuery;
        const errorParam = errorFromHash || errorFromQuery;
        const errorDescription = errorDescriptionFromHash || errorDescriptionFromQuery;

        if (errorParam) {
          console.error('Google OAuth error:', errorParam, errorDescription);
          setError(errorDescription || 'Google authentication failed. Please try again.');
          setIsLoading(false);
          return;
        }

        // If we have tokens directly in hash, use them
        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            throw sessionError;
          }

          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error('No user data received');
          }

          // Check if user profile exists, create if not
          const { data: existingProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!existingProfile) {
            // Create user profile
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
                full_name: user.user_metadata?.full_name || user.user_metadata?.name,
                role: 'customer',
                email_verified: !!user.email_confirmed_at,
                is_active: true,
                provider: 'google',
                avatar: user.user_metadata?.avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('Error creating user profile:', profileError);
              // Don't fail the flow if profile creation fails
            }
          }

          // Trigger auth state change event
          window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { 
              user: user, 
              action: 'login' 
            } 
          }));

          toast.success(`Welcome, ${user.user_metadata?.full_name || user.email}!`);
          
          // Preserve current language preference
          const currentLanguage = localStorage.getItem('roamjet-language') || 'en';
          localStorage.setItem('roamjet-language', currentLanguage);

          // Check for return URL parameter
          const returnUrl = searchParams.get('returnUrl');
          const redirectPath = returnUrl 
            ? decodeURIComponent(returnUrl)
            : (currentLanguage === 'en' ? '/' : `/${currentLanguage}/`);

          // Redirect to homepage (to continue purchase) or returnUrl
          setTimeout(() => {
            router.push(redirectPath);
          }, 1500);
          
          return;
        }

        // If we have a code, exchange it for session
        if (!code) {
          // Check if user is already logged in (maybe they navigated here manually)
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession?.user) {
            console.log('✅ User already has a session, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }
          
          // If no code/tokens and no existing session, this is likely a manual navigation
          // or the OAuth flow didn't complete properly
          console.error('❌ No code or tokens found in URL');
          console.error('❌ Full URL:', window.location.href);
          console.error('❌ This might be a manual navigation or incomplete OAuth flow');
          setError('No authorization code received from Google. Please try logging in again from the login page.');
          setIsLoading(false);
          return;
        }

        // Exchange code for session using Supabase
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Error exchanging code for session:', exchangeError);
          throw exchangeError;
        }

        if (data.user) {
          // Check if user profile exists, create if not
          const { data: existingProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!existingProfile) {
            // Create user profile
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email,
                display_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
                full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
                role: 'customer',
                email_verified: !!data.user.email_confirmed_at,
                is_active: true,
                provider: 'google',
                avatar: data.user.user_metadata?.avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('Error creating user profile:', profileError);
              // Don't fail the flow if profile creation fails
            }
          }

          // Trigger auth state change event
          window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { 
              user: data.user, 
              action: 'login' 
            } 
          }));

          toast.success(`Welcome, ${data.user.user_metadata?.full_name || data.user.email}!`);
          
          // Preserve current language preference
          const currentLanguage = localStorage.getItem('roamjet-language') || 'en';
          localStorage.setItem('roamjet-language', currentLanguage);

          // Redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          throw new Error('No user data received');
        }

      } catch (error) {
        console.error('Google OAuth callback error:', error);
        setError(error.message || 'Google authentication failed. Please try again.');
        setIsLoading(false);
      }
    };

    handleGoogleOAuth();
  }, [router, searchParams]);

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
export default function GoogleOAuthPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GoogleOAuthContent />
    </Suspense>
  );
}
