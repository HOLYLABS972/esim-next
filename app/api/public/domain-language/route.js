import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import { getBrandByDomain, getResolvedBrand } from '../../../../src/lib/brandResolution';

export const dynamic = 'force-dynamic';

/**
 * GET - Return default language for the request's domain (Host header).
 * All from DB: domain_default_language table > brand from domain > resolved brand (default) > 'en'.
 * Used by I18n so brand default language applies per domain and home page respects admin Site config.
 */
export async function GET(request) {
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const domain = host.split(':')[0].toLowerCase().replace(/^www\./, '').trim() || '';

    if (!domain) {
      return jsonWithNoCache('en');
    }

    if (supabaseAdmin) {
      const { data: appearance } = await supabaseAdmin
        .from('domain_appearance')
        .select('default_language')
        .eq('domain', domain)
        .maybeSingle();
      if (appearance?.default_language) {
        return jsonWithNoCache(appearance.default_language);
      }

      const { data } = await supabaseAdmin
        .from('domain_default_language')
        .select('default_language')
        .eq('domain', domain)
        .maybeSingle();
      if (data?.default_language) {
        return jsonWithNoCache(data.default_language);
      }
    }

    const brand = await getBrandByDomain(domain);
    if (brand?.default_language) {
      return jsonWithNoCache(brand.default_language);
    }

    // Fallback: resolved brand (default brand for localhost/unmatched domains) so admin Site config applies
    const resolvedBrand = await getResolvedBrand(request);
    if (resolvedBrand?.default_language) {
      return jsonWithNoCache(resolvedBrand.default_language);
    }

    return jsonWithNoCache('en');
  } catch (e) {
    console.error('domain-language GET error:', e);
    return jsonWithNoCache('en');
  }
}

function jsonWithNoCache(defaultLanguage) {
  return NextResponse.json(
    { defaultLanguage },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    }
  );
}
