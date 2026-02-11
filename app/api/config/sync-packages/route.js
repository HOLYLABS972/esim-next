import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import {
  authenticateAiralo,
  fetchAllAiraloPackages,
  mapAiraloToEsimPackages,
  extractCountries,
} from '../../../../src/services/airaloSyncService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 minutes for full sync

/**
 * POST /api/config/sync-packages
 * Sync all packages from Airalo API into esim_packages.
 * Query params:
 *   ?wipe=true  — wipe all existing data first (default: true)
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { searchParams } = new URL(request.url);
    const shouldWipe = searchParams.get('wipe') !== 'false'; // default true

    console.log('🔄 Starting Airalo package sync...');
    const results = { wiped: false, countries: 0, packages: 0, rubUpdated: false };

    // Step 1: Optionally wipe old data
    if (shouldWipe) {
      console.log('🗑️ Wiping old eSIM catalog...');
      const { data: wipeResult, error: wipeError } = await supabaseAdmin.rpc('wipe_esim_catalog');
      if (wipeError) {
        console.error('Wipe error:', wipeError);
        throw new Error(`Failed to wipe catalog: ${wipeError.message}`);
      }
      console.log('✅ Catalog wiped:', wipeResult);
      results.wiped = true;
    }

    // Step 2: Authenticate with Airalo
    console.log('🔐 Authenticating with Airalo...');
    const accessToken = await authenticateAiralo();
    console.log('✅ Airalo authentication successful');

    // Step 3: Fetch all packages
    console.log('📦 Fetching Airalo packages...');
    const airaloData = await fetchAllAiraloPackages(accessToken);
    console.log(`✅ Fetched ${airaloData.length} Airalo entries`);

    // Step 4: Extract and upsert countries
    console.log('🌍 Syncing countries...');
    const countries = extractCountries(airaloData);

    // Fetch existing translated names to preserve them
    const { data: existingCountries } = await supabaseAdmin
      .from('esim_countries')
      .select('airalo_country_code, country_name_ru, country_name_he, country_name_ar');

    const existingByCode = {};
    for (const row of existingCountries || []) {
      existingByCode[row.airalo_country_code] = row;
    }

    // Merge: preserve existing translations
    const countriesWithTranslations = countries.map(c => {
      const existing = existingByCode[c.airalo_country_code];
      return {
        ...c,
        country_name_ru: existing?.country_name_ru || null,
        country_name_he: existing?.country_name_he || null,
        country_name_ar: existing?.country_name_ar || null,
      };
    });

    // Upsert countries in batches
    const COUNTRY_BATCH = 200;
    for (let i = 0; i < countriesWithTranslations.length; i += COUNTRY_BATCH) {
      const batch = countriesWithTranslations.slice(i, i + COUNTRY_BATCH);
      const { error } = await supabaseAdmin
        .from('esim_countries')
        .upsert(batch, { onConflict: 'airalo_country_code' });
      if (error) {
        console.error('Country upsert error:', error);
        throw new Error(`Failed to upsert countries: ${error.message}`);
      }
    }
    results.countries = countriesWithTranslations.length;
    console.log(`✅ Synced ${results.countries} countries`);

    // Step 5: Map and upsert packages
    console.log('📱 Mapping Airalo packages...');
    const packageRows = mapAiraloToEsimPackages(airaloData);
    console.log(`📱 Mapped ${packageRows.length} packages, upserting...`);

    const PACKAGE_BATCH = 500;
    for (let i = 0; i < packageRows.length; i += PACKAGE_BATCH) {
      const batch = packageRows.slice(i, i + PACKAGE_BATCH);
      const { error } = await supabaseAdmin
        .from('esim_packages')
        .upsert(batch, { onConflict: 'package_id' });
      if (error) {
        console.error(`Package upsert error (batch ${i / PACKAGE_BATCH + 1}):`, error);
        throw new Error(`Failed to upsert packages: ${error.message}`);
      }
    }
    results.packages = packageRows.length;
    console.log(`✅ Synced ${results.packages} packages`);

    // Step 6: Backfill RUB prices
    console.log('💰 Updating RUB prices...');
    const { data: adminConfig } = await supabaseAdmin
      .from('admin_config')
      .select('usd_to_rub_rate')
      .limit(1)
      .maybeSingle();
    const rubRate = parseFloat(adminConfig?.usd_to_rub_rate) || 95;

    const { error: rubError } = await supabaseAdmin.rpc('update_price_rub', {
      usd_to_rub_rate: rubRate,
    });
    if (rubError) {
      console.warn('RUB price update warning:', rubError.message);
    } else {
      results.rubUpdated = true;
      console.log(`✅ RUB prices updated (rate: ${rubRate})`);
    }

    // Verify data actually persisted
    const { count: verifyCount, error: verifyError } = await supabaseAdmin
      .from('esim_packages')
      .select('id', { count: 'exact', head: true });

    const actualCount = verifyError ? 'error' : verifyCount;
    console.log(`🎉 Airalo sync complete! Mapped: ${results.packages}, In DB: ${actualCount}`, results);

    return NextResponse.json({
      success: true,
      total_synced: results.packages,
      verified_in_db: actualCount,
      details: results,
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
