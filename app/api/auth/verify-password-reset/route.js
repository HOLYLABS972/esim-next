import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: 'Email, token, and new password are required' },
        { status: 400 }
      );
    }

    const result = await authService.verifyPasswordResetToken(email, token, newPassword);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Verify password reset token API error:', error);
    return NextResponse.json(
      { error: error.message || 'Password reset verification failed' },
      { status: 500 }
    );
  }
}
