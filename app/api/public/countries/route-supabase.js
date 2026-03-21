import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET endpoint: countries and pricing from esim_packages only (no esim_countries).
 */
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured.');
    }

    const { data: allPlans, error: plansError } = await supabaseAdmin
      .from('esim_packages')
      .select('country_code, price_usd, is_active, package_type, data_amount_mb, is_unlimited')
      .eq('is_active', true);

    if (plansError) throw plansError;

    const MIN_DATA_MB = 1024;
    const plans = (allPlans || []).filter((p) => {
      const dataMB = p.data_amount_mb;
      if (p.is_unlimited === true) return true;
      if (dataMB == null) return true;
      return dataMB >= MIN_DATA_MB;
    });
    const is1GB = (p) => {
      const mb = p.data_amount_mb ?? (parseInt(p.data_amount, 10) || 0);
      return mb >= 1024 && mb < 2048;
    };
    const codeToPlans = {};
    for (const plan of plans) {
      const code = (plan.country_code || '').trim();
      if (!code) continue;
      if (code.length === 2 && !code.includes(',')) {
        const upper = code.toUpperCase();
        if (!codeToPlans[upper]) codeToPlans[upper] = [];
        codeToPlans[upper].push(plan);
      }
      if (code.includes(',')) {
        for (const c of code.split(',').map((x) => x.trim()).filter(Boolean)) {
          if (c.length === 2) {
            const upper = c.toUpperCase();
            if (!codeToPlans[upper]) codeToPlans[upper] = [];
            codeToPlans[upper].push(plan);
          }
        }
      }
    }

    const countryEntries = Object.entries(codeToPlans).map(([code, countryPlans]) => {
      const plans1GB = countryPlans.filter(is1GB);
      const prices = (plans1GB.length ? plans1GB : countryPlans).map((p) => parseFloat(p.price_usd) || 0).filter((x) => x > 0);
      const minPrice = prices.length ? Math.min(...prices) : 999;
      return {
        id: code,
        _id: code,
        code,
        name: code,
        flagEmoji: '🌍',
        flag: `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
        minPrice,
        plansCount: countryPlans.length,
        isActive: true,
        type: 'country',
      };
    });

    const countriesWithRealPricing = countryEntries.filter(
      (c) => c.minPrice < 999 && c.plansCount > 0
    );
    countriesWithRealPricing.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const globalPlans = plans.filter((p) => p.package_type === 'global');
    const regionalPlans = plans.filter((p) => p.package_type === 'regional');
    const globalPlans1GB = globalPlans.filter(is1GB);
    const regionalPlans1GB = regionalPlans.filter(is1GB);
    const globalPrices = (globalPlans1GB.length ? globalPlans1GB : globalPlans).map((p) => parseFloat(p.price_usd) || 0).filter((x) => x > 0);
    const regionalPrices = (regionalPlans1GB.length ? regionalPlans1GB : regionalPlans).map((p) => parseFloat(p.price_usd) || 0).filter((x) => x > 0);
    const globalMinPrice = globalPrices.length ? Math.min(...globalPrices) : 999;
    const regionalMinPrice = regionalPrices.length ? Math.min(...regionalPrices) : 999;

    const globalEntry =
      globalPlans.length && globalMinPrice < 999
        ? [{ id: 'global-esim', _id: 'global-esim', name: 'Global', code: 'GL', flagEmoji: '🌍', flag: '🌍', minPrice: globalMinPrice, plansCount: globalPlans.length, isActive: true, type: 'global' }]
        : [];
    const regionalEntry =
      regionalPlans.length && regionalMinPrice < 999
        ? [{ id: 'regional-esim', _id: 'regional-esim', name: 'Regional', code: 'RG', flagEmoji: '🗺️', flag: '🗺️', minPrice: regionalMinPrice, plansCount: regionalPlans.length, isActive: true, type: 'regional' }]
        : [];

    const allEntries = [...globalEntry, ...regionalEntry, ...countriesWithRealPricing];

    return NextResponse.json({
      success: true,
      data: {
        countries: allEntries,
        count: allEntries.length,
        source: 'esim_packages_only',
        breakdown: { global: globalEntry.length, regional: regionalEntry.length, countries: countriesWithRealPricing.length },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching countries:', error);
    return NextResponse.json({ error: 'Failed to fetch countries', details: error.message }, { status: 500 });
  }
}
