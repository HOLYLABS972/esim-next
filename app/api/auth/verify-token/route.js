import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = await authService.verifyAuthToken(token);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Verify token API error:', error);
    return NextResponse.json(
      { error: error.message || 'Token verification failed' },
      { status: 500 }
    );
  }
}
