import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'polskoydm@gmail.com';
  
  // Test 1: simple select
  const t1 = await supabaseAdmin.from('esim_orders').select('id,status').ilike('customer_email', email).order('created_at', { ascending: false }).limit(100);
  
  // Test 2: with join
  const t2 = await supabaseAdmin.from('esim_orders').select('id,status,esim_packages(id)').ilike('customer_email', email).order('created_at', { ascending: false }).limit(100);

  // Test 3: with nested join
  const t3 = await supabaseAdmin.from('esim_orders').select('id,status,esim_packages(id,esim_countries(id))').ilike('customer_email', email).order('created_at', { ascending: false }).limit(100);

  // Test 4: select * 
  const t4 = await supabaseAdmin.from('esim_orders').select('*').ilike('customer_email', email).order('created_at', { ascending: false }).limit(100);

  // Test 5: full join like list API
  const t5 = await supabaseAdmin.from('esim_orders').select(`*,esim_packages(id,package_id,title,title_ru,data_amount_mb,validity_days,price_usd,price_rub,package_type,esim_countries(id,airalo_country_code,country_name,country_name_ru,flag_url))`).ilike('customer_email', email).order('created_at', { ascending: false }).limit(100);

  return NextResponse.json({
    t1: { count: t1.data?.length, err: t1.error?.message, ids: t1.data?.map(r => r.id) },
    t2: { count: t2.data?.length, err: t2.error?.message, ids: t2.data?.map(r => r.id) },
    t3: { count: t3.data?.length, err: t3.error?.message, ids: t3.data?.map(r => r.id) },
    t4: { count: t4.data?.length, err: t4.error?.message, ids: t4.data?.map(r => r.id) },
    t5: { count: t5.data?.length, err: t5.error?.message, ids: t5.data?.map(r => r.id) },
  });
}
