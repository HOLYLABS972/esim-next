import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, password, displayName, referralCode } = await request.json();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Email, password, and display name are required' },
        { status: 400 }
      );
    }

    const result = await authService.signup(email, password, displayName, referralCode);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Signup failed' },
      { status: 500 }
    );
  }
}
