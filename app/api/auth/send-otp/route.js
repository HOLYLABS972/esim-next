import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Send OTP to email (server-side). Use this when client-side signInWithOtp fails or is not available.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Send OTP: Supabase URL or anon key not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('Send OTP error:', error);
      let message = error.message;
      if (error.message?.includes('after') && error.message?.includes('seconds')) {
        const seconds = error.message.match(/(\d+)\s*seconds/)?.[1] || '30';
        message = `Wait ${seconds} seconds before requesting a new code`;
      }
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Send OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
