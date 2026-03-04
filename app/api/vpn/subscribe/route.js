import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Self-hosted Supabase on VPS (same as eSIM orders)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.holylabs.net';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const PLANS = {
  monthly: { amount: 399, days: 30, label: 'FoxyWall VPN — Месяц' },
  yearly:  { amount: 2990, days: 365, label: 'FoxyWall VPN — Год' },
};

async function getRobokassaConfig() {
  // Try loading from self-hosted Supabase admin_config (same as eSIM payments)
  const selfHostedUrl = process.env.SUPABASE_URL || 'https://supabase.holylabs.net';
  const selfHostedKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (selfHostedKey) {
    try {
      const res = await fetch(`${selfHostedUrl}/rest/v1/admin_config?select=robokassa_merchant_login,robokassa_pass_one,robokassa_mode&limit=1`, {
        headers: {
          'apikey': selfHostedKey,
          'Authorization': `Bearer ${selfHostedKey}`,
        },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    } catch (e) {
      console.error('Failed to load Robokassa config:', e);
    }
  }
  
  // Fallback to env vars
  return {
    robokassa_merchant_login: process.env.ROBOKASSA_MERCHANT_LOGIN || '',
    robokassa_pass_one: process.env.ROBOKASSA_PASS_ONE || '',
    robokassa_mode: process.env.ROBOKASSA_MODE || 'production',
  };
}

export async function POST(request) {
  try {
    const { email, plan, ref, rc_app_user_id, rc_package, rc_source, rc_env } = await request.json();

    if (!email || !plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Missing email or invalid plan' }, { status: 400 });
    }

    const planData = PLANS[plan];

    // Generate promo code for web users (no rc_app_user_id)
    const isWebUser = !rc_app_user_id;
    const promoCode = isWebUser 
      ? 'FOXY' + crypto.randomBytes(4).toString('hex').toUpperCase()
      : null;

    // 1. Save subscription to Supabase
    const subData = {
      email: email.toLowerCase().trim(),
      plan,
      amount_rub: planData.amount,
      duration_days: planData.days,
      status: 'pending',
      ref: ref || null,
      rc_app_user_id: rc_app_user_id || null,
      rc_package: rc_package || null,
      rc_source: rc_source || null,
      rc_env: rc_env || null,
      promo_code: promoCode,
      created_at: new Date().toISOString(),
    };

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/vpn_subscriptions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(subData),
    });

    const records = await insertRes.json();
    const record = Array.isArray(records) ? records[0] : records;
    const invId = record?.id;

    if (!invId) {
      console.error('Failed to create subscription:', records);
      return NextResponse.json({ error: 'Failed to create subscription record' }, { status: 500 });
    }

    // 2. Generate Robokassa payment URL
    const config = await getRobokassaConfig();
    let { robokassa_merchant_login, robokassa_pass_one, robokassa_mode } = config;

    // All credentials from DB only

    if (!robokassa_merchant_login || !robokassa_pass_one) {
      return NextResponse.json({ error: 'Robokassa not configured' }, { status: 503 });
    }

    // Signature: MD5(MerchantLogin:OutSum:InvId:Password1) — same as eSIM route
    const sigString = `${robokassa_merchant_login}:${planData.amount}:${invId}:${robokassa_pass_one}`;
    const signature = crypto.createHash('md5').update(sigString).digest('hex');

    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${requestUrl.host}`;

    const params = new URLSearchParams({
      MerchantLogin: robokassa_merchant_login,
      OutSum: planData.amount.toString(),
      InvId: invId.toString(),
      Description: planData.label,
      SignatureValue: signature,
      Culture: 'ru',
      Encoding: 'utf-8',
      Email: email,
      SuccessURL: `${origin}/vpn/success?inv=${invId}&plan=${plan}`,
      FailURL: `${origin}/vpn?error=cancelled`,
    });

    if (robokassa_mode === 'test') {
      params.append('IsTest', '1');
    }

    const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`;

    console.log(`[VPN Sub] ${email} → ${plan} (inv: ${invId}, ref: ${ref || 'none'})`);

    return NextResponse.json({ paymentUrl, invId });
  } catch (error) {
    console.error('VPN subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
