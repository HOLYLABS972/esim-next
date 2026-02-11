import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET endpoint to fetch plans from Supabase
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country');
    const planType = searchParams.get('type'); // global, regional, local
    const limit = parseInt(searchParams.get('limit')) || 100;
    
    console.log('📱 Fetching plans from Supabase...', { countryCode, planType, limit });
    
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    
    // Query esim_packages only (no esim_countries)
    let query = supabaseAdmin
      .from('esim_packages')
      .select('*')
      .eq('is_active', true);
    
    // Filter by country code if provided (esim_packages.country_code only)
    if (countryCode && countryCode !== 'GL' && countryCode !== 'RG') {
      const codeUpper = countryCode.toUpperCase();
      query = query.or(`country_code.eq.${codeUpper},country_code.ilike.%${codeUpper}%`);
    }
    
    // Filter by plan type if provided
    if (planType) {
      query = query.eq('package_type', planType);
    } else if (countryCode === 'GL') {
      // Global plans
      query = query.eq('package_type', 'global');
    } else if (countryCode === 'RG') {
      // Regional plans
      query = query.eq('package_type', 'regional');
    }
    
    // Apply limit and ordering
    query = query
      .order('price_usd', { ascending: true })
      .limit(limit);
    
    const { data: rawPlans, error } = await query;
    
    if (error) throw error;
    
    // Only specific data tiers: 1GB, 5GB, 10GB, 20GB (or unlimited). Exclude topups.
    const ALLOWED_MB = [1024, 5120, 10240, 20480, 51200];
    const filteredPlans = (rawPlans || []).filter((p) => {
      const planType = (p.plan_type || p.package_type || '').toLowerCase();
      const slugLower = (p.package_id || p.slug || '').toLowerCase();
      const titleLower = (p.title || p.title_ru || p.name || '').toLowerCase();
      const isTopup =
        p.is_topup === true ||
        p.is_topup_package === true ||
        planType === 'topup' ||
        planType === 'top-up' ||
        slugLower.includes('topup') ||
        slugLower.includes('top-up') ||
        titleLower.includes('topup') ||
        titleLower.includes('top-up');
      if (isTopup) return false;
      const dataMB = p.data_amount_mb ?? (parseInt(p.data_amount, 10) || 0);
      const isUnlimited = p.is_unlimited === true || dataMB === 0;
      if (isUnlimited) return true;
      if (!dataMB || dataMB < 1024) return false;
      const matchesTier = ALLOWED_MB.some((tier) => Math.abs(dataMB - tier) < 100);
      return matchesTier;
    });
    
    // Deduplicate: one cheapest plan per (country/type, data tier, validity_days)
    const tierKey = (p) => {
      const dataMB = p.data_amount_mb ?? (parseInt(p.data_amount, 10) || 0);
      const tier = [1024, 5120, 10240, 20480, 51200].find((t) => Math.abs((dataMB || 0) - t) < 100) || (p.is_unlimited ? 'unlimited' : dataMB);
      const scope = p.country_code || (p.package_type === 'global' ? 'GL' : p.package_type === 'regional' ? 'RG' : '') || '';
      return `${scope}|${tier}|${p.validity_days ?? 0}`;
    };
    const byKey = new Map();
    for (const plan of filteredPlans) {
      const key = tierKey(plan);
      const price = parseFloat(plan.price_usd) || 999;
      if (!byKey.has(key) || price < (parseFloat(byKey.get(key).price_usd) || 999)) {
        byKey.set(key, plan);
      }
    }
    const plans = Array.from(byKey.values());
    
    const formattedPlans = plans.map(plan => ({
      id: plan.id.toString(),
      _id: plan.id.toString(),
      slug: plan.package_id,
      name: plan.title,
      title: plan.title,
      description: plan.title_ru || plan.title,
      price: parseFloat(plan.price_usd) || 0,
      price_usd: parseFloat(plan.price_usd) || 0,
      price_rub: parseFloat(plan.price_rub) || 0,
      currency: 'USD',
      dataAmount: plan.data_amount || '',
      data: plan.data_amount || '',
      capacity: plan.data_amount_mb || 0,
      validity: plan.validity_days ? `${plan.validity_days} Days` : 'Unknown',
      validity_days: plan.validity_days || 0,
      period: plan.validity_days || 0,
      operator: plan.operator || '',
      country: plan.country_code || '',
      countryCode: plan.country_code || '',
      country_code: plan.country_code || '',
      country_id: plan.country_id,
      planType: plan.package_type || 'local',
      package_type: plan.package_type || 'local',
      enabled: plan.is_active,
      is_active: plan.is_active,
      is_unlimited: plan.is_unlimited || false,
      voice_included: plan.voice_included || false,
      sms_included: plan.sms_included || false,
      features: [],
      tags: [],
      priority: 0
    }));
    
    console.log(`✅ Found ${formattedPlans.length} plans from Supabase`);
    
    return NextResponse.json({
      success: true,
      data: {
        plans: formattedPlans,
        count: formattedPlans.length,
        source: 'supabase'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching plans from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans', details: error.message },
      { status: 500 }
    );
  }
}
