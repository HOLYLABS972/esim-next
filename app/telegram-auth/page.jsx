'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import toast from 'react-hot-toast';

export default function TelegramAuthPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // email | otp | done
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const [returnUrl, setReturnUrl] = useState('/');

  // Read returnUrl from window.location on mount (useSearchParams can be empty on first render)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ru = params.get('returnUrl');
      if (ru) setReturnUrl(ru);
    }
  }, []);

  // If already logged in, redirect back (wait for returnUrl to resolve from window.location)
  const [returnUrlReady, setReturnUrlReady] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') setReturnUrlReady(true);
  }, [returnUrl]);
  useEffect(() => {
    if (currentUser && returnUrlReady) {
      window.location.href = returnUrl;
    }
  }, [currentUser, returnUrl, returnUrlReady]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || loading) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Неверный формат email');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка отправки кода');
      }

      setStep('otp');
      setCountdown(60);
      toast.success('Код отправлен на ' + email);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), token: otp.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Неверный код');
      }

      // Set Supabase session
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setStep('done');
      toast.success('Вы вошли!');
      
      // Redirect back (use window.location for reliable query param handling)
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCountdown(60);
      toast.success('Код отправлен повторно');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">🌍 Глобалбанка</h1>
          <p className="text-gray-400 mt-2">Введите email для входа</p>
          
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Электронная почта</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                {loading ? 'Отправка...' : 'Получить код'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-400 text-center">
                Код отправлен на <span className="text-white">{email}</span>
              </p>
              <div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                {loading ? 'Проверка...' : 'Подтвердить'}
              </button>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); }}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  ← Другой email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition-colors"
                >
                  {countdown > 0 ? `Повторить (${countdown}с)` : 'Отправить снова'}
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-white font-medium">Вы вошли!</p>
              <p className="text-sm text-gray-400 mt-1">Перенаправление...</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-400 text-xs">
            📧 На этот email будет доставлена eSIM после оплаты
          </p>
          <p className="text-gray-500 text-xs">
            Если письмо не пришло — проверьте папку «Спам»
          </p>
        </div>
      </div>
    </div>
  );
}
