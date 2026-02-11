import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user email from Supabase
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .limit(1)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Send password reset link instead of setting password directly
    const result = await authService.requestPasswordReset(user.email);
    
    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email. Please check your inbox to set a new password.'
    });
  } catch (error) {
    console.error('Set password API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send password reset link' },
      { status: 500 }
    );
  }
}

