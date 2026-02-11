import { NextResponse } from 'next/server';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

const DEMO_EMAIL = 'polskoydm@outlook.com';
const DEMO_OTP = '123456';
const DEMO_ACCOUNT_PASSWORD = '123456';
const DEMO_OTP_ALT = '12345678';
const DEMO_EMAIL_ALIASES = ['polskoydm@outlook.com', 'polskoydm@outlook.co'];

function isDemoEmail(email) {
  const n = String(email || '').toLowerCase().trim();
  return DEMO_EMAIL_ALIASES.includes(n);
}

function isDemoOtp(otp) {
  const n = String(otp || '').trim().replace(/\s/g, '');
  return n === DEMO_OTP || n === DEMO_OTP_ALT;
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const email = body?.email ?? body?.Email ?? '';
    const otp = body?.otp ?? body?.code ?? body?.token ?? '';

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedOtp = String(otp).trim().replace(/\s/g, '');

    if (!normalizedEmail || !normalizedOtp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    if (!isDemoEmail(normalizedEmail) || !isDemoOtp(normalizedOtp)) {
      return NextResponse.json(
        { error: 'Invalid demo credentials' },
        { status: 401 }
      );
    }

    // Always use real demo email for Supabase login (account exists there)
    const result = await authService.login(DEMO_EMAIL, DEMO_ACCOUNT_PASSWORD);

    if (!result.success) {
      // Never return a message containing "expired" so the app won't show "link expired"
      const safeError = (result.error || 'Demo sign-in failed').replace(/expired?/gi, 'unavailable');
      return NextResponse.json(
        { error: safeError },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: result.session,
      user: result.user,
    });
  } catch (error) {
    console.error('Demo login error:', error);
    const safeError = (error.message || 'Demo sign-in failed').replace(/expired?/gi, 'unavailable');
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
