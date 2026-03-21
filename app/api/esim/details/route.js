import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

const AIRALO_CLIENT_ID = '5f260affb036f58486895b58a0fbb803';
const AIRALO_CLIENT_SECRET = 'x8BesR7YdqZrRFAYRyQx5GFf6KGWs8wgEMTlpSr3';
const AIRALO_BASE_URL = 'https://partners-api.airalo.com/v2';

let accessTokenCache = { token: null, expiresAt: null };

async function getAiraloToken() {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }
  const res = await fetch(`${AIRALO_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: AIRALO_CLIENT_ID, client_secret: AIRALO_CLIENT_SECRET, grant_type: 'client_credentials' }).toString(),
  });
  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const data = await res.json();
  const token = data.access_token || data.data?.access_token;
  accessTokenCache = { token, expiresAt: Date.now() + ((data.expires_in || 3600) * 1000) - 60000 };
  return token;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const iccid = searchParams.get('iccid');
    const orderId = searchParams.get('orderId');

    if (!iccid && !orderId) {
      return NextResponse.json({ error: 'iccid or orderId required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
    }

    // Fetch order from DB
    let query = supabaseAdmin
      .from('esim_orders')
      .select('id, iccid, country_name, country_code, plan_name, price_rub, status, qr_code_url, qr_code, lpa, direct_apple_installation_url, data_limit_mb, data_usage_mb, expiry_date, activated_at, created_at, metadata')
      .limit(1)
      .single();

    if (iccid) {
      query = query.eq('iccid', iccid);
    } else {
      query = query.eq('id', orderId);
    }

    const { data: order, error: orderError } = await query;

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch live usage from Airalo if we have ICCID
    let usage = null;
    if (order.iccid) {
      try {
        const token = await getAiraloToken();
        const usageRes = await fetch(`${AIRALO_BASE_URL}/sims/${order.iccid}/usage`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          usage = usageData.data || usageData;
        }
      } catch (e) {
        console.error('Usage fetch error:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        iccid: order.iccid,
        countryName: order.country_name,
        countryCode: order.country_code,
        planName: order.plan_name,
        priceRub: order.price_rub,
        status: order.status,
        qrCodeUrl: order.qr_code_url || order.qr_code,
        lpa: order.lpa,
        installUrl: order.direct_apple_installation_url,
        dataLimitMb: order.data_limit_mb,
        dataUsageMb: order.data_usage_mb,
        expiryDate: order.expiry_date,
        activatedAt: order.activated_at,
        createdAt: order.created_at,
      },
      usage,
    });
  } catch (error) {
    console.error('eSIM details error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
