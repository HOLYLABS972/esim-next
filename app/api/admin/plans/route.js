import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/plans — fetch ALL esim_packages (paginated past Supabase 1000 row cap)
 * Uses supabaseAdmin (service role key) to bypass RLS.
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const PAGE_SIZE = 1000;
    let allPlans = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await supabaseAdmin
        .from('esim_packages')
        .select('*')
        .order('price_usd', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      allPlans = allPlans.concat(batch || []);
      hasMore = (batch || []).length === PAGE_SIZE;
      from += PAGE_SIZE;
    }

    console.log(`[admin/plans] Returning ${allPlans.length} plans`);

    return NextResponse.json(
      { success: true, plans: allPlans, count: allPlans.length },
      { headers: { 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate' } }
    );
  } catch (error) {
    console.error('Admin plans error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
