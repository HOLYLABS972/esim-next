import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { userId, ...updates } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await authService.updateProfile(userId, updates);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: error.message || 'Profile update failed' },
      { status: 500 }
    );
  }
}
