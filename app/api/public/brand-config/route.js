import { NextResponse } from 'next/server';
import { getResolvedBrand } from '../../../../src/lib/brandResolution';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET - Return resolved brand config for the request's domain (Host header).
 * Used by BrandProvider and ThemeApplier: name, logo, theme, languages, payment methods.
 */
export async function GET(request) {
  try {
    const brand = await getResolvedBrand(request);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const domain = host.split(':')[0].toLowerCase().replace(/^www\./, '').trim() || '';

    let theme = { mode: 'light', primaryColor: null, fontHeading: 'Inter', fontBody: 'Inter' };
    let paymentMethods = ['robokassa'];
    let loginMethods = null; // null = all enabled; ['email','google','yandex'] = only these
    let defaultCurrency = 'RUB';
    let brandId = null;
    let slug = process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';
    let name = 'GlobalBanka';
    let logoUrl = null;
    let defaultLanguage = 'en';
    let supportedLanguages = ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'];
    let discountPercentage = 0;

    if (brand) {
      brandId = brand.id;
      slug = brand.slug;
      name = brand.name;
      logoUrl = brand.logo_url;
      defaultLanguage = brand.default_language;
      supportedLanguages = brand.supported_languages ?? supportedLanguages;
      let themeMode = brand.theme?.mode === 'dark' ? 'dark' : 'light';
      let primaryColor = brand.theme?.primaryColor || null;
      let currencyFromDomain = false;
      if (domain && supabaseAdmin) {
        const { data: appearance } = await supabaseAdmin
          .from('domain_appearance')
          .select('theme, primary_color, default_language, default_currency')
          .eq('domain', domain)
          .maybeSingle();
        if (appearance) {
          if (appearance.theme === 'dark') themeMode = 'dark';
          else if (appearance.theme === 'light') themeMode = 'light';
          if (appearance.primary_color && /^#[0-9A-Fa-f]{6}$/.test(String(appearance.primary_color).trim())) {
            primaryColor = appearance.primary_color.trim();
          }
          if (appearance.default_language) defaultLanguage = appearance.default_language;
          if (appearance.default_currency) {
            defaultCurrency = appearance.default_currency;
            currencyFromDomain = true;
          }
        }
      }
      theme = {
        mode: themeMode,
        primaryColor,
        fontHeading: brand.theme?.fontHeading || 'Inter',
        fontBody: brand.theme?.fontBody || 'Inter',
      };
      if (supabaseAdmin) {
        if (!currencyFromDomain) {
          const { data: pay } = await supabaseAdmin
            .from('store_payment_config')
            .select('payment_methods, default_currency, login_methods')
            .eq('store_id', brand.slug)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          if (pay) {
            paymentMethods = Array.isArray(pay.payment_methods) ? pay.payment_methods : ['robokassa'];
            defaultCurrency = pay.default_currency || 'RUB';
            loginMethods = Array.isArray(pay.login_methods) ? pay.login_methods : null;
          }
        } else {
          const { data: pay } = await supabaseAdmin
            .from('store_payment_config')
            .select('payment_methods, login_methods')
            .eq('store_id', brand.slug)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          if (pay) {
            paymentMethods = Array.isArray(pay.payment_methods) ? pay.payment_methods : ['robokassa'];
            loginMethods = Array.isArray(pay.login_methods) ? pay.login_methods : null;
          }
        }
        const { data: adminConfig } = await supabaseAdmin.from('admin_config').select('discount_percentage').maybeSingle();
        discountPercentage = Number(adminConfig?.discount_percentage) || 0;
      }
    } else {
      // Fallback: domain_appearance, store_payment_config for default store
      let gotCurrencyFromDomain = false;
      if (domain && supabaseAdmin) {
        const { data: appearance } = await supabaseAdmin
          .from('domain_appearance')
          .select('theme, primary_color, default_language, default_currency')
          .eq('domain', domain)
          .maybeSingle();
        if (appearance) {
          theme.mode = appearance.theme === 'dark' ? 'dark' : 'light';
          theme.primaryColor = appearance.primary_color && /^#[0-9A-Fa-f]{6}$/.test(String(appearance.primary_color).trim())
            ? appearance.primary_color.trim()
            : null;
          if (appearance.default_language) defaultLanguage = appearance.default_language;
          if (appearance.default_currency) {
            defaultCurrency = appearance.default_currency;
            gotCurrencyFromDomain = true;
          }
        }
        const { data: adminConfig } = await supabaseAdmin.from('admin_config').select('discount_percentage').maybeSingle();
        discountPercentage = Number(adminConfig?.discount_percentage) || 0;
      }
      if (supabaseAdmin) {
        const { data: pay } = await supabaseAdmin
          .from('store_payment_config')
          .select('payment_methods, default_currency, login_methods')
          .eq('store_id', slug)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (pay) {
          paymentMethods = Array.isArray(pay.payment_methods) ? pay.payment_methods : ['robokassa'];
          if (!gotCurrencyFromDomain) defaultCurrency = pay.default_currency || 'RUB';
          loginMethods = Array.isArray(pay.login_methods) ? pay.login_methods : null;
        }
      }
    }

    return NextResponse.json(
      {
        brandId,
        slug,
        name,
        logoUrl,
        theme,
        defaultLanguage,
        supportedLanguages,
        paymentMethods,
        loginMethods,
        defaultCurrency,
        discountPercentage,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error('brand-config GET error:', e);
    return NextResponse.json({
      brandId: null,
      slug: process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka',
      name: 'GlobalBanka',
      logoUrl: null,
      theme: { mode: 'light', primaryColor: null, fontHeading: 'Inter', fontBody: 'Inter' },
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'],
      paymentMethods: ['robokassa'],
      loginMethods: null,
      defaultCurrency: 'RUB',
      discountPercentage: 0,
    });
  }
}
