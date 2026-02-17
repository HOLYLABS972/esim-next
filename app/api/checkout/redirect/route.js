import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import crypto from 'crypto';

// GET-based checkout: creates order + redirects to Robokassa
// Works in Telegram WebApp where fetch() may be blocked
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
    
    const MINIMUM_PRICE_RUB = 10;
    const finalAmount = Math.max(MINIMUM_PRICE_RUB, Math.round(amount));
    
    // 1. Resolve package_id from slug
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
    
    // 2. Create pending order in DB
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
          source: 'miniapp',
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
      console.error('❌ Failed to create order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError?.message },
        { status: 500 }
      );
    }
    
    const orderId = order.id;
    console.log(`✅ Order #${orderId} created via redirect checkout`);
    
    // 3. Load Robokassa config
    const { data: config, error: configError } = await supabaseAdmin
      .from('admin_config')
      .select('robokassa_merchant_login, robokassa_pass_one, robokassa_mode')
      .limit(1)
      .single();
    
    if (configError || !config || !config.robokassa_merchant_login || !config.robokassa_pass_one) {
      console.error('❌ Robokassa config missing:', configError);
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      );
    }
    
    const { robokassa_merchant_login, robokassa_pass_one, robokassa_mode } = config;
    const isTest = robokassa_mode === 'test';
    const passOne = isTest
      ? (process.env.NEXT_PUBLIC_ROBOKASSA_TEST_PASS_ONE || robokassa_pass_one)
      : robokassa_pass_one;
    
    // 4. Generate Robokassa URL
    const signatureString = `${robokassa_merchant_login}:${finalAmount}:${orderId}:${passOne}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');
    
    const baseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';
    const domain = 'https://globalbanka.roamjet.net';
    
    const params = new URLSearchParams({
      MerchantLogin: robokassa_merchant_login,
      OutSum: finalAmount.toString(),
      InvId: orderId.toString(),
      Description: planName || 'eSIM Package',
      SignatureValue: signature,
      Culture: 'ru',
      Encoding: 'utf-8',
      SuccessURL: `${domain}/api/robokassa/callback`,
      FailURL: `${domain}/payment-failed?reason=payment_cancelled`,
    });
    
    if (isTest) params.append('IsTest', '1');
    if (email) params.append('Email', email);
    
    const paymentUrl = `${baseUrl}?${params.toString()}`;
    
    console.log(`🚀 Order #${orderId} → Robokassa redirect (${isTest ? 'TEST' : 'LIVE'})`);
    
    // 5. Redirect to Robokassa
    return NextResponse.redirect(paymentUrl);
    
  } catch (error) {
    console.error('❌ Checkout redirect error:', error);
    return NextResponse.json(
      { error: 'Checkout failed', details: error.message },
      { status: 500 }
    );
  }
}
