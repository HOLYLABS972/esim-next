import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'User ID, current password, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const result = await authService.changePassword(userId, currentPassword, newPassword);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Change password API error:', error);
    return NextResponse.json(
      { error: error.message || 'Password change failed' },
      { status: 500 }
    );
  }
}
