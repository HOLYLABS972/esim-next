'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../src/lib/supabase';

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const [errorMessage, setErrorMessage] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution in React strict mode
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      console.log('🔐 Auth callback started');
      console.log('🔐 Full URL:', window.location.href);
      console.log('🔐 Hash:', window.location.hash);
      console.log('🔐 Search params:', window.location.search);

      // Check for error in URL
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      if (error) {
        console.error('❌ Auth error from URL:', error, errorDescription);
        setErrorMessage(errorDescription || error);
        setTimeout(() => {
          window.location.href = '/login?error=' + encodeURIComponent(errorDescription || error);
        }, 2000);
        return;
      }

      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        setErrorMessage('Authentication service unavailable');
        setTimeout(() => {
          window.location.href = '/login?error=supabase_unavailable';
        }, 2000);
        return;
      }

      // Helper function to update profile and redirect
      const completeAuth = async (session) => {
        console.log('✅ Session established for:', session.user.email);

        // Update user profile in background (don't wait)
        fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            display_name: session.user.user_metadata?.display_name ||
                          session.user.user_metadata?.full_name ||
                          session.user.email?.split('@')[0],
            email_verified: !!session.user.email_confirmed_at
          }),
        }).catch(err => console.error('Profile update error:', err));

        setStatus('Success! Redirecting...');
        window.location.href = '/dashboard';
      };

      // Handle both PKCE (token_hash in query) and hash fragments
      let token_hash = searchParams.get('token_hash');
      let type = searchParams.get('type') || 'magiclink';

      // Fallback: Check hash fragments if no token_hash in query params
      if (!token_hash && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        token_hash = hashParams.get('access_token') ? null : hashParams.get('token_hash');
        type = hashParams.get('type') || type;
      }

      // If we have token_hash, verify it
      if (token_hash) {
        console.log('🔐 Verifying token_hash (PKCE)...');
        setStatus('Verifying link...');

        try {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type === 'signup' ? 'signup' : type === 'recovery' ? 'recovery' : 'magiclink'
          });

          if (verifyError) {
            console.error('❌ OTP verification error:', verifyError);
            setErrorMessage(verifyError.message);
            setTimeout(() => {
              window.location.href = '/login?error=' + encodeURIComponent(verifyError.message);
            }, 2000);
            return;
          }

          if (data?.session) {
            await completeAuth(data.session);
            return;
          }
        } catch (err) {
          console.error('❌ Exception verifying OTP:', err);
        }
      }

      // Handle hash fragment tokens (OAuth implicit flow — access_token + refresh_token in hash)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('🔐 Setting session from hash tokens...');
          setStatus('Establishing session...');

          // Fire setSession — don't await it because it can hang due to Supabase
          // internal lock contention with onAuthStateChange. The SIGNED_IN event
          // fires as a side-effect and stores the session in localStorage, so
          // AuthContext will pick it up on the next page load.
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }).then(({ data, error: setErr }) => {
            if (setErr) console.error('❌ setSession error:', setErr);
            else if (data?.session) console.log('✅ setSession completed for:', data.session.user?.email);
          }).catch(err => console.warn('⚠️ setSession failed:', err.message));

          // Give SIGNED_IN a moment to fire and store the session, then redirect.
          // This is fast — SIGNED_IN fires synchronously as a side-effect of setSession.
          await new Promise(resolve => setTimeout(resolve, 500));

          setStatus('Success! Redirecting...');
          window.location.href = '/dashboard';
          return;
        }
      }

      // Fallback: check if session already exists (e.g. page reload)
      {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await completeAuth(session);
          return;
        }
      }

      // Failed
      setErrorMessage('Authentication failed. The link may have expired or already been used.');
      setTimeout(() => {
        window.location.href = '/login?error=auth_failed';
      }, 2000);
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors">
      <div className="text-center max-w-md px-4">
        {errorMessage ? (
          <>
            <div className="text-red-500 dark:text-red-400 text-4xl mb-4">✕</div>
            <p className="text-gray-900 dark:text-white text-lg mb-2">Authentication Failed</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{errorMessage}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-900 dark:text-white">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
