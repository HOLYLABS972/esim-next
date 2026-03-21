import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import { clearBrandCache } from '../../../../src/lib/brandResolution';

export const dynamic = 'force-dynamic';

/**
 * GET - List all brands (admin panel; layout enforces admin role).
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('brands')
      .select('id, slug, name, logo_url, theme, default_language, supported_languages, is_active, created_at, updated_at')
      .order('name');
    if (error) throw error;
    return NextResponse.json({ success: true, brands: data || [] });
  } catch (e) {
    console.error('config/brands GET error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to list brands' }, { status: 500 });
  }
}

/**
 * POST - Create a new brand (admin panel; layout enforces admin role).
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const slug = (body.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null;
    const name = (body.name || '').trim() || null;
    if (!slug || !name) {
      return NextResponse.json({ success: false, error: 'slug and name are required' }, { status: 400 });
    }
    const theme = body.theme && typeof body.theme === 'object'
      ? body.theme
      : { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' };
    const default_language = ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'].includes(body.default_language)
      ? body.default_language
      : 'en';
    const supported_languages = Array.isArray(body.supported_languages)
      ? body.supported_languages.filter((l) => ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'].includes(l))
      : ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'];

    const { data, error } = await supabaseAdmin
      .from('brands')
      .insert({
        slug,
        name,
        logo_url: body.logo_url || null,
        theme,
        default_language,
        supported_languages,
        is_active: body.is_active !== false,
      })
      .select('id, slug, name, logo_url, theme, default_language, supported_languages, is_active, created_at')
      .single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: 'Brand slug already exists' }, { status: 400 });
      throw error;
    }
    clearBrandCache();
    return NextResponse.json({ success: true, brand: data });
  } catch (e) {
    console.error('config/brands POST error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create brand' }, { status: 500 });
  }
}
