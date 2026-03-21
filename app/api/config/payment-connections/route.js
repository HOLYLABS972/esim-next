import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET - Fetch payment connection config for a store
 * ?store=globalbanka → Robokassa config from admin_config
 */
// Normalize store for DB: frontend shows "easycall" but DB may have "roamjet"
function normalizeStoreForDb(store) {
  if (store === 'easycall') return 'roamjet';
  return store || 'globalbanka';
}

export async function GET(request) {
  try {
    const url = request.nextUrl || new URL(request.url);
    const storeIdFromQuery = url.searchParams.get('store') || process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';
    const storeId = normalizeStoreForDb(storeIdFromQuery);

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase not configured. Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) on the server.',
      }, { status: 503 });
    }

    // Get store payment config including Stripe mode and Coinbase (maybeSingle: no row = null, no throw)
    const { data: storeConfig, error: storeError } = await supabaseAdmin
      .from('store_payment_config')
      .select('store_id, store_name, payment_methods, default_currency, stripe_mode, coinbase_api_key_encrypted')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .maybeSingle();

    if (storeError) {
      console.error('Payment connections GET store_payment_config error:', storeError);
    }

    const paymentMethods = Array.isArray(storeConfig?.payment_methods) ? storeConfig.payment_methods : ['robokassa'];

    // Result: all available methods and their connection state
    const result = { storeId, storeName: storeConfig?.store_name || storeId, paymentMethods, connections: {} };

    // Load admin_config: Robokassa + Stripe secret/publishable keys (no Connect)
    const { data: adminConfig, error: adminError } = await supabaseAdmin
      .from('admin_config')
      .select('robokassa_merchant_login, robokassa_pass_one, robokassa_pass_two, robokassa_mode, stripe_secret_key, stripe_publishable_key')
      .limit(1)
      .maybeSingle();

    if (adminError) {
      console.error('Payment connections GET admin_config error:', adminError.message, adminError.code);
      return NextResponse.json({
        success: false,
        error: `Failed to load payment config: ${adminError.message}. Check that table "admin_config" exists.`,
      }, { status: 500 });
    }

    const login = String(adminConfig?.robokassa_merchant_login ?? adminConfig?.robokassa_merchantLogin ?? '').trim();
    const passOne = adminConfig?.robokassa_pass_one ?? adminConfig?.robokassaPassOne ?? '';
    const passTwo = adminConfig?.robokassa_pass_two ?? adminConfig?.robokassaPassTwo ?? '';
    const mode = String(adminConfig?.robokassa_mode ?? adminConfig?.robokassaMode ?? 'production').trim() || 'production';

    result.connections.robokassa = {
      configured: !!(login && passOne),
      merchantLogin: login,
      passOne: typeof passOne === 'string' ? passOne : '',
      passTwo: typeof passTwo === 'string' ? passTwo : '',
      mode: mode || 'production',
    };

    // Stripe: secret + publishable key only (no Connect). Keys from admin_config or env.
    const stripeSecret = String(adminConfig?.stripe_secret_key ?? '').trim() || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST || '';
    const stripePublishable = String(adminConfig?.stripe_publishable_key ?? '').trim() || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || '';
    const stripeMode = String(storeConfig?.stripe_mode ?? storeConfig?.stripeMode ?? 'test').trim() || 'test';
    // Masked secret for display only (e.g. sk_live_••••••••QZfH) – never send full secret
    const secretMasked = stripeSecret
      ? stripeSecret.slice(0, 12) + '••••••••••••' + stripeSecret.slice(-4)
      : '';
    result.connections.stripe = {
      configured: !!(stripeSecret && stripePublishable),
      secretKeyMasked: secretMasked,
      publishableKey: stripePublishable,
      mode: stripeMode || 'test',
    };

    // Coinbase (from store_payment_config, never return raw key)
    const hasCoinbaseKey = !!(storeConfig?.coinbase_api_key_encrypted ?? storeConfig?.coinbaseApiKeyEncrypted);
    result.connections.coinbase = {
      configured: hasCoinbaseKey,
      apiKeyMasked: hasCoinbaseKey ? '••••••••' : '',
    };

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Payment connections GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST - Save payment connection config for a store
 * Body: { store, robokassa?: {...}, stripe?: { secretKey?, publishableKey?, mode }, coinbase?: { apiKey }, enabledMethods?: string[] }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const storeIdFromBody = body.store || process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';
    const storeId = normalizeStoreForDb(storeIdFromBody);

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }

    // Robokassa + Stripe keys: admin_config (global)
    const adminUpdate = { updated_at: new Date().toISOString() };
    if (storeIdFromBody === 'globalbanka' && body.robokassa) {
      const robokassa = body.robokassa;
      if (robokassa.merchantLogin != null) adminUpdate.robokassa_merchant_login = robokassa.merchantLogin;
      if (robokassa.mode != null) adminUpdate.robokassa_mode = robokassa.mode || 'production';
      if (robokassa.passOne != null && robokassa.passOne && !/^•+$/.test(robokassa.passOne)) {
        adminUpdate.robokassa_pass_one = robokassa.passOne;
      }
      if (robokassa.passTwo != null && robokassa.passTwo && !/^•+$/.test(robokassa.passTwo)) {
        adminUpdate.robokassa_pass_two = robokassa.passTwo;
      }
    }
    if (body.stripe != null) {
      const stripe = body.stripe;
      if (stripe.secretKey != null && stripe.secretKey && !/^•+$/.test(stripe.secretKey)) {
        adminUpdate.stripe_secret_key = stripe.secretKey;
      }
      if (stripe.publishableKey != null && stripe.publishableKey && !/^•+$/.test(stripe.publishableKey)) {
        adminUpdate.stripe_publishable_key = stripe.publishableKey;
      }
    }
    if (Object.keys(adminUpdate).length > 1) {
      const { data: existingAdmin } = await supabaseAdmin.from('admin_config').select('id').limit(1).maybeSingle();
      if (existingAdmin) {
        await supabaseAdmin.from('admin_config').update(adminUpdate).eq('id', existingAdmin.id);
      } else {
        await supabaseAdmin.from('admin_config').insert({ ...adminUpdate, created_at: new Date().toISOString() });
      }
    }

    // Stripe mode + Coinbase: save to store_payment_config (per store)
    const stripe = body.stripe;
    const coinbase = body.coinbase;
    const enabledMethods = body.enabledMethods;

    if (stripe != null || coinbase != null || Array.isArray(enabledMethods)) {
      const { data: existingStore } = await supabaseAdmin
        .from('store_payment_config')
        .select('id, payment_methods')
        .eq('store_id', storeId)
        .maybeSingle();

      const storeUpdate = { updated_at: new Date().toISOString() };
      if (stripe != null && stripe.mode != null) {
        storeUpdate.stripe_mode = stripe.mode === 'live' ? 'live' : 'test';
      }
      if (coinbase != null && coinbase.apiKey != null && coinbase.apiKey && !/^•+$/.test(coinbase.apiKey)) {
        storeUpdate.coinbase_api_key_encrypted = coinbase.apiKey; // store as-is; encrypt in DB if you add encryption
      }
      if (Array.isArray(enabledMethods)) {
        storeUpdate.payment_methods = enabledMethods.filter((m) => ['robokassa', 'stripe', 'coinbase'].includes(m));
        if (storeUpdate.payment_methods.length === 0) storeUpdate.payment_methods = ['robokassa'];
      }

      if (existingStore) {
        await supabaseAdmin
          .from('store_payment_config')
          .update(storeUpdate)
          .eq('id', existingStore.id);
      } else {
        await supabaseAdmin.from('store_payment_config').insert({
          store_id: storeId,
          store_name: storeId,
          payment_methods: storeUpdate.payment_methods || ['robokassa'],
          is_active: true,
          ...storeUpdate,
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, storeId });
  } catch (error) {
    console.error('Payment connections POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
