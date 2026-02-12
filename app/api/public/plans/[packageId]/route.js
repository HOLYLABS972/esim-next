import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET endpoint to fetch a single package by ID or slug from Supabase
 */
export async function GET(request, context) {
  try {
    // Support both sync params (Next 14) and Promise params (Next 15)
    const params = typeof context.params?.then === 'function' ? await context.params : context.params;
    const packageId = params?.packageId != null ? String(params.packageId).trim() : null;

    if (!packageId) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    // If someone requests a topup package, strip the -topup suffix and look up the base SIM package
    const topupSuffix = '-topup';
    if (packageId.endsWith(topupSuffix)) {
      const baseId = packageId.slice(0, -topupSuffix.length);
      return NextResponse.json({
        success: false,
        error: 'Topup packages are not available for direct purchase',
        redirect: baseId
      }, { status: 404 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }

    // Prefer slug (package_id) lookup first — URLs use slug so plans are found reliably
    const numericId = parseInt(packageId, 10);
    const isNumericId = !isNaN(numericId) && numericId > 0;

    let plan = null;

    // 1) Try by package_id (slug) first — matches share-package URLs; join esim_countries for DB-sourced names
    const { data: bySlug, error: slugError } = await supabaseAdmin
      .from('esim_packages')
      .select('*, esim_countries(country_name, country_name_ru, country_name_he, country_name_ar)')
      .eq('is_active', true)
      .eq('package_id', packageId)
      .maybeSingle();
    if (slugError && slugError.code !== 'PGRST116') throw slugError;
    plan = bySlug;

    // 2) If not found and packageId looks numeric, try by id
    if (!plan && isNumericId) {
      const { data: byId, error: idError } = await supabaseAdmin
        .from('esim_packages')
        .select('*, esim_countries(country_name, country_name_ru, country_name_he, country_name_ar)')
        .eq('is_active', true)
        .eq('id', numericId)
        .maybeSingle();
      if (idError && idError.code !== 'PGRST116') throw idError;
      plan = byId;
    }

    if (!plan) {
      return NextResponse.json({
        success: false,
        error: 'Package not found',
        requestedId: packageId
      }, { status: 404 });
    }

    // Fetch discount from admin_config
    let discountPct = 0;
    const { data: adminConfig } = await supabaseAdmin.from('admin_config').select('discount_percentage').limit(1).maybeSingle();
    discountPct = Math.max(0, Math.min(100, Number(adminConfig?.discount_percentage) || 0));

    const transformed = transformPlan(plan, discountPct);
    
    console.log('✅ Found package:', transformed.id, 'raw_usd:', plan.price_usd, 'raw_rub:', plan.price_rub, 'disc:', discountPct, 'final_usd:', transformed.price, 'supabase_url:', process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'NONE');
    
    return NextResponse.json({
      success: true,
      _debug: { raw_usd: plan.price_usd, raw_rub: plan.price_rub, discountPct, supabase_url: (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'NONE').replace(/https?:\/\//, '').slice(0, 20), ts: Date.now(), hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
      data: { plan: transformed }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        Pragma: 'no-cache',
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching package from Supabase:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch package', details: error.message },
      { status: 500 }
    );
  }
}

const MIN_PRICE_FLOOR = 0.5;

function transformPlan(plan, discountPct = 0) {
  const isRegionalOrGlobal = plan.package_type === 'regional' || plan.package_type === 'global';
  const rawCountryCode = (plan.country_code && plan.country_code.trim()) || null;
  // For regional/global plans, don't expose the long country_code list
  const countryCode = isRegionalOrGlobal ? null : rawCountryCode;
  const countryCodesArray = countryCode
    ? (countryCode.includes(',') ? countryCode.split(',').map((c) => c.trim()).filter(Boolean) : [countryCode])
    : [];
  // Only from DB (esim_countries join) – no fallbacks
  const dbCountry = plan.esim_countries;
  const countryName = (dbCountry?.country_name && dbCountry.country_name.trim()) || countryCode || '';
  const countryNameRu = (dbCountry?.country_name_ru && dbCountry.country_name_ru.trim()) || null;
  const countryNameHe = (dbCountry?.country_name_he && dbCountry.country_name_he.trim()) || null;
  const countryNameAr = (dbCountry?.country_name_ar && dbCountry.country_name_ar.trim()) || null;
  const flagUrl = countryCode && countryCode.length === 2 ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png` : '';
  
  // Calculate data amount in MB or GB
  const dataMB = plan.data_amount_mb || parseInt(plan.data_amount) || 0;
  const dataGB = dataMB / 1024;
  const dataFormatted = dataGB >= 1 ? `${dataGB}GB` : `${dataMB}MB`;
  
  // Generate clean title
  const cleanTitle = `${dataFormatted} - ${plan.validity_days} days`;

  const applyDiscount = (val) => (val != null && val > 0 ? Math.max(MIN_PRICE_FLOOR, (val * (100 - discountPct)) / 100) : val);
  const origUsd = parseFloat(plan.price_usd) || 0;
  const origRub = parseFloat(plan.price_rub) || null;
  const origIls = parseFloat(plan.price_ils) || null;
  const priceUsd = discountPct > 0 ? applyDiscount(origUsd) : origUsd;
  const priceRub = origRub != null ? (discountPct > 0 ? applyDiscount(origRub) : origRub) : null;
  const priceIls = origIls != null ? (discountPct > 0 ? applyDiscount(origIls) : origIls) : null;

  return {
    _id: plan.id.toString(),
    id: plan.id.toString(),
    slug: plan.package_id || plan.id.toString(),
    package_id: plan.package_id || plan.id.toString(),
    name: cleanTitle,
    title: cleanTitle,
    price: priceUsd,
    price_usd: priceUsd,
    price_rub: priceRub,
    price_ils: priceIls,
    original_price: discountPct > 0 ? origUsd : null,
    original_price_rub: discountPct > 0 && origRub != null ? origRub : null,
    original_price_ils: discountPct > 0 && origIls != null ? origIls : null,
    data: dataMB >= 1024 ? `${(dataMB / 1024).toFixed((dataMB / 1024) % 1 === 0 ? 0 : 1)}GB` : `${dataMB}MB`,
    dataAmount: plan.data_amount || (dataMB >= 1024 ? `${(dataMB / 1024).toFixed((dataMB / 1024) % 1 === 0 ? 0 : 1)}GB` : `${dataMB}MB`),
    capacity: dataMB,
    validity: plan.validity_days ? `${plan.validity_days} days` : 'Unknown',
    validity_days: plan.validity_days || 0,
    period: plan.validity_days || 0,
    duration: plan.validity_days || 0,
    description: `${dataMB}MB - ${plan.validity_days} days`,
    operator: plan.operator || '',
    coverage: plan.package_type || '',
    enabled: plan.is_active,
    is_active: plan.is_active,
    plan_type: plan.package_type || 'local',
    package_type: plan.package_type || 'local',
    country: countryCode,
    country_code: countryCode,
    country_name: countryName,
    country_name_ru: countryNameRu,
    country_name_he: countryNameHe,
    country_name_ar: countryNameAr,
    country_codes: countryCodesArray,
    country_id: plan.country_id,
    flag_url: flagUrl,
    flag: flagUrl,
    is_unlimited: plan.is_unlimited || false,
    voice_included: plan.voice_included || false,
    sms_included: plan.sms_included || false,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at
  };
}
