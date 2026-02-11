import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import { clearBrandCache } from '../../../../src/lib/brandResolution';
import { clearConfigCache } from '../../../../src/utils/configLoader';

export const dynamic = 'force-dynamic';

const DEFAULT_SLUG = process.env.NEXT_PUBLIC_STORE_ID || process.env.NEXT_PUBLIC_DEFAULT_BRAND_SLUG || 'globalbanka';

/**
 * GET - Load site settings (logo, default language, theme, default_currency, login_methods) for a brand.
 * Query: ?store=slug (optional; defaults to DEFAULT_SLUG)
 */
export async function GET(request) {
  try {
    const storeSlug = request.nextUrl?.searchParams?.get('store') || DEFAULT_SLUG;
    const { data: brand, error } = await supabaseAdmin
      .from('brands')
      .select('id, slug, name, logo_url, theme, default_language')
      .eq('slug', storeSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !brand) {
      const { data: pay } = await supabaseAdmin
        .from('store_payment_config')
        .select('default_currency')
        .eq('store_id', storeSlug)
        .eq('is_active', true)
        .maybeSingle();
      const { data: adminConfig } = await supabaseAdmin
        .from('admin_config')
        .select('discount_percentage')
        .maybeSingle();
      return NextResponse.json({
        success: true,
        site: {
          slug: storeSlug,
          logo_url: null,
          default_language: 'en',
          default_currency: pay?.default_currency || 'RUB',
          discount_percentage: adminConfig?.discount_percentage ?? 0,
          login_methods: null,
          theme: { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
        },
      });
    }
    const { data: pay } = await supabaseAdmin
      .from('store_payment_config')
      .select('default_currency, login_methods')
      .eq('store_id', brand.slug)
      .eq('is_active', true)
      .maybeSingle();
    const { data: adminConfig } = await supabaseAdmin
      .from('admin_config')
      .select('discount_percentage')
      .maybeSingle();
    const loginMethods = Array.isArray(pay?.login_methods) ? pay.login_methods : null;
    return NextResponse.json({
      success: true,
      site: {
        id: brand.id,
        slug: brand.slug,
        name: brand.name,
        logo_url: brand.logo_url ?? null,
        default_language: brand.default_language ?? 'en',
        default_currency: pay?.default_currency || 'RUB',
        discount_percentage: adminConfig?.discount_percentage ?? 0,
        login_methods: loginMethods,
        theme: brand.theme ?? { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
      },
    });
  } catch (e) {
    console.error('config/site GET error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to load site' }, { status: 500 });
  }
}

/**
 * PATCH - Update site settings (logo, default language, theme, login_methods) for a brand.
 * Body: { store?, logo_url?, default_language?, theme?, default_currency?, discount_percentage?, login_methods? }
 */
export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const storeSlug = body.store || DEFAULT_SLUG;
    const { data: brand, error: findError } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('slug', storeSlug)
      .maybeSingle();
    if (findError || !brand) {
      return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    }
    const updates = { updated_at: new Date().toISOString() };
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url ? String(body.logo_url).trim() : null;
    if (body.default_language !== undefined && ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'].includes(body.default_language)) {
      updates.default_language = body.default_language;
    }
    if (body.theme !== undefined && typeof body.theme === 'object') updates.theme = body.theme;
    const { data, error } = await supabaseAdmin
      .from('brands')
      .update(updates)
      .eq('id', brand.id)
      .select('id, slug, name, logo_url, theme, default_language')
      .single();
    if (error) throw error;
    const slug = data.slug;
    let default_currency = 'RUB';
    if (body.default_currency !== undefined && ['USD', 'RUB', 'ILS', 'AUD'].includes(String(body.default_currency).toUpperCase())) {
      default_currency = String(body.default_currency).toUpperCase();
      const { data: existingPay } = await supabaseAdmin
        .from('store_payment_config')
        .select('id, default_currency')
        .eq('store_id', data.slug)
        .maybeSingle();
      const payUpdate = { default_currency, updated_at: new Date().toISOString() };
      if (existingPay?.id) {
        await supabaseAdmin.from('store_payment_config').update(payUpdate).eq('store_id', slug);
      } else {
        await supabaseAdmin.from('store_payment_config').insert({
          store_id: slug,
          store_name: data.name,
          default_currency,
          payment_methods: ['robokassa'],
          is_active: true,
        });
      }
    } else {
      const { data: pay } = await supabaseAdmin
        .from('store_payment_config')
        .select('default_currency')
        .eq('store_id', slug)
        .maybeSingle();
      default_currency = pay?.default_currency || 'RUB';
    }
    if (body.login_methods !== undefined) {
      const methods = Array.isArray(body.login_methods)
        ? body.login_methods.filter((m) => ['google', 'yandex'].includes(m))
        : null;
      const { data: existingPay } = await supabaseAdmin
        .from('store_payment_config')
        .select('id')
        .eq('store_id', slug)
        .maybeSingle();
      // Store [] when explicitly none selected, null when not configured
      const loginUpdate = {
        login_methods: methods,
        updated_at: new Date().toISOString(),
      };
      if (existingPay?.id) {
        await supabaseAdmin.from('store_payment_config').update(loginUpdate).eq('store_id', slug);
      } else {
        await supabaseAdmin.from('store_payment_config').insert({
          store_id: slug,
          store_name: data.name,
          login_methods: loginUpdate.login_methods,
          payment_methods: ['robokassa'],
          default_currency: default_currency,
          is_active: true,
        });
      }
    }
    if (body.discount_percentage !== undefined) {
      const pct = Math.max(0, Math.min(100, Number(body.discount_percentage) || 0));
      const { data: ac } = await supabaseAdmin.from('admin_config').select('id').limit(1).maybeSingle();
      if (ac?.id) {
        await supabaseAdmin.from('admin_config').update({ discount_percentage: pct, updated_at: new Date().toISOString() }).eq('id', ac.id);
      } else {
        await supabaseAdmin.from('admin_config').insert({ discount_percentage: pct });
      }
      clearConfigCache();
    }
    // Sync theme, language, currency to domain_appearance so they persist on reload (avoids cache staleness)
    const shouldSyncDomain = (body.theme !== undefined || body.default_language !== undefined || body.default_currency !== undefined) && data.slug && data.id;
    if (shouldSyncDomain) {
      const themeMode = (data.theme ?? body.theme)?.mode === 'dark' ? 'dark' : 'light';
      const primaryColor = (data.theme ?? body.theme)?.primaryColor ?? null;
      const lang = data.default_language ?? body.default_language ?? 'en';
      const curr = default_currency;
      const { data: domains } = await supabaseAdmin
        .from('brand_domains')
        .select('domain')
        .eq('brand_id', data.id);
      const now = new Date().toISOString();
      if (domains?.length) {
        for (const { domain } of domains) {
          if (domain) {
            await supabaseAdmin.from('domain_appearance').upsert(
              { domain, theme: themeMode, primary_color: primaryColor, default_language: lang, default_currency: curr, updated_at: now },
              { onConflict: 'domain' }
            );
          }
        }
      }
    }

    const { data: payFinal } = await supabaseAdmin
      .from('store_payment_config')
      .select('login_methods')
      .eq('store_id', slug)
      .maybeSingle();
    const loginMethods = Array.isArray(payFinal?.login_methods) ? payFinal.login_methods : null;
    const { data: adminConfig } = await supabaseAdmin.from('admin_config').select('discount_percentage').maybeSingle();
    clearBrandCache();
    return NextResponse.json({
      success: true,
      site: {
        id: data.id,
        slug: data.slug,
        name: data.name,
        logo_url: data.logo_url ?? null,
        default_language: data.default_language ?? 'en',
        default_currency,
        discount_percentage: adminConfig?.discount_percentage ?? 0,
        login_methods: loginMethods,
        theme: data.theme ?? { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
      },
    });
  } catch (e) {
    console.error('config/site PATCH error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to save site' }, { status: 500 });
  }
}
