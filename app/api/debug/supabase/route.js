import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'NOT SET';
  
  let planData = null;
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('esim_packages')
      .select('id, package_id, price_usd, price_rub, package_type')
      .eq('package_id', 'discover-1gb-7days-px')
      .maybeSingle();
    planData = { data, error: error?.message || null };
  }

  // Also test what the plan endpoint would return
  let planApiResult = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://globalbanka.roamjet.net'}/api/public/plans/discover-1gb-7days-px`);
    planApiResult = await res.json();
  } catch (e) {
    planApiResult = { error: e.message };
  }

  return NextResponse.json({
    supabase_url: url,
    has_service_key: !!(process.env.SUPABASE_SERVICE_ROLE_KEY),
    plan_query: planData,
    plan_api: planApiResult?.data?.plan ? {
      price: planApiResult.data.plan.price,
      price_rub: planApiResult.data.plan.price_rub,
      original_price: planApiResult.data.plan.original_price,
    } : planApiResult,
  });
}
