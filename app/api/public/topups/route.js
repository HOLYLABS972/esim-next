import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET endpoint to fetch topup packages from Supabase
 * Supports filtering by country code
 */
export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country');
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const category = searchParams.get('category') || '';
    const slugPrefix = searchParams.get('slugPrefix');
    
    console.log('📦 Fetching topup packages from Supabase...', { countryCode, limit, category });
    
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    // Build query - topup packages are in esim_packages table with plan_type = 'topup'
    let query = supabaseAdmin
      .from('esim_packages')
      .select('*')
      .eq('plan_type', 'topup')
      .eq('enabled', true)
      .limit(limit);
    
    // Filter by country if provided
    if (countryCode) {
      // Check if country code matches in country_codes array or country_id
      query = query.or(`country_codes.cs.{${countryCode}},country_id.eq.${countryCode}`);
    }
    
    // Filter by slug prefix if provided
    if (slugPrefix) {
      query = query.ilike('package_id', `${slugPrefix}%`);
      console.log('🔍 Filtering by slug prefix:', slugPrefix);
    }
    
    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: plans, error } = await query;
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
    
    console.log(`✅ Loaded ${plans?.length || 0} topup plans from Supabase`);
    
    // Fetch discount from admin_config
    let discountPct = 0;
    const { data: adminConfig } = await supabaseAdmin.from('admin_config').select('discount_percentage').limit(1).maybeSingle();
    discountPct = Math.max(0, Math.min(100, Number(adminConfig?.discount_percentage) || 0));
    const MIN_PRICE_FLOOR = 0.5;
    const applyDiscount = (val) => (val != null && val > 0 ? Math.max(MIN_PRICE_FLOOR, (val * (100 - discountPct)) / 100) : val);

    // Format plans for API response with all currencies
    const formattedPlans = (plans || []).map(plan => {
      const origUsd = parseFloat(plan.price_usd) || 0;
      const origRub = parseFloat(plan.price_rub) || 0;
      const origIls = parseFloat(plan.price_ils) || 0;
      const origAud = parseFloat(plan.price_aud) || 0;
      const origEur = parseFloat(plan.price_eur) || 0;
      const origCad = parseFloat(plan.price_cad) || 0;

      const priceUsd = discountPct > 0 ? applyDiscount(origUsd) : origUsd;
      const priceRub = discountPct > 0 ? applyDiscount(origRub) : origRub;
      const priceIls = discountPct > 0 ? applyDiscount(origIls) : origIls;
      const priceAud = discountPct > 0 ? applyDiscount(origAud) : origAud;
      const priceEur = discountPct > 0 ? applyDiscount(origEur) : origEur;
      const priceCad = discountPct > 0 ? applyDiscount(origCad) : origCad;

      return {
        _id: plan.id.toString(),
        id: plan.id.toString(),
        slug: plan.package_id || plan.id.toString(),
        package_id: plan.package_id || plan.id.toString(),
        name: plan.title || plan.title_ru || '',
        title: plan.title || '',
        title_ru: plan.title_ru || null,
        description: plan.description || '',
        price: priceUsd,
        price_usd: priceUsd,
        price_rub: priceRub,
        price_ils: priceIls,
        price_aud: priceAud,
        price_eur: priceEur,
        price_cad: priceCad,
        data: plan.data_amount_mb ? `${plan.data_amount_mb}MB` : '',
        dataAmount: plan.data_amount_mb ? `${(plan.data_amount_mb / 1024).toFixed(2)} GB` : '',
        validity: plan.validity_days ? `${plan.validity_days} days` : '',
        period: plan.validity_days,
        duration: plan.validity_days,
        country: plan.country_id || '',
        country_codes: plan.country_codes || [],
        country_ids: plan.country_codes || [],
        operator: plan.operator || '',
        type: 'topup',
        planType: 'topup',
        category: plan.category || 'other',
        enabled: plan.enabled !== false,
        is_active: plan.enabled !== false,
        features: [],
        tags: []
      };
    });
    
    return NextResponse.json(
      {
        success: true,
        data: {
          plans: formattedPlans,
          count: formattedPlans.length,
          source: 'supabase',
          discountPercentage: discountPct,
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
    console.error('❌ Error fetching topup packages from Supabase:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch topup packages', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

