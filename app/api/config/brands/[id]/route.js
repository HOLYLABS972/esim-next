import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../src/lib/supabase';
import { clearBrandCache } from '../../../../../src/lib/brandResolution';

export const dynamic = 'force-dynamic';

/**
 * GET - One brand with its domains and payment config (appearance, language, currency, payment methods per brand).
 */
export async function GET(request, { params }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ success: false, error: 'Missing brand id' }, { status: 400 });
  try {
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id, slug, name, logo_url, theme, default_language, supported_languages, is_active, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (brandError || !brand) {
      return NextResponse.json({ success: false, error: brandError?.message || 'Brand not found' }, { status: 404 });
    }
    const { data: domains } = await supabaseAdmin
      .from('brand_domains')
      .select('id, domain, is_primary, created_at')
      .eq('brand_id', id)
      .order('is_primary', { ascending: false });
    const { data: paymentConfig } = await supabaseAdmin
      .from('store_payment_config')
      .select('default_currency, payment_methods')
      .eq('store_id', brand.slug)
      .eq('is_active', true)
      .maybeSingle();
    return NextResponse.json({
      success: true,
      brand: {
        ...brand,
        domains: domains || [],
        default_currency: paymentConfig?.default_currency || 'RUB',
        payment_methods: Array.isArray(paymentConfig?.payment_methods) ? paymentConfig.payment_methods : ['robokassa'],
      },
    });
  } catch (e) {
    console.error('config/brands/[id] GET error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to load brand' }, { status: 500 });
  }
}

/**
 * PATCH - Update brand (admin panel).
 */
export async function PATCH(request, { params }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ success: false, error: 'Missing brand id' }, { status: 400 });
  try {
    const body = await request.json().catch(() => ({}));
    const updates = {};
    if (body.name !== undefined) updates.name = String(body.name).trim() || undefined;
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url ? String(body.logo_url).trim() : null;
    if (body.theme !== undefined && typeof body.theme === 'object') updates.theme = body.theme;
    if (body.default_language !== undefined && ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'].includes(body.default_language)) {
      updates.default_language = body.default_language;
    }
    if (body.supported_languages !== undefined && Array.isArray(body.supported_languages)) {
      updates.supported_languages = body.supported_languages.filter((l) => ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'].includes(l));
    }
    if (body.is_active !== undefined) updates.is_active = !!body.is_active;
    updates.updated_at = new Date().toISOString();
    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ success: true, brand: (await supabaseAdmin.from('brands').select('*').eq('id', id).single()).data });
    }
    const { data, error } = await supabaseAdmin
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    clearBrandCache();

    const slug = data.slug;
    if (slug && (body.default_currency !== undefined || body.payment_methods !== undefined)) {
      const { data: existingPay } = await supabaseAdmin
        .from('store_payment_config')
        .select('id, default_currency, payment_methods')
        .eq('store_id', slug)
        .maybeSingle();
      const default_currency = body.default_currency ?? existingPay?.default_currency ?? 'RUB';
      const payment_methods = Array.isArray(body.payment_methods) ? body.payment_methods : (existingPay?.payment_methods ?? ['robokassa']);
      const payUpdate = { default_currency, payment_methods, updated_at: new Date().toISOString() };
      if (existingPay?.id) {
        await supabaseAdmin.from('store_payment_config').update(payUpdate).eq('store_id', slug);
      } else {
        await supabaseAdmin.from('store_payment_config').insert({
          store_id: slug,
          store_name: data.name,
          default_currency,
          payment_methods,
          is_active: true,
        });
      }
    }
    return NextResponse.json({ success: true, brand: data });
  } catch (e) {
    console.error('config/brands/[id] PATCH error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to update brand' }, { status: 500 });
  }
}

/**
 * DELETE - Delete brand (admin panel). Cascades to brand_domains.
 */
export async function DELETE(request, { params }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ success: false, error: 'Missing brand id' }, { status: 400 });
  try {
    const { error } = await supabaseAdmin.from('brands').delete().eq('id', id);
    if (error) throw error;
    clearBrandCache();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('config/brands/[id] DELETE error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to delete brand' }, { status: 500 });
  }
}
