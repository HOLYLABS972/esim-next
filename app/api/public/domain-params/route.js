import { NextResponse } from 'next/server';
import { getResolvedBrand } from '../../../../src/lib/brandResolution';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET - Return language, currency, theme for the request's domain (Host header).
 * Used by middleware to add ?language=&currency=&theme= to the link. All from DB (brands, brand_domains, store_payment_config, domain_default_language, domain_appearance).
 */
export async function GET(request) {
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const domain = host.split(':')[0].toLowerCase().replace(/^www\./, '').trim() || '';

    let language = 'en';
    let currency = 'USD';
    let theme = 'light';

    // Check domain_appearance first – per-domain override, fresh DB read (no brand cache)
    let themeFromDomain = null;
    let languageFromDomain = null;
    let currencyFromDomain = null;
    if (domain && supabaseAdmin) {
      const { data: appearance } = await supabaseAdmin
        .from('domain_appearance')
        .select('theme, default_language, default_currency')
        .eq('domain', domain)
        .maybeSingle();
      if (appearance) {
        if (appearance.theme === 'dark') themeFromDomain = 'dark';
        else if (appearance.theme === 'light') themeFromDomain = 'light';
        if (appearance.default_language) languageFromDomain = appearance.default_language;
        if (appearance.default_currency) currencyFromDomain = appearance.default_currency;
      }
    }

    const brand = await getResolvedBrand(request);

    if (brand) {
      language = languageFromDomain ?? brand.default_language ?? 'en';
      theme = themeFromDomain ?? (brand.theme?.mode === 'dark' ? 'dark' : 'light');
      if (!currencyFromDomain && supabaseAdmin) {
        const { data: pay } = await supabaseAdmin
          .from('store_payment_config')
          .select('default_currency')
          .eq('store_id', brand.slug)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (pay?.default_currency) currency = pay.default_currency;
      } else if (currencyFromDomain) {
        currency = currencyFromDomain;
      }
    } else if (domain && supabaseAdmin) {
      const { data: langRow } = await supabaseAdmin
        .from('domain_default_language')
        .select('default_language')
        .eq('domain', domain)
        .maybeSingle();
      if (langRow?.default_language) language = langRow.default_language;

      const { data: appearance } = await supabaseAdmin
        .from('domain_appearance')
        .select('theme')
        .eq('domain', domain)
        .maybeSingle();
      if (appearance?.theme === 'dark') theme = 'dark';

      const defaultSlug = process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';
      const { data: pay } = await supabaseAdmin
        .from('store_payment_config')
        .select('default_currency')
        .eq('store_id', defaultSlug)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (pay?.default_currency) currency = pay.default_currency;
    }

    return NextResponse.json(
      { language, currency: (currency || 'USD').toUpperCase(), theme },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error('domain-params GET error:', e);
    return NextResponse.json(
      { language: 'en', currency: 'USD', theme: 'light' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
