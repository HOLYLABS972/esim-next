import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin config save - no Firebase/Supabase.
 * Config is read from environment variables; this endpoint acknowledges
 * the request. To change config, update your .env or hosting env vars.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid config body' },
        { status: 400 }
      );
    }

    // Config is driven by env vars; we don't persist to a DB here.
    // Return the same shape so the UI can update local state.
    const config = {
      googleId: body.googleId ?? '',
      googleSecret: body.googleSecret ?? '',
      googleAuthEnabled: true,
      yandexAppId: body.yandexAppId ?? '',
      yandexAppSecret: body.yandexAppSecret ?? '',
      yandexAuthEnabled: true,
      roamjetApiKey: body.roamjetApiKey ?? '',
      roamjetMode: 'production',
      openRouterApiKey: body.openRouterApiKey ?? '',
      robokassaMerchantLogin: body.robokassaMerchantLogin ?? '',
      robokassaPassOne: body.robokassaPassOne ?? '',
      robokassaPassTwo: body.robokassaPassTwo ?? '',
      robokassaMode: 'production',
      discountPercentage: typeof body.discountPercentage === 'number' ? body.discountPercentage : 0,
      usdToRubRate: typeof body.usdToRubRate === 'number' ? body.usdToRubRate : 100,
      mongoUri: body.mongoUri ?? '',
      smtpHost: body.smtpHost ?? '',
      smtpPort: typeof body.smtpPort === 'number' ? body.smtpPort : 587,
      smtpUser: body.smtpUser ?? '',
      smtpPass: body.smtpPass ?? '',
      smtpFrom: body.smtpFrom ?? '',
      smtpSecure: !!body.smtpSecure,
    };

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Config save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save config' },
      { status: 500 }
    );
  }
}
