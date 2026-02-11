import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_THEMES = ['light', 'dark'];

/**
 * GET - Fetch appearance theme (for config UI)
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    const { data, error } = await supabaseAdmin
      .from('admin_config')
      .select('appearance_theme')
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('appearance GET error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    const theme = ALLOWED_THEMES.includes(data?.appearance_theme) ? data.appearance_theme : 'light';
    return NextResponse.json({ success: true, theme });
  } catch (e) {
    console.error('appearance GET error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * POST - Save appearance theme
 * Body: { theme: 'light' | 'dark' }
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    const body = await request.json().catch(() => ({}));
    const theme = (body.theme || 'light').toLowerCase();
    const value = ALLOWED_THEMES.includes(theme) ? theme : 'light';

    const { data: existing } = await supabaseAdmin
      .from('admin_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing) {
      const { error } = await supabaseAdmin
        .from('admin_config')
        .update({ appearance_theme: value, updated_at: now })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('admin_config')
        .insert({ appearance_theme: value, created_at: now, updated_at: now });
      if (error) throw error;
    }

    return NextResponse.json({ success: true, theme: value });
  } catch (e) {
    console.error('appearance POST error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
