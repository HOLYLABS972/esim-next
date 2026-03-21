import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_STORE = process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';

/**
 * GET - List domains with their brand (for config Domains tab).
 * Query: ?store=slug – filter to domains assigned to this brand only.
 */
export async function GET(request) {
  try {
    const showAll = request.nextUrl?.searchParams?.get('all') === '1';
    const storeSlug = showAll ? null : (request.nextUrl?.searchParams?.get('store') || DEFAULT_STORE);

    let query = supabaseAdmin
      .from('brand_domains')
      .select('id, domain, is_primary, brand_id, brands(id, slug, name)')
      .order('domain');

    if (storeSlug) {
      const { data: brandRow } = await supabaseAdmin
        .from('brands')
        .select('id')
        .eq('slug', storeSlug)
        .maybeSingle();
      if (brandRow?.id) {
        query = query.eq('brand_id', brandRow.id);
      }
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const domains = (rows || []).map((r) => ({
      id: r.id,
      domain: r.domain,
      is_primary: r.is_primary === true,
      brand_id: r.brand_id,
      brand_name: r.brands?.name || null,
      brand_slug: r.brands?.slug || null,
    }));

    return NextResponse.json({ success: true, domains });
  } catch (e) {
    console.error('config/domains GET error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to list domains' }, { status: 500 });
  }
}
