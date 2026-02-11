import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET endpoint: countries and pricing from esim_packages; names (incl. Hebrew) from esim_countries when available (server/DB, like prices).
 */
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    const { data: allPlans, error: plansError } = await supabaseAdmin
      .from('esim_packages')
      .select('country_code, price_usd, price_rub, price_ils, price_aud, price_eur, price_cad, is_active, package_type, data_amount_mb, is_unlimited')
      .eq('is_active', true);

    if (plansError) throw plansError;

    // Discount from admin_config – apply to all min prices so home page "from X" matches admin Site config
    let discountPct = 0;
    const { data: adminConfig } = await supabaseAdmin.from('admin_config').select('discount_percentage').limit(1).maybeSingle();
    discountPct = Math.max(0, Math.min(100, Number(adminConfig?.discount_percentage) || 0));
    const MIN_PRICE_FLOOR = 0.5;
    const applyDiscount = (price) => (price != null && price > 0 ? Math.max(MIN_PRICE_FLOOR, (price * (100 - discountPct)) / 100) : price);

    // Only include plans 1GB+ or unlimited (exclude 100MB, 500MB, etc.)
    const MIN_DATA_MB = 1024;
    const plans = (allPlans || []).filter((p) => {
      const dataMB = p.data_amount_mb;
      const isUnlimited = p.is_unlimited === true;
      if (isUnlimited) return true;
      if (dataMB == null) return true; // unknown data – keep
      return dataMB >= MIN_DATA_MB;
    });
    console.log(`📦 Loaded ${plans.length} plans (1GB+ only)`);

    // Single-country: distinct 2-letter country_code (exclude regional like "EU-42" or "NO,RS,DE")
    const codeToPlans = {};
    for (const plan of plans) {
      const code = (plan.country_code || '').trim();
      if (!code) continue;
      // Single country: 2-letter code, no comma
      if (code.length === 2 && !code.includes(',')) {
        const upper = code.toUpperCase();
        if (!codeToPlans[upper]) codeToPlans[upper] = [];
        codeToPlans[upper].push(plan);
      }
      // Regional: code contains comma (e.g. "NO,RS,DE") – each code gets the plan for pricing
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

    // Fetch ALL countries from esim_countries (not just those with packages)
    let dbNamesByCode = {};
    const { data: allDbCountries } = await supabaseAdmin
      .from('esim_countries')
      .select('airalo_country_code, country_name, country_name_ru, country_name_he, country_name_ar')
      .eq('is_visible', true); // Only fetch visible countries

    console.log(`🗂️ esim_countries query returned ${allDbCountries?.length ?? 0} rows`);
    if (allDbCountries && allDbCountries.length > 0) {
      // Debug: log first row to verify columns
      const sample = allDbCountries.find(r => r.airalo_country_code === 'TR') || allDbCountries[0];
      console.log(`🔍 Sample row:`, JSON.stringify(sample));
      for (const row of allDbCountries) {
        const c = (row.airalo_country_code || '').toUpperCase();
        if (c) dbNamesByCode[c] = row;
      }
    }

    // Add countries from DB that don't have packages yet
    for (const code of Object.keys(dbNamesByCode)) {
      if (!codeToPlans[code]) {
        codeToPlans[code] = []; // Empty array = no packages yet
      }
    }

    // Min price = min among 1GB plans only (so home "from X" matches share page 1GB)
    const ONE_GB_MB = 1024;
    const is1GB = (p) => {
      const mb = p.data_amount_mb ?? (parseInt(p.data_amount, 10) || 0);
      return mb >= ONE_GB_MB && mb < 2048;
    };
    const countryEntries = Object.entries(codeToPlans).map(([code, countryPlans]) => {
      const plans1GB = countryPlans.filter(is1GB);
      const subset = plans1GB.length ? plans1GB : countryPlans;
      const prices = subset.map((p) => parseFloat(p.price_usd) || 0).filter((x) => x > 0);
      const minPriceRaw = prices.length ? Math.min(...prices) : 999;
      const minPriceOriginal = minPriceRaw < 999 ? minPriceRaw : null;
      const minPrice = minPriceRaw < 999 ? applyDiscount(minPriceRaw) : 999;
      const pricesRub = subset.map((p) => parseFloat(p.price_rub) || 0).filter((x) => x > 0);
      const minPriceRubOriginal = pricesRub.length ? Math.min(...pricesRub) : null;
      const minPriceRub = pricesRub.length ? applyDiscount(Math.min(...pricesRub)) : null;
      const pricesIls = subset.map((p) => parseFloat(p.price_ils) || 0).filter((x) => x > 0);
      const minPriceIlsOriginal = pricesIls.length ? Math.min(...pricesIls) : null;
      const minPriceIls = pricesIls.length ? applyDiscount(Math.min(...pricesIls)) : null;
      const pricesAud = subset.map((p) => parseFloat(p.price_aud) || 0).filter((x) => x > 0);
      const minPriceAud = pricesAud.length ? applyDiscount(Math.min(...pricesAud)) : null;
      const pricesEur = subset.map((p) => parseFloat(p.price_eur) || 0).filter((x) => x > 0);
      const minPriceEur = pricesEur.length ? applyDiscount(Math.min(...pricesEur)) : null;
      const pricesCad = subset.map((p) => parseFloat(p.price_cad) || 0).filter((x) => x > 0);
      const minPriceCad = pricesCad.length ? applyDiscount(Math.min(...pricesCad)) : null;
      const dbRow = dbNamesByCode[code];
      // Only from DB – no fallbacks (add missing names in DB)
      const name = (dbRow?.country_name && dbRow.country_name.trim()) ? dbRow.country_name : code;
      const nameRu = (dbRow?.country_name_ru && dbRow.country_name_ru.trim()) ? dbRow.country_name_ru : null;
      const nameHe = (dbRow?.country_name_he && dbRow.country_name_he.trim()) ? dbRow.country_name_he : null;
      const nameAr = (dbRow?.country_name_ar && dbRow.country_name_ar.trim()) ? dbRow.country_name_ar : null;
      return {
        id: code,
        _id: code,
        code,
        name,
        name_ru: nameRu,
        country_name_ru: nameRu,
        name_he: nameHe,
        country_name_he: nameHe,
        name_ar: nameAr,
        country_name_ar: nameAr,
        flag: `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
        flagUrl: `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
        image: `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
        minPrice,
        minPriceOriginal,
        minPriceRub,
        minPriceRubOriginal,
        minPriceIls,
        minPriceIlsOriginal,
        minPriceAud,
        minPriceEur,
        minPriceCad,
        plansCount: 5, // Hardcoded: all countries display 5 plans
        isActive: true,
        type: 'country',
      };
    });

    // Show ALL countries - both with packages and without (coming soon)
    const allCountries = countryEntries;
    allCountries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Global / Regional: min price = min among 1GB plans only (match share page)
    const globalPlans = plans.filter((p) => p.package_type === 'global');
    const regionalPlans = plans.filter((p) => p.package_type === 'regional');
    const globalSubset = (globalPlans.filter(is1GB).length ? globalPlans.filter(is1GB) : globalPlans);
    const regionalSubset = (regionalPlans.filter(is1GB).length ? regionalPlans.filter(is1GB) : regionalPlans);
    const globalPrices = globalSubset.map((p) => parseFloat(p.price_usd) || 0).filter((x) => x > 0);
    const regionalPrices = regionalSubset.map((p) => parseFloat(p.price_usd) || 0).filter((x) => x > 0);
    const globalMinPriceRaw = globalPrices.length ? Math.min(...globalPrices) : 999;
    const regionalMinPriceRaw = regionalPrices.length ? Math.min(...regionalPrices) : 999;
    const globalMinPriceOriginal = globalMinPriceRaw < 999 ? globalMinPriceRaw : null;
    const regionalMinPriceOriginal = regionalMinPriceRaw < 999 ? regionalMinPriceRaw : null;
    const globalMinPrice = globalMinPriceRaw < 999 ? applyDiscount(globalMinPriceRaw) : 999;
    const regionalMinPrice = regionalMinPriceRaw < 999 ? applyDiscount(regionalMinPriceRaw) : 999;
    const globalPricesRub = globalSubset.map((p) => parseFloat(p.price_rub) || 0).filter((x) => x > 0);
    const regionalPricesRub = regionalSubset.map((p) => parseFloat(p.price_rub) || 0).filter((x) => x > 0);
    const globalMinPriceRub = globalPricesRub.length ? applyDiscount(Math.min(...globalPricesRub)) : null;
    const regionalMinPriceRub = regionalPricesRub.length ? applyDiscount(Math.min(...regionalPricesRub)) : null;
    const globalPricesIls = globalSubset.map((p) => parseFloat(p.price_ils) || 0).filter((x) => x > 0);
    const regionalPricesIls = regionalSubset.map((p) => parseFloat(p.price_ils) || 0).filter((x) => x > 0);
    const globalMinPriceIls = globalPricesIls.length ? applyDiscount(Math.min(...globalPricesIls)) : null;
    const regionalMinPriceIls = regionalPricesIls.length ? applyDiscount(Math.min(...regionalPricesIls)) : null;
    const globalPricesAud = globalSubset.map((p) => parseFloat(p.price_aud) || 0).filter((x) => x > 0);
    const regionalPricesAud = regionalSubset.map((p) => parseFloat(p.price_aud) || 0).filter((x) => x > 0);
    const globalMinPriceAud = globalPricesAud.length ? applyDiscount(Math.min(...globalPricesAud)) : null;
    const regionalMinPriceAud = regionalPricesAud.length ? applyDiscount(Math.min(...regionalPricesAud)) : null;
    const globalPricesEur = globalSubset.map((p) => parseFloat(p.price_eur) || 0).filter((x) => x > 0);
    const regionalPricesEur = regionalSubset.map((p) => parseFloat(p.price_eur) || 0).filter((x) => x > 0);
    const globalMinPriceEur = globalPricesEur.length ? applyDiscount(Math.min(...globalPricesEur)) : null;
    const regionalMinPriceEur = regionalPricesEur.length ? applyDiscount(Math.min(...regionalPricesEur)) : null;
    const globalPricesCad = globalSubset.map((p) => parseFloat(p.price_cad) || 0).filter((x) => x > 0);
    const regionalPricesCad = regionalSubset.map((p) => parseFloat(p.price_cad) || 0).filter((x) => x > 0);
    const globalMinPriceCad = globalPricesCad.length ? applyDiscount(Math.min(...globalPricesCad)) : null;
    const regionalMinPriceCad = regionalPricesCad.length ? applyDiscount(Math.min(...regionalPricesCad)) : null;

    // Labels from DB (ui_labels) – global, regional, and region_* (all locales)
    const { data: labelRows } = await supabaseAdmin
      .from('ui_labels')
      .select('key, locale, value');
    const labelsByKey = {};
    const regionsByKey = {}; // region_Europe -> { en, ru, he, ar }
    for (const row of labelRows || []) {
      if (!row.key) continue;
      if (row.key === 'global' || row.key === 'regional') {
        if (!labelsByKey[row.key]) labelsByKey[row.key] = {};
        labelsByKey[row.key][row.locale] = row.value;
      } else if (row.key.startsWith('region_')) {
        const regionName = row.key.replace(/^region_/, '');
        if (!regionsByKey[regionName]) regionsByKey[regionName] = {};
        regionsByKey[regionName][row.locale] = row.value;
      }
    }
    // Always from DB – no fallback
    const globalNameEn = labelsByKey.global?.en ?? '';
    const globalNameRu = labelsByKey.global?.ru ?? '';
    const globalNameHe = labelsByKey.global?.he ?? '';
    const globalNameAr = labelsByKey.global?.ar ?? '';
    const regionalNameEn = labelsByKey.regional?.en ?? '';
    const regionalNameRu = labelsByKey.regional?.ru ?? '';
    const regionalNameHe = labelsByKey.regional?.he ?? '';
    const regionalNameAr = labelsByKey.regional?.ar ?? '';

    const globalEntry =
      globalPlans.length && globalMinPrice < 999
        ? [
            {
              id: 'global-esim',
              _id: 'global-esim',
              name: globalNameEn,
              name_ru: globalNameRu,
              name_he: globalNameHe,
              name_ar: globalNameAr,
              code: 'GL',
              flagEmoji: '🌍',
              flag: '🌍',
              region: globalNameEn,
              continent: globalNameEn,
              minPrice: globalMinPrice,
              minPriceOriginal: globalMinPriceOriginal,
              minPriceRub: globalMinPriceRub,
              minPriceIls: globalMinPriceIls,
              minPriceAud: globalMinPriceAud,
              minPriceEur: globalMinPriceEur,
              minPriceCad: globalMinPriceCad,
              plansCount: 5,
              isActive: true,
              type: 'global',
            },
          ]
        : [];
    const regionalEntry =
      regionalPlans.length && regionalMinPrice < 999
        ? [
            {
              id: 'regional-esim',
              _id: 'regional-esim',
              name: regionalNameEn,
              name_ru: regionalNameRu,
              name_he: regionalNameHe,
              name_ar: regionalNameAr,
              code: 'RG',
              flagEmoji: '🗺️',
              flag: '🗺️',
              region: regionalNameEn,
              continent: regionalNameEn,
              minPrice: regionalMinPrice,
              minPriceOriginal: regionalMinPriceOriginal,
              minPriceRub: regionalMinPriceRub,
              minPriceIls: regionalMinPriceIls,
              minPriceAud: regionalMinPriceAud,
              minPriceEur: regionalMinPriceEur,
              minPriceCad: regionalMinPriceCad,
              plansCount: 5,
              isActive: true,
              type: 'regional',
            },
          ]
        : [];

    const allEntries = [...globalEntry, ...regionalEntry, ...allCountries];

    // Labels by locale – always from DB only (no fallback)
    const labels = {
      global: { en: globalNameEn, ru: globalNameRu, he: globalNameHe, ar: globalNameAr },
      regional: { en: regionalNameEn, ru: regionalNameRu, he: regionalNameHe, ar: regionalNameAr },
      regions: regionsByKey,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          countries: allEntries,
          labels,
          discountPercentage: discountPct,
          count: allEntries.length,
          source: 'esim_packages_only',
          breakdown: {
            global: globalEntry.length,
            regional: regionalEntry.length,
            countries: allCountries.length,
            withPackages: allCountries.filter(c => c.minPrice < 999).length,
            withoutPackages: allCountries.filter(c => c.minPrice >= 999).length,
          },
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error fetching countries from esim_packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries', details: error.message },
      { status: 500 }
    );
  }
}
// force redeploy 1770841686
