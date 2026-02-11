import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../src/lib/supabase';
import { clearBrandCache } from '../../../../../../src/lib/brandResolution';

export const dynamic = 'force-dynamic';

function normalizeDomain(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/^www\./, '');
}

/**
 * POST - Add a domain to a brand (admin panel).
 * Body: { domain: string }
 */
export async function POST(request, { params }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ success: false, error: 'Missing brand id' }, { status: 400 });
  try {
    const body = await request.json().catch(() => ({}));
    const domain = normalizeDomain(body.domain);
    if (!domain) return NextResponse.json({ success: false, error: 'domain is required' }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from('brand_domains')
      .insert({ brand_id: id, domain, is_primary: body.is_primary === true })
      .select('id, domain, is_primary')
      .single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: 'Domain already used by another brand' }, { status: 400 });
      if (error.code === '23503') return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
      throw error;
    }
    clearBrandCache();
    return NextResponse.json({ success: true, domain: data });
  } catch (e) {
    console.error('config/brands/[id]/domains POST error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to add domain' }, { status: 500 });
  }
}

/**
 * DELETE - Remove a domain from a brand (admin panel).
 * Query: ?domain=example.com
 */
export async function DELETE(request, { params }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ success: false, error: 'Missing brand id' }, { status: 400 });
  const { searchParams } = new URL(request.url);
  const domain = normalizeDomain(searchParams.get('domain'));
  if (!domain) return NextResponse.json({ success: false, error: 'Query param domain is required' }, { status: 400 });
  try {
    const { error } = await supabaseAdmin
      .from('brand_domains')
      .delete()
      .eq('brand_id', id)
      .eq('domain', domain);
    if (error) throw error;
    clearBrandCache();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('config/brands/[id]/domains DELETE error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to remove domain' }, { status: 500 });
  }
}
