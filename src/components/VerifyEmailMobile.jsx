"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

const VerifyEmailMobile = () => {
  const [email, setEmail] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get email from URL params and verify immediately
    const emailParam = searchParams.get('email');
    
    if (emailParam) {
      const decodedEmail = decodeURIComponent(emailParam);
      setEmail(decodedEmail);
      
      console.log('🔍 Starting verification for:', decodedEmail);
      console.log('🔄 Creating user account from email link...');
      
      // Create user from pending signup when email link is clicked
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
        console.log('📡 Check verification response status:', res.status);
        return res.json();
      })
      .then((verifyData) => {
        console.log('📦 Verification data:', verifyData);
        
        if (verifyData.verified && verifyData.token && verifyData.user) {
          localStorage.setItem('authToken', verifyData.token);
          localStorage.setItem('userData', JSON.stringify(verifyData.user));
          console.log('✅ User verified and data saved to localStorage');
        } else {
          console.log('ℹ️ Email link clicked, user will be created when they use the app');
        }
        
        localStorage.removeItem('pendingEmailVerification');
        if (typeof window !== 'undefined') {
          localStorage.setItem('roamjet-language', 'en');
        }
        console.log('✅ Email verification process complete!');
      })
      .catch(err => {
        console.error('❌ Verification error:', err);
        // Still remove pending verification even on error
        localStorage.removeItem('pendingEmailVerification');
        console.log('ℹ️ Email link clicked, verification will be handled by the app');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Always show success screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-20 w-20 text-green-500" />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Email Verified
          </h2>
          <p className="text-lg text-gray-600">
            You can now return to the mobile app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailMobile;
