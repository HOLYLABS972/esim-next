import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin config get - no Firebase/Supabase.
 * Returns config from environment variables.
 */
export async function GET() {
  try {
    const config = {
      googleId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID || '',
      googleSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET || '',
      googleAuthEnabled: true,
      yandexAppId: process.env.YANDEX_APP_ID || '',
      yandexAppSecret: process.env.YANDEX_APP_SECRET || '',
      yandexAuthEnabled: true,
      roamjetApiKey: process.env.ROAMJET_API_KEY || process.env.ROAMJET_API_KEY_PROD || '',
      roamjetMode: 'production',
      openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
      robokassaMerchantLogin: process.env.ROBOKASSA_MERCHANT_LOGIN || '',
      robokassaPassOne: process.env.ROBOKASSA_PASS_ONE || '',
      robokassaPassTwo: process.env.ROBOKASSA_PASS_TWO || '',
      robokassaMode: 'production',
      discountPercentage: parseFloat(process.env.DISCOUNT_PERCENTAGE || '0') || 0,
      usdToRubRate: parseFloat(process.env.USD_TO_RUB_RATE || '100') || 100,
      mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || '',
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10) || 587,
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || '',
      smtpFrom: process.env.SMTP_FROM || '',
      smtpSecure: process.env.SMTP_SECURE === 'true',
    };

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Config get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load config' },
      { status: 500 }
    );
  }
}
