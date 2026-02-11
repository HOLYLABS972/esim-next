import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, redirectTo } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Use client origin so reset link works on correct domain (e.g. globalbanka.roamjet.net)
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const baseUrl = redirectTo || (host ? `${protocol}://${host.split(',')[0].trim()}` : process.env.NEXT_PUBLIC_BASE_URL);

    const result = await authService.requestPasswordReset(email, baseUrl ? baseUrl.replace(/\/$/, '') : undefined);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: error.message || 'Password reset failed' },
      { status: 500 }
    );
  }
}
