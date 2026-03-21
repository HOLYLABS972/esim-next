import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET - Return appearance (theme + primaryColor) for the request's domain (Host header).
 * Used by ThemeApplier so each domain (e.g. globalbanka.roamjet.net) can have its own theme and color.
 */
export async function GET(request) {
  try {
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || '';
    const domain = host.split(':')[0].toLowerCase().replace(/^www\./, '').trim() || '';

    const result = { theme: 'light', primaryColor: null };

    if (domain && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('domain_appearance')
        .select('theme, primary_color')
        .eq('domain', domain)
        .maybeSingle();

      if (data) {
        result.theme = data.theme === 'dark' ? 'dark' : 'light';
        result.primaryColor = data.primary_color && /^#[0-9A-Fa-f]{6}$/.test(String(data.primary_color).trim())
          ? String(data.primary_color).trim()
          : null;
        return NextResponse.json(result);
      }
    }

    // Fallback: global appearance from admin_config
    if (supabaseAdmin) {
      const { data: admin } = await supabaseAdmin
        .from('admin_config')
        .select('appearance_theme')
        .limit(1)
        .maybeSingle();
      if (admin?.appearance_theme === 'dark') result.theme = 'dark';
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('domain-appearance GET error:', e);
    return NextResponse.json({ theme: 'light', primaryColor: null });
  }
}
