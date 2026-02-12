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

  return NextResponse.json({
    supabase_url: url,
    has_service_key: !!(process.env.SUPABASE_SERVICE_ROLE_KEY),
    plan_query: planData,
  });
}
