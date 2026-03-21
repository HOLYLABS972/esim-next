import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_STORE = 'globalbanka';
const GLOBAL_CODE = 'GLOBAL25';

async function ensureGlobalLink(storeId) {
  const { data: existing } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, code')
    .eq('store_id', storeId)
    .eq('code', GLOBAL_CODE)
    .maybeSingle();
  if (existing) return existing;
  const { data: inserted, error } = await supabaseAdmin
    .from('affiliate_links')
    .insert({
      code: GLOBAL_CODE,
      commission_percent: 25,
      package_slug: null,
      label: 'Global (25%)',
      store_id: storeId,
    })
    .select('id, code, commission_percent, package_slug, label, clicks, sales_count, sales_amount_rub, created_at')
    .single();
  if (error) {
    console.warn('Could not create global affiliate link:', error);
    return null;
  }
  return inserted;
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store') || DEFAULT_STORE;

    await ensureGlobalLink(storeId);

    const { data, error } = await supabaseAdmin
      .from('affiliate_links')
      .select('id, code, commission_percent, package_slug, label, clicks, sales_count, sales_amount_rub, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('Affiliates GET error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to load affiliates' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    const body = await request.json().catch(() => ({}));
    const storeId = body.store_id || body.store || DEFAULT_STORE;
    const code = body.code || `AFF${Date.now().toString(36).toUpperCase()}`;
    const commission_percent = Number(body.commission_percent) ?? 25;
    const package_slug = body.package_slug || null;
    const label = body.label || (package_slug ? `${package_slug} (${commission_percent}%)` : `Custom (${commission_percent}%)`);

    const { data, error } = await supabaseAdmin
      .from('affiliate_links')
      .insert({
        code,
        commission_percent,
        package_slug,
        label,
        store_id: storeId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('Affiliates POST error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create affiliate' }, { status: 500 });
  }
}
