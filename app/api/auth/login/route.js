import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('🔐 Login request body:', { email: body.email, hasPassword: !!body.password });
    
    const { email, password } = body;

    if (!email || !password) {
      console.log('❌ Missing email or password:', { email: !!email, password: !!password });
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      console.log('❌ Invalid email or password type:', { emailType: typeof email, passwordType: typeof password });
      return NextResponse.json(
        { error: 'Email and password must be strings' },
        { status: 400 }
      );
    }

    const result = await authService.login(email, password);
    
    if (!result.success) {
      console.log('❌ Login failed:', result.error);
      return NextResponse.json(
        { error: result.error, requiresVerification: result.requiresVerification },
        { status: 401 }
      );
    }

    console.log('✅ Login successful for:', email);
    
    return NextResponse.json({
      success: true,
      user: result.user,
      session: result.session
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
