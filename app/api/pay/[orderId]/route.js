import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  try {
    const params = typeof context.params?.then === 'function' ? await context.params : context.params;
    const orderId = parseInt(params?.orderId, 10);

    if (!orderId || isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Fetch order
    const { data: order } = await supabaseAdmin
      .from('esim_orders')
      .select('id, price_rub, status, country_name, customer_email')
      .eq('id', orderId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found or already paid' }, { status: 404 });
    }

    // Call the same create-payment endpoint the website uses
    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://globalbanka.roamjet.net';
    const baseUrl = origin.startsWith('http') ? new URL(origin).origin : 'https://globalbanka.roamjet.net';
    
    const payRes = await fetch(`${baseUrl}/api/robokassa/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: orderId,
        total: order.price_rub,
        currency: 'RUB',
        email: order.customer_email || '',
        description: `eSIM ${order.country_name || ''} #${orderId}`,
        domain: 'https://globalbanka.roamjet.net'
      })
    });

    const payData = await payRes.json();
    
    if (payData.success && payData.paymentUrl) {
      return NextResponse.json({ success: true, paymentUrl: payData.paymentUrl });
    }
    
    return NextResponse.json({ error: payData.error || 'Payment creation failed' }, { status: 500 });
  } catch (e) {
    console.error('Pay redirect error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
