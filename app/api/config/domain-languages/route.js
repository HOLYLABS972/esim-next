import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_LANGUAGES = ['en', 'ru', 'he', 'es', 'fr', 'de', 'ar'];

/**
 * GET - List all domain -> default language (for config UI)
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    const { data, error } = await supabaseAdmin
      .from('domain_default_language')
      .select('domain, default_language, updated_at')
      .order('domain');
    if (error) {
      console.error('domain-languages GET error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, domains: data || [] });
  } catch (e) {
    console.error('domain-languages GET error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * POST - Set default language for a domain
 * Body: { domain: "ru.roamjet.net", defaultLanguage: "ru" }
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    const body = await request.json().catch(() => ({}));
    const domain = (body.domain || '').trim().toLowerCase().replace(/^www\./, '').split('/')[0];
    let defaultLanguage = (body.defaultLanguage || body.default_language || 'en').trim().toLowerCase();
    if (!domain) {
      return NextResponse.json({ success: false, error: 'domain is required' }, { status: 400 });
    }
    if (!ALLOWED_LANGUAGES.includes(defaultLanguage)) {
      defaultLanguage = 'en';
    }
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('domain_default_language')
      .upsert(
        { domain, default_language: defaultLanguage, updated_at: now },
        { onConflict: 'domain' }
      );
    if (error) {
      console.error('domain-languages POST error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, domain, defaultLanguage });
  } catch (e) {
    console.error('domain-languages POST error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * DELETE - Remove default language for a domain
 * Query: ?domain=hopjob.roamjet.net
 */
export async function DELETE(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    const url = request.nextUrl || new URL(request.url);
    const domain = (url.searchParams.get('domain') || '').trim().toLowerCase().replace(/^www\./, '').split('/')[0];
    if (!domain) {
      return NextResponse.json({ success: false, error: 'domain query is required' }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('domain_default_language')
      .delete()
      .eq('domain', domain);
    if (error) {
      console.error('domain-languages DELETE error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, domain });
  } catch (e) {
    console.error('domain-languages DELETE error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
