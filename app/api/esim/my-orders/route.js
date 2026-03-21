import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chat_id');

    if (!chatId) {
      return NextResponse.json({ error: 'chat_id required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
    }

    const { data: orders, error } = await supabaseAdmin
      .from('esim_orders')
      .select('id, iccid, country_name, country_code, plan_name, price_rub, status, qr_code_url, direct_apple_installation_url, data_limit_mb, data_usage_mb, expiry_date, created_at, metadata')
      .filter('metadata->>chat_id', 'eq', chatId)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('my-orders error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orders: (orders || []).map(o => ({
        id: o.id,
        iccid: o.iccid,
        countryName: o.country_name,
        countryCode: o.country_code,
        planName: o.plan_name,
        priceRub: o.price_rub,
        status: o.status,
        dataLimitMb: o.data_limit_mb,
        dataUsageMb: o.data_usage_mb,
        expiryDate: o.expiry_date,
        createdAt: o.created_at,
        hasQr: !!o.qr_code_url,
        hasInstall: !!o.direct_apple_installation_url,
      })),
    });
  } catch (e) {
    console.error('my-orders error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
