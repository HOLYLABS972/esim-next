import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  try {
    const params = typeof context.params?.then === 'function' ? await context.params : context.params;
    const orderId = parseInt(params?.orderId, 10);

    if (!orderId || isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Fetch order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('esim_orders')
      .select('id, price_rub, status, country_name, metadata')
      .eq('id', orderId)
      .eq('status', 'pending')
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found or already paid' }, { status: 404 });
    }

    // Fetch Robokassa config
    const { data: config } = await supabaseAdmin
      .from('admin_config')
      .select('robokassa_merchant_login, robokassa_pass_one, robokassa_mode')
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Payment config not found' }, { status: 503 });
    }

    const login = config.robokassa_merchant_login;
    const pass1 = config.robokassa_pass_one;
    const isTest = config.robokassa_mode === 'test';
    const amount = order.price_rub;
    const description = `eSIM ${order.country_name || ''} #${orderId}`;

    // Generate signature
    const sigStr = `${login}:${amount}:${orderId}:${pass1}`;
    const sig = crypto.createHash('md5').update(sigStr).digest('hex');

    const params2 = new URLSearchParams({
      MerchantLogin: login,
      OutSum: amount.toString(),
      InvId: orderId.toString(),
      Description: description,
      SignatureValue: sig,
      Culture: 'ru',
      Encoding: 'utf-8'
    });

    if (isTest) params2.append('IsTest', '1');

    const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${params2.toString()}`;

    // If request accepts HTML (browser), do 302 redirect. Otherwise return JSON.
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      return NextResponse.redirect(paymentUrl, 302);
    }
    return NextResponse.json({ success: true, paymentUrl });
  } catch (e) {
    console.error('Pay redirect error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
