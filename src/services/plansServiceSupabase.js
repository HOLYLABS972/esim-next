import { supabase, supabaseAdmin } from '../lib/supabase';
import { edgeFunctions } from './edgeFunctionService';

/**
 * Service for fetching plans and countries from Supabase
 * Replaces MongoDB-based plansService
 * Now uses Edge Functions for public endpoints
 */

// Get all plans from Supabase (esim_packages only, no esim_countries)
export const getAllPlans = async () => {
  try {
    const { data: plans, error } = await supabase
      .from('esim_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_usd', { ascending: true });
    
    if (error) throw error;
    
    return (plans || []).map(plan => {
      const code = (plan.country_code && plan.country_code.trim()) || null;
      const country_codes = code ? (code.includes(',') ? code.split(',').map(c => c.trim()).filter(Boolean) : [code]) : [];
      return {
        id: plan.id.toString(),
        _id: plan.id.toString(),
        slug: plan.package_id,
        name: plan.title,
        title: plan.title,
        title_ru: plan.title_ru || null,
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
        country: code || '',
        countryCode: code || '',
        country_codes,
        country_name_ru: null,
        country_id: plan.country_id,
        planType: plan.package_type || 'local',
        package_type: plan.package_type || 'local',
        enabled: plan.is_active,
        is_active: plan.is_active,
        is_unlimited: plan.is_unlimited || false,
        voice_included: plan.voice_included || false,
        sms_included: plan.sms_included || false,
        features: [],
        tags: []
      };
    });
  } catch (error) {
    console.error('❌ Error getting all plans:', error);
    throw error;
  }
};

// Get all countries from Supabase - NOW USES EDGE FUNCTION
export const getAllCountries = async () => {
  try {
    // Fetch from Edge Function
    const response = await edgeFunctions.getCountries();
    
    if (response.success && response.data) {
      return response.data.countries || [];
    } else {
      throw new Error('Failed to fetch countries from Edge Function');
    }
  } catch (error) {
    console.error('❌ Error getting countries from Edge Function:', error);
    
    // Fallback: fetch from public API (esim_packages only)
    console.log('⚠️ Falling back to /api/public/countries (esim_packages only)...');
    try {
      const res = await fetch('/api/public/countries', { cache: 'no-store' });
      const json = await res.json();
      if (json?.success && json?.data?.countries) {
        return json.data.countries;
      }
      return [];
    } catch (fallbackError) {
      console.error('Fallback countries failed:', fallbackError);
      return [];
    }
  }
};

// Get plans by country code (esim_packages only: country_code)
export const getPlansByCountry = async (countryCode) => {
  try {
    const codeUpper = countryCode.toUpperCase();
    const { data: plans, error: plansError } = await supabase
      .from('esim_packages')
      .select('*')
      .eq('is_active', true)
      .or(`country_code.eq.${codeUpper},country_code.ilike.%${codeUpper}%`)
      .order('price_usd', { ascending: true });
    
    if (plansError) throw plansError;
    
    return (plans || []).map(plan => {
      const code = (plan.country_code && plan.country_code.trim()) || null;
      return {
        id: plan.id.toString(),
        _id: plan.id.toString(),
        slug: plan.package_id,
        name: plan.title,
        title: plan.title,
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
        country: code || '',
        countryCode: code || '',
        planType: plan.package_type || 'local',
        enabled: plan.is_active,
        is_unlimited: plan.is_unlimited || false
      };
    });
  } catch (error) {
    console.error('❌ Error getting plans by country:', error);
    throw error;
  }
};

// Get plan by slug (esim_packages only)
export const getPlanBySlug = async (slug) => {
  try {
    const { data: plan, error } = await supabase
      .from('esim_packages')
      .select('*')
      .eq('package_id', slug)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    if (!plan) return null;
    
    const code = (plan.country_code && plan.country_code.trim()) || null;
    return {
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
      country: code || '',
      countryCode: code || '',
      country_id: plan.country_id,
      planType: plan.package_type || 'local',
      enabled: plan.is_active,
      is_unlimited: plan.is_unlimited || false,
      voice_included: plan.voice_included || false,
      sms_included: plan.sms_included || false
    };
  } catch (error) {
    console.error('❌ Error getting plan by slug:', error);
    throw error;
  }
};

// Get countries with pricing
export const getCountriesWithPricing = async () => {
  try {
    return await getAllCountries();
  } catch (error) {
    console.error('❌ Error getting countries with pricing:', error);
    throw error;
  }
};

// Get pricing statistics
export const getPricingStats = async () => {
  try {
    const allPlans = await getAllPlans();
    
    if (allPlans.length === 0) {
      return {
        totalPlans: 0,
        totalCountries: 0,
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0
      };
    }
    
    const prices = allPlans.map(plan => plan.price).filter(price => price > 0);
    const countries = new Set(allPlans.map(plan => plan.countryCode).filter(Boolean));
    
    return {
      totalPlans: allPlans.length,
      totalCountries: countries.size,
      averagePrice: prices.length > 0 ? (prices.reduce((sum, price) => sum + price, 0) / prices.length).toFixed(2) : 0,
      minPrice: prices.length > 0 ? Math.min(...prices).toFixed(2) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices).toFixed(2) : 0
    };
  } catch (error) {
    console.error('❌ Error getting pricing stats:', error);
    throw error;
  }
};
