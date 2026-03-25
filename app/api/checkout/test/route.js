import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import crypto from 'crypto';

// ALWAYS test mode — hardcoded, no overrides, no decisions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const packageSlug = searchParams.get('pkg');
    const email = searchParams.get('email');
    const amount = parseFloat(searchParams.get('amount') || '0');
    const countryCode = searchParams.get('cc') || null;
    const countryName = searchParams.get('cn') || null;
    const planName = searchParams.get('plan') || packageSlug;
    const userId = searchParams.get('uid') || null;
    
    if (!packageSlug || !email || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required params: pkg, email, amount' },
        { status: 400 }
      );
    }
    
    const finalAmount = Math.max(10, Math.round(amount));
    
    let packageId = null;
    if (supabaseAdmin) {
      const { data: pkg } = await supabaseAdmin
        .from('esim_packages')
        .select('id')
        .eq('slug', packageSlug)
        .limit(1)
        .single();
      if (pkg) packageId = pkg.id;
    }
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from('esim_orders')
      .insert({
        package_id: packageId,
        customer_email: email,
        user_id: userId,
        price_rub: finalAmount,
        currency: 'RUB',
        status: 'pending',
        country_code: countryCode,
        country_name: countryName,
        plan_name: planName,
        store_id: 'globalbanka',
        order_type: 'esim_purchase',
        metadata: {
          source: 'test',
          package_slug: packageSlug,
          countryCode,
          countryName,
          plan_name: planName,
          type: 'esim_purchase',
        }
      })
      .select('id')
      .single();
    
    if (orderError || !order) {
      console.error('❌ Failed to create test order:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
    
    const orderId = order.id;
    
    // HARDCODED: always use test credentials from DB
    const { data: config } = await supabaseAdmin
      .from('admin_config')
      .select('robokassa_merchant_login, robokassa_test_pass_one')
      .limit(1)
      .single();
    
    const merchant = config?.robokassa_merchant_login || 'roamjet';
    const testPass = config?.robokassa_test_pass_one;
    
    if (!testPass) {
      return NextResponse.json({ error: 'Test password not configured in DB' }, { status: 503 });
    }
    
    const signature = crypto.createHash('md5')
      .update(`${merchant}:${finalAmount}:${orderId}:${testPass}`)
      .digest('hex');
    
    const params = new URLSearchParams({
      MerchantLogin: merchant,
      OutSum: finalAmount.toString(),
      InvId: orderId.toString(),
      Description: [countryName, planName, packageSlug].filter(Boolean).join(' | ') || 'eSIM Package',
      SignatureValue: signature,
      Culture: 'ru',
      IsTest: '1',
    });
    if (email) params.append('Email', email);
    
    const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`;
    console.log(`🧪 TEST Order #${orderId} → Robokassa TEST mode`);
    
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Тест...</title></head><body><p>Тестовая оплата...</p><script>if(window.top!==window.self){window.top.location.href="${paymentUrl}"}else{window.location.href="${paymentUrl}"}</script></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
    
  } catch (error) {
    console.error('❌ Test checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
