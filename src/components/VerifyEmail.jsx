"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

const VerifyEmail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    // Get email from URL params
    const emailParam = searchParams.get('email');
    
    // Verify via email link
    if (emailParam) {
      const decodedEmail = decodeURIComponent(emailParam);
      
      console.log('🔍 Starting verification for:', decodedEmail);
      console.log('🔄 Creating account from email link click...');
      
      // Call verify-email-link endpoint to create account from pending signup
      fetch('/api/auth/verify-email-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: decodedEmail.toLowerCase().trim(),
        }),
      })
      .then(res => {
        console.log('📡 Response status:', res.status);
        return res.json();
      })
      .then(verifyData => {
        console.log('📦 Verification data:', verifyData);
        
        if (verifyData.verified && verifyData.token && verifyData.user) {
          // Save auth data to localStorage
          localStorage.setItem('authToken', verifyData.token);
          localStorage.setItem('userData', JSON.stringify(verifyData.user));
          
          // Trigger auth state change event for AuthContext
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('authStateChanged', { 
              detail: { 
                action: 'login',
                user: verifyData.user,
                token: verifyData.token
              } 
            }));
          }
          
          console.log('✅ User account created and logged in!');
          console.log('✅ User data:', verifyData.user);
          
          // Clear any pending verification data
        localStorage.removeItem('pendingEmailVerification');
          localStorage.removeItem('pendingSignup');
          
        if (typeof window !== 'undefined') {
          localStorage.setItem('roamjet-language', 'en');
        }
          
          // Show success message
          setStatus('success');
          setMessage('Email verified! Your account has been created. Redirecting to dashboard...');
        
          // Redirect to dashboard after successful login
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        } else {
          console.error('❌ Verification failed:', verifyData.error || verifyData.message);
          setStatus('error');
          setMessage(verifyData.error || verifyData.message || 'Verification failed. Please try again.');
          // Redirect to login after showing error
          setTimeout(() => {
            router.push('/login?error=verification_failed');
          }, 3000);
        }
      })
      .catch(err => {
        console.error('❌ Verification error:', err);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
        localStorage.removeItem('pendingEmailVerification');
        localStorage.removeItem('pendingSignup');
        // Redirect to login on error
        setTimeout(() => {
          router.push('/login?error=verification_error');
        }, 3000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          {status === 'verifying' && (
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
          )}
          {status === 'success' && (
          <CheckCircle className="h-16 w-16 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="h-16 w-16 text-red-500" />
          )}
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h2>
          <p className="text-sm text-gray-600">
            {message}
          </p>
          {status === 'success' && (
            <p className="text-xs text-gray-500 mt-4">
              You are now logged in to your account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

