import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import {
  authenticateAiralo,
  fetchAllAiraloPackages,
} from '../../../../src/services/airaloSyncService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/config/sync-topup-packages
 * Scans Airalo API for rechargeable operators and updates support_topup + plan_type
 * on existing esim_packages rows in the DB.
 */
export async function POST() {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    console.log('🔄 Starting Airalo topup packages scan...');

    const accessToken = await authenticateAiralo();
    console.log('✅ Airalo auth successful');

    const airaloData = await fetchAllAiraloPackages(accessToken);
    console.log(`📦 Fetched ${airaloData.length} Airalo entries`);

    // Collect all rechargeable package IDs
    const topupPackageIds = new Set();
    for (const item of airaloData) {
      for (const operator of item.operators || []) {
        const rechargeability = operator.rechargeability === true || operator.rechargeability === 'true';
        if (!rechargeability) continue;
        for (const pkg of operator.packages || []) {
          if (pkg.id) topupPackageIds.add(pkg.id);
        }
      }
    }

    console.log(`🔋 Found ${topupPackageIds.size} rechargeable package IDs`);

    // Update support_topup and plan_type in batches
    const ids = Array.from(topupPackageIds);
    const BATCH = 500;
    let updated = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const { error, count } = await supabaseAdmin
        .from('esim_packages')
        .update({ support_topup: true, plan_type: 'topup' })
        .in('package_id', batch);
      if (error) {
        console.error('Topup update error:', error);
      } else {
        updated += count || batch.length;
      }
    }

    console.log(`✅ Updated ${updated} packages as topup-eligible`);

    return NextResponse.json({
      success: true,
      total_synced: topupPackageIds.size,
      topup_count: topupPackageIds.size,
      updated_in_db: updated,
    });
  } catch (error) {
    console.error('❌ Topup sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Topup sync failed' },
      { status: 500 }
    );
  }
}
