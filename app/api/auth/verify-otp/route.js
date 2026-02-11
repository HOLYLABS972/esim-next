import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Verify OTP server-side (same Supabase client as send-otp). Use this when OTP was sent via /api/auth/send-otp.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || typeof email !== 'string' || !token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedToken = String(token).trim().replace(/\s/g, '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Try types in order (email OTP uses type 'email' per Supabase docs)
    const types = ['email', 'signup', 'magiclink'];
    let session = null;
    let lastError = null;

    for (const type of types) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedToken,
        type,
      });

      if (!error && data?.session?.user) {
        session = data.session;
        break;
      }
      lastError = error;
    }

    if (!session) {
      const msg = lastError?.message || 'Invalid or expired code';
      return NextResponse.json(
        { error: msg },
        { status: 401 }
      );
    }

    return NextResponse.json({
      session,
      user: session.user,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
