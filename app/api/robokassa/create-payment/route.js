import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import crypto from 'crypto';

export async function POST(request) {
  try {
    // Load Robokassa config from Supabase
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { data: config, error: configError } = await supabaseAdmin
      .from('admin_config')
      .select('robokassa_merchant_login, robokassa_pass_one, robokassa_mode')
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('❌ Error loading Robokassa config from Supabase:', configError);
      return NextResponse.json(
        { error: 'Robokassa credentials not configured' },
        { status: 503 }
      );
    }
    
    let robokassaMerchantLogin = config?.robokassa_merchant_login || '';
    let robokassaPassOne = config?.robokassa_pass_one || '';
    const robokassaMode = config?.robokassa_mode || 'production';
    const robokassaBaseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';
    
    // If test mode is enabled, allow environment variables to override
    if (robokassaMode === 'test') {
      robokassaPassOne = process.env.NEXT_PUBLIC_ROBOKASSA_TEST_PASS_ONE || robokassaPassOne;
      console.log('🧪 Using test credentials (mode: test)');
    }
    
    if (!robokassaMerchantLogin || !robokassaPassOne) {
      console.error('❌ Robokassa credentials missing:', {
        hasMerchantLogin: !!robokassaMerchantLogin,
        hasPassOne: !!robokassaPassOne
      });
      return NextResponse.json(
        { error: 'Robokassa credentials not configured' },
        { status: 503 }
      );
    }
    
    const data = await request.json();
    const { order, email, name, total, currency, domain, description } = data;
    
    if (!order || !total) {
      return NextResponse.json(
        { error: 'Missing required fields: order, total' },
        { status: 400 }
      );
    }
    
    // CRITICAL: Use the domain from request if provided, otherwise use environment variable or fallback
    // Support both esim.globalbankaccounts.ru and globalbanka.roamjet.net
    let callbackDomain = domain;
    
    // If domain is provided in request, use it (could be either domain)
    if (domain) {
      callbackDomain = domain;
    } else {
      // Fallback to environment variable or default to globalbanka.roamjet.net
      callbackDomain = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
    }
    
    // Validate that domain is one of the allowed domains
    const allowedDomains = [
      'esim.globalbankaccounts.ru',
      'globalbanka.roamjet.net',
      'https://esim.globalbankaccounts.ru',
      'https://globalbanka.roamjet.net',
      'http://esim.globalbankaccounts.ru',
      'http://globalbanka.roamjet.net'
    ];
    
    // If domain doesn't match allowed domains, use default
    const domainMatches = allowedDomains.some(allowed => 
      callbackDomain.includes(allowed.replace(/^https?:\/\//, ''))
    );
    
    if (!domainMatches && callbackDomain !== domain) {
      console.warn(`⚠️ Domain ${callbackDomain} not in allowed list, using default`);
      callbackDomain = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
    }
    
    // Validate order ID - must be numeric
    let orderIdInt;
    try {
      orderIdInt = parseInt(order, 10);
      if (isNaN(orderIdInt) || orderIdInt < 1) {
        return NextResponse.json(
          { error: 'Order ID must be a positive number' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }
    
    let amount = parseFloat(total);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }
    
    // Automatically apply minimum price constraint (10 RUB) - no error, just correct it
    const MINIMUM_PRICE_RUB = 10;
    if (amount < MINIMUM_PRICE_RUB) {
      console.log(`⚠️ Amount ${amount} RUB is below minimum ${MINIMUM_PRICE_RUB} RUB, automatically correcting to ${MINIMUM_PRICE_RUB} RUB`);
      amount = MINIMUM_PRICE_RUB;
    }
    
    // Log the amount being sent to Robokassa
    console.log('💰 Amount received for Robokassa:', {
      total: total,
      parsedAmount: amount,
      currency: currency || 'RUB',
      orderId: orderIdInt,
      note: 'Amount should be in RUB, not USD'
    });
    
    // Generate signature
    // Robokassa signature format: MerchantLogin:OutSum:InvId:Password1
    const signatureString = `${robokassaMerchantLogin}:${amount}:${orderIdInt}:${robokassaPassOne}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');
    
    console.log('🔐 Generated Robokassa signature:', signatureString.substring(0, 50) + '...');
    
    // Build payment URL
    const params = new URLSearchParams({
      MerchantLogin: robokassaMerchantLogin,
      OutSum: amount.toString(),
      InvId: orderIdInt.toString(),
      Description: description || name || 'eSIM Package',
      SignatureValue: signature,
      Culture: 'ru',
      Encoding: 'utf-8'
    });
    
    // Add test mode if configured
    if (robokassaMode === 'test') {
      params.append('IsTest', '1');
    }
    
    // Add email if provided
    if (email) {
      params.append('Email', email);
    }
    
    // Force HTTPS for callback URLs (Robokassa requires HTTPS)
    // Always use globalbanka.roamjet.net (or NEXT_PUBLIC_BASE_URL) for callbacks
    const secureDomain = callbackDomain.startsWith('http://') 
      ? callbackDomain.replace('http://', 'https://')
      : callbackDomain.startsWith('https://')
      ? callbackDomain
      : `https://${callbackDomain}`;
    
    const successUrl = `${secureDomain}/api/robokassa/callback`;
    const failUrl = `${secureDomain}/payment-failed?reason=payment_cancelled`;
    
    console.log(`🔗 HTTPS Callback URLs (using globalbanka.roamjet.net):`);
    console.log(`   Success: ${successUrl}`);
    console.log(`   Fail: ${failUrl}`);
    console.log(`   Request domain (ignored): ${domain}`);
    console.log(`   Callback domain (used): ${secureDomain}`);
    // Note: Robokassa does not support ResultURL for server POST; payment confirmation is email-only. Use n8n (Schedule + IMAP poll or email→webhook) to trigger eSIM creation.

    // Add success and fail URLs (always use HTTPS)
    params.append('SuccessURL', successUrl);
    params.append('FailURL', failUrl);
    
    const paymentUrl = `${robokassaBaseUrl}?${params.toString()}`;
    
    console.log('✅ Robokassa payment URL generated');
    
    return NextResponse.json({
      success: true,
      paymentUrl,
      orderId: orderIdInt
    });
    
  } catch (error) {
    console.error('❌ Error creating Robokassa payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', details: error.message },
      { status: 500 }
    );
  }
}

