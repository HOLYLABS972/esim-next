import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.holylabs.net';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inv = searchParams.get('inv');

  if (!inv) {
    return NextResponse.json({ error: 'Missing inv' }, { status: 400 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vpn_subscriptions?id=eq.${inv}&select=promo_code,plan,status`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  const data = await res.json();
  const sub = Array.isArray(data) ? data[0] : null;

  if (!sub || !sub.promo_code) {
    return NextResponse.json({ promo_code: null, plan: sub?.plan || null });
  }

  return NextResponse.json({ promo_code: sub.promo_code, plan: sub.plan });
}
