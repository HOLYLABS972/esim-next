import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

function normalizeStoreForDb(store) {
  if (store === 'easycall') return 'roamjet';
  return store || 'globalbanka';
}

/**
 * POST - Create Stripe Checkout Session (secret + publishable key only, no Connect).
 * Body: { orderId, customerEmail, planName, amount, currency?, domain?, store? }
 * Returns: { url } to redirect the customer to Stripe Checkout.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderId, customerEmail, planName, amount, currency = 'usd', domain, store: storeFromBody } = body;
    const storeId = normalizeStoreForDb(storeFromBody || process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka');

    if (!orderId || amount == null) {
      return NextResponse.json({ success: false, error: 'Missing orderId or amount' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }

    // Stripe mode for this store (test/live)
    const { data: storeConfig } = await supabaseAdmin
      .from('store_payment_config')
      .select('stripe_mode')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .maybeSingle();
    const stripeMode = (storeConfig?.stripe_mode === 'live') ? 'live' : 'test';

    // Secret key: admin_config or env (no Connect)
    const { data: adminConfig } = await supabaseAdmin
      .from('admin_config')
      .select('stripe_secret_key')
      .limit(1)
      .maybeSingle();
    const secretKey =
      String(adminConfig?.stripe_secret_key ?? '').trim() ||
      (stripeMode === 'live' ? process.env.STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_KEY_TEST) ||
      process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_SECRET_KEY_TEST;

    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe secret key not configured. Set in Payment config or STRIPE_SECRET_KEY / STRIPE_SECRET_KEY_TEST in env.' },
        { status: 503 }
      );
    }

    const stripe = new Stripe(secretKey);
    const origin = domain || request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const successUrl = origin ? `${origin.replace(/\/$/, '')}/payment-success?session_id={CHECKOUT_SESSION_ID}` : undefined;
    const cancelUrl = origin ? `${origin.replace(/\/$/, '')}` : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: (currency || 'usd').toLowerCase(),
            product_data: {
              name: planName || `Order ${orderId}`,
              description: `Order ${orderId}`,
            },
            unit_amount: Math.round(Number(amount) * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orderId: String(orderId) },
    });

    if (!session.url) {
      return NextResponse.json({ success: false, error: 'Stripe did not return a checkout URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe create-checkout-session error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
