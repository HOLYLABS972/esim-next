import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Resend verification link for signup (Supabase Auth)
 */
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in Supabase Auth
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw new Error('Failed to check user status');
    }

    const user = users?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email. Please register first.' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'This email is already verified. You can log in.' },
        { status: 400 }
      );
    }

    // Resend verification email - Supabase client signUp() will resend emails for existing unverified users
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://esim.globalbankaccounts.ru';
    
    // Use client-side signUp() - Supabase will resend verification email for existing unverified users
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
    );

    // Call signUp() again - Supabase will resend verification email if user is unverified
    // Note: password is required but won't change existing password for existing users
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email: normalizedEmail,
      password: 'temp_resend_' + Date.now(), // Temporary password (won't affect existing user)
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?type=signup`
      }
    });

    // signUp() returns success even if user already exists - it will resend verification email
    if (signUpError && !signUpError.message?.includes('already registered')) {
      console.error('❌ Error resending verification email:', signUpError);
      throw new Error(`Failed to resend verification email: ${signUpError.message}`);
    }

    // signUp() automatically sends verification email when Supabase SMTP is configured
    console.log(`✅ Verification email resent to ${normalizedEmail} via Supabase SMTP`);

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      emailSent: true,
      message: 'Verification email sent. Please check your inbox.'
    });

  } catch (error) {
    console.error('❌ Resend verification link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resend verification link' },
      { status: 500 }
    );
  }
}

