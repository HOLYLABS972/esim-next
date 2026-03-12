'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // email | otp | loading
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setStep('loading');
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });
      if (otpError) throw otpError;
      setMessage('Check your email for the login code');
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send code');
      setStep('email');
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return;
    setError('');
    setStep('loading');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      if (verifyError) throw verifyError;
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid code');
      setStep('otp');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <img src="/images/logo_icon/logo2.png" alt="RoamJet" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Sign in to RoamJet</h1>
          <p className="text-gray-500 mt-2">Enter your email to receive a login code</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && step === 'otp' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            {message}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={sendOtp}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              type="submit"
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Send Login Code
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter code from email</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              type="submit"
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Verify & Sign In
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError(''); }}
              className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm py-2"
            >
              ← Use a different email
            </button>
          </form>
        )}

        {step === 'loading' && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-500"></div>
          </div>
        )}
      </div>
    </div>
  );
}
