#!/usr/bin/env node
/**
 * Updates usd_to_rub_rate in admin_config from CBR (Central Bank of Russia) daily rate
 * Runs daily via cron on Russia VPS
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:8000';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getRate() {
  // Try CBR XML daily rates
  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const data = await res.json();
    const usd = data.Valute.USD;
    return { rate: usd.Value, source: 'CBR', nominal: usd.Nominal };
  } catch (e) {
    console.warn('CBR failed:', e.message);
  }

  // Fallback: exchangerate-api (free)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    return { rate: data.rates.RUB, source: 'er-api' };
  } catch (e) {
    console.warn('er-api failed:', e.message);
  }

  return null;
}

async function main() {
  const result = await getRate();
  if (!result) {
    console.error('All rate sources failed');
    process.exit(1);
  }

  const newRate = Math.round(result.rate * 100) / 100;
  console.log(`Fetched rate: ${newRate} RUB/USD (source: ${result.source})`);

  // Get current rate
  const { data: config } = await supabase
    .from('admin_config')
    .select('id, usd_to_rub_rate')
    .limit(1)
    .single();

  if (!config) {
    console.error('No admin_config row found');
    process.exit(1);
  }

  const oldRate = config.usd_to_rub_rate;
  console.log(`Current rate: ${oldRate} → New rate: ${newRate}`);

  // Safety: don't update if rate changed more than 15% (likely API error)
  if (oldRate && Math.abs(newRate - oldRate) / oldRate > 0.15) {
    console.error(`Rate change too large (${oldRate} → ${newRate}), skipping`);
    process.exit(1);
  }

  const { error } = await supabase
    .from('admin_config')
    .update({ usd_to_rub_rate: newRate, updated_at: new Date().toISOString() })
    .eq('id', config.id);

  if (error) {
    console.error('Update failed:', error.message);
    process.exit(1);
  }

  console.log(`✅ Updated usd_to_rub_rate: ${oldRate} → ${newRate}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
