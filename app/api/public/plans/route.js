import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET endpoint to fetch plans from Supabase
 * Supports filtering by country code, plan type
 */
export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country');
    const planType = searchParams.get('type'); // 'global', 'regional', 'data'
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    console.log('📦 Fetching plans from Supabase...', { countryCode, planType, limit, keyType: (process.env.SUPABASE_SERVICE_JWT || '').slice(0, 5) || (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 5) || 'NONE' });
    
    let query = supabaseAdmin
      .from('esim_packages')
      .select('id, slug, package_id, title, title_ru, operator, country_code, country_id, price_usd, price_rub, price_ils, price_eur, price_aud, price_cad, data_amount, data_amount_mb, validity_days, is_active, is_unlimited, package_type, plan_type, region_id, voice_included, sms_included, speed, created_at, updated_at')
      .eq('is_active', true);
    
    // Filter out topup plans - we'll filter in JS code instead of query to avoid null issues
    
    // Filter by country or global/regional (GL/RG open bottom sheet for global/regional tariffs)
    if (countryCode) {
      const codeUpper = countryCode.toUpperCase();
      if (codeUpper === 'GL') {
        query = query.eq('package_type', 'global');
      } else if (codeUpper === 'RG') {
        query = query.eq('package_type', 'regional');
      } else {
        // For country-specific queries, only return local plans for that country
        query = query.eq('country_code', codeUpper);
        query = query.or(`package_type.eq.local,package_type.is.null`); // Only local plans
      }
    }
    
    // Filter by plan type if provided (e.g. ?type=global)
    if (planType) {
      query = query.eq('package_type', planType);
    }
    
    // Order and limit
    query = query
      .order('price_usd', { ascending: true })
      .limit(limit);

    const { data: plans, error } = await query;

    if (error) {
      console.error('❌ Supabase query error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log(`✅ Loaded ${plans?.length || 0} plans from Supabase (esim_packages only)`, { error, firstPlanId: plans?.[0]?.id });
    
    // Transform Supabase data to match expected format (country from package.country_code only)
    // STRICTLY filter out topup plans - keep unlimited and SMS plans so they can be filtered by the UI
    const filteredPlans = (plans || []).filter(plan => {
      // Check all possible topup indicators
      const planType = (plan.plan_type || plan.package_type || '').toLowerCase();
      const titleLower = (plan.title || plan.title_ru || plan.name || '').toLowerCase();
      const descriptionLower = (plan.description || '').toLowerCase();
      // CRITICAL: Check slug field separately - this is where topups are usually identified
      const slugLower = (plan.package_id || plan.slug || '').toLowerCase();
      
      // Comprehensive topup detection - CHECK SLUG EXPLICITLY
      const isTopup = 
        plan.is_topup === true || 
        plan.is_topup_package === true ||
        plan.available_for_topup === true ||
        planType === 'topup' || 
        planType === 'top-up' ||
        slugLower.includes('topup') ||
        slugLower.includes('top-up') ||
        slugLower.includes('top up') ||
        slugLower.includes('топ-ап') ||
        slugLower.includes('топап') ||
        titleLower.includes('topup') ||
        titleLower.includes('top-up') ||
        titleLower.includes('top up') ||
        titleLower.includes('топ-ап') ||
        titleLower.includes('топап') ||
        descriptionLower.includes('topup') ||
        descriptionLower.includes('top-up') ||
        descriptionLower.includes('top up') ||
        descriptionLower.includes('топ-ап') ||
        descriptionLower.includes('топап');
      
      if (isTopup) {
        console.log('🚫 API: Filtered out topup plan:', {
          id: plan.id,
          slug: plan.package_id || plan.slug,
          title: plan.title || plan.name,
          planType: plan.plan_type || plan.package_type
        });
        return false;
      }
      
      // Only packages with 1GB+ data (or unlimited)
      const dataMB = plan.data_amount_mb ?? (parseInt(plan.data_amount, 10) || 0);
      const isUnlimited = plan.is_unlimited === true || dataMB === 0;
      if (isUnlimited) return true;
      if (!dataMB || dataMB < 1024) return false; // Keep minimum 1GB requirement

      // REMOVED: Strict tier matching - now allows any data amount >= 1GB
      // const ALLOWED_MB = [1024, 2048, 3072, 5120, 10240, 20480, 51200, 102400];
      // const matchesTier = ALLOWED_MB.some((tier) => Math.abs(dataMB - tier) < 100);
      // if (!matchesTier) return false;

      return true;
    });
    
    // Deduplicate: one cheapest plan per (country/type, data tier, validity_days)
    const tierKey = (p) => {
      const dataMB = p.data_amount_mb ?? (parseInt(p.data_amount, 10) || 0);
      const tier = [1024, 2048, 3072, 5120, 10240, 20480, 51200, 102400].find((t) => Math.abs((dataMB || 0) - t) < 100) || (p.is_unlimited ? 'unlimited' : dataMB);
      const scope = (p.package_type === 'global') ? 'GL' : (p.package_type === 'regional') ? `RG:${p.operator || p.slug || ''}` : (p.country_code || '');
      // Separate SMS/voice plans from data-only plans so they don't get deduped together
      const planVariant = (p.sms_included || p.voice_included) ? 'sms' : p.is_unlimited ? 'unlim' : 'data';
      return `${scope}|${tier}|${p.validity_days ?? 0}|${planVariant}`;
    };
    const byKey = new Map();
    for (const plan of filteredPlans) {
      const key = tierKey(plan);
      const price = parseFloat(plan.price_usd) || 999;
      if (!byKey.has(key) || price < (parseFloat(byKey.get(key).price_usd) || 999)) {
        byKey.set(key, plan);
      }
    }
    const dedupedPlans = Array.from(byKey.values());

    // Fetch discount from admin_config
    let discountPct = 0;
    const { data: adminConfig } = await supabaseAdmin.from('admin_config').select('discount_percentage').limit(1).maybeSingle();
    discountPct = Math.max(0, Math.min(100, Number(adminConfig?.discount_percentage) || 0));
    const MIN_PRICE_FLOOR = 0.5;
    const applyDiscount = (val) => (val != null && val > 0 ? Math.max(MIN_PRICE_FLOOR, (val * (100 - discountPct)) / 100) : val);

    const transformedPlans = dedupedPlans.map(plan => {
      const isRegionalOrGlobal = plan.package_type === 'regional' || plan.package_type === 'global';
      const rawCountryCode = (plan.country_code && plan.country_code.trim()) || null;
      // For regional/global plans, don't expose the long country_code list — use null
      const countryCode = isRegionalOrGlobal ? null : rawCountryCode;
      const countryCodesArray = countryCode ? (countryCode.includes(',') ? countryCode.split(',').map(c => c.trim()).filter(Boolean) : [countryCode]) : [];
      
      // Calculate data amount in MB or GB
      const dataMB = plan.data_amount_mb || parseInt(plan.data_amount) || 0;
      const dataGB = dataMB / 1024;
      const dataFormatted = dataGB >= 1 ? `${dataGB}GB` : `${dataMB}MB`;
      
      // Generate clean title with correct units
      const cleanTitle = `${dataFormatted} - ${plan.validity_days} days`;
      
      const origUsd = parseFloat(plan.price_usd) || 0;
      const origRub = parseFloat(plan.price_rub) || 0;
      const origIls = parseFloat(plan.price_ils) || 0;
      const priceUsd = discountPct > 0 ? applyDiscount(origUsd) : origUsd;
      const priceRub = discountPct > 0 ? applyDiscount(origRub) : origRub;
      const priceIls = discountPct > 0 ? applyDiscount(origIls) : origIls;

      return {
        _id: plan.id.toString(),
        id: plan.id.toString(),
        slug: plan.slug || plan.package_id || plan.id.toString(),
        package_id: plan.package_id || plan.slug || plan.id.toString(),
        name: cleanTitle,  // Use generated clean title (English fallback)
        title: plan.title || cleanTitle,  // Use database title if available, otherwise generated
        title_ru: plan.title_ru || null,  // CRITICAL: Include Russian title from database
        price: priceUsd,
        price_rub: priceRub,
        price_ils: priceIls,
        data: `${dataMB}MB`,  // Always in MB for consistency
        validity: plan.validity_days ? `${plan.validity_days} days` : 'Unknown',
        period: plan.validity_days,
        duration: plan.validity_days,
        description: `${dataMB}MB - ${plan.validity_days} days`,
        operator: plan.operator || '',
        coverage: plan.package_type || '',
        enabled: plan.is_active,
        is_active: plan.is_active,
        plan_type: plan.package_type || 'local',
        package_type: plan.package_type || 'local',
        country: countryCode,
        country_codes: countryCodesArray,
        is_unlimited: plan.is_unlimited || false,
        sms_included: plan.sms_included || false,
        day: plan.validity_days,
        data_amount_mb: dataMB,
        country_name: plan.country_name || null,
        country_name_ru: plan.country_name_ru || null,
        country_name_he: plan.country_name_he || null,
        country_name_ar: plan.country_name_ar || null,
        original_price: discountPct > 0 ? origUsd : null,
        original_price_rub: discountPct > 0 ? origRub : null,
        original_price_ils: discountPct > 0 ? origIls : null,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
      };
    });
    
    return NextResponse.json(
      {
        success: true,
        data: {
          plans: transformedPlans,
          count: transformedPlans.length,
          source: 'supabase',
          _debug: { rawCount: plans?.length || 0, filteredCount: filteredPlans?.length || 0, dedupCount: dedupedPlans?.length || 0, planType, countryCode, firstRaw: plans?.[0] ? { id: plans[0].id, pkg_id: plans[0].package_id, slug: plans[0].slug } : null },
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
    console.error('❌ Error fetching plans from Supabase:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    
    // Return more detailed error information
    const errorMessage = error.message || 'Unknown error';
    const errorDetails = error.details || error.hint || '';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch plans', 
        details: errorMessage,
        hint: errorDetails,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
// force redeploy 1770886220
