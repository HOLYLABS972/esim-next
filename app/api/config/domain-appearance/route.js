import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_THEMES = ['light', 'dark'];

function normalizeDomain(v) {
  return (v || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

/**
 * GET - List all domain appearances (for config UI).
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    const { data, error } = await supabaseAdmin
      .from('domain_appearance')
      .select('domain, theme, primary_color, updated_at')
      .order('domain');
    if (error) throw error;
    return NextResponse.json({ success: true, domains: data || [] });
  } catch (e) {
    console.error('domain-appearance GET error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * POST - Set appearance for a domain.
 * Body: { domain: "globalbanka.roamjet.net", theme: "dark", primaryColor?: "#468BE6" }
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    const body = await request.json().catch(() => ({}));
    const domain = normalizeDomain(body.domain);
    if (!domain) {
      return NextResponse.json({ success: false, error: 'domain is required' }, { status: 400 });
    }
    const theme = ALLOWED_THEMES.includes(body.theme) ? body.theme : 'light';
    const raw = body.primaryColor != null ? String(body.primaryColor).trim() : '';
    const primaryColor =
      raw === '' ? null : (/^#[0-9A-Fa-f]{6}$/.test(raw) ? raw : null);

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('domain_appearance')
      .upsert(
        { domain, theme, primary_color: primaryColor, updated_at: now },
        { onConflict: 'domain' }
      );
    if (error) throw error;
    return NextResponse.json({ success: true, domain, theme, primaryColor });
  } catch (e) {
    console.error('domain-appearance POST error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * DELETE - Remove appearance for a domain.
 * Query: ?domain=globalbanka.roamjet.net
 */
export async function DELETE(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    const url = request.nextUrl || new URL(request.url);
    const domain = normalizeDomain(url.searchParams.get('domain'));
    if (!domain) {
      return NextResponse.json({ success: false, error: 'domain query is required' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('domain_appearance').delete().eq('domain', domain);
    if (error) throw error;
    return NextResponse.json({ success: true, domain });
  } catch (e) {
    console.error('domain-appearance DELETE error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
