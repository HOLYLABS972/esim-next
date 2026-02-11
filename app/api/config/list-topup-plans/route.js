import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/config/list-topup-plans — list topup-eligible packages for admin TopupsManagement
 * Returns all packages; client-side TopupsManagement handles topup filtering.
 */
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10000', 10);

    // Paginated fetch
    const PAGE_SIZE = 1000;
    let allPlans = [];
    let from = 0;
    let hasMore = true;

    while (hasMore && allPlans.length < limit) {
      const batchSize = Math.min(PAGE_SIZE, limit - allPlans.length);
      const { data: batch, error } = await supabaseAdmin
        .from('esim_packages')
        .select('*')
        .order('price_usd', { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) throw error;
      allPlans = allPlans.concat(batch || []);
      hasMore = (batch || []).length === batchSize;
      from += batchSize;
    }

    // Transform to match TopupsManagement.jsx expected shape
    const plans = allPlans.map(plan => {
      const countryCode = (plan.country_code || '').trim();
      const countryCodes = countryCode
        ? countryCode.includes(',')
          ? countryCode.split(',').map(c => c.trim()).filter(Boolean)
          : [countryCode]
        : [];

      const dataMB = plan.data_amount_mb || parseInt(plan.data_amount, 10) || 0;
      const dataGB = dataMB / 1024;
      const dataFormatted = plan.is_unlimited
        ? 'Unlimited'
        : dataGB >= 1
          ? `${dataGB}GB`
          : `${dataMB}MB`;

      // Detect topup eligibility from package_id or support_topup column (if exists)
      const pkgId = (plan.package_id || '').toLowerCase();
      const isTopup = pkgId.includes('topup') || plan.support_topup === true;

      return {
        id: plan.id?.toString(),
        _id: plan.id?.toString(),
        name: plan.title || `${dataFormatted} - ${plan.validity_days || '?'} days`,
        slug: plan.package_id || plan.id?.toString(),
        operator: plan.operator || '',
        country: countryCode || null,
        country_codes: countryCodes,
        dataAmount: dataFormatted,
        validity: plan.validity_days ? `${plan.validity_days} days` : 'N/A',
        price: parseFloat(plan.price_usd) || 0,
        currency: 'USD',
        enabled: plan.is_active !== false,
        is_parent: false,
        package_type: plan.package_type || 'country',
        type: isTopup ? 'topup' : 'base',
        is_topup_package: isTopup,
        available_for_topup: isTopup,
      };
    });

    return NextResponse.json(
      { success: true, data: { plans, count: plans.length } },
      { headers: { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } }
    );
  } catch (error) {
    console.error('List topup plans error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list topup plans' },
      { status: 500 }
    );
  }
}
