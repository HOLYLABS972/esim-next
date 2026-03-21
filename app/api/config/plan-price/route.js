import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST: lookup plan by id or slug (package_id), then update price_usd.
 * Body: { planId: string | number, price_usd: number }
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 503 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const planId = body.planId ?? body.slug ?? body.id;
    const priceUsd = body.price_usd ?? body.priceUsd;

    if (planId === undefined || planId === null || planId === '') {
      return NextResponse.json(
        { success: false, error: 'planId or slug is required' },
        { status: 400 }
      );
    }
    const num = Number(priceUsd);
    if (Number.isNaN(num) || num < 0) {
      return NextResponse.json(
        { success: false, error: 'price_usd must be a non-negative number' },
        { status: 400 }
      );
    }

    const numericId = parseInt(String(planId).trim(), 10);
    const slug = String(planId).trim();
    let rows = null;
    let findErr = null;
    if (!Number.isNaN(numericId) && String(numericId) === String(planId).trim()) {
      const r = await supabaseAdmin.from('esim_packages').select('id, package_id, title, price_usd, validity_days, data_amount_mb, data_amount').eq('id', numericId).maybeSingle();
      findErr = r.error;
      rows = r.data;
    }
    if (!rows && !findErr) {
      const r = await supabaseAdmin.from('esim_packages').select('id, package_id, title, price_usd, validity_days, data_amount_mb, data_amount').eq('package_id', slug).maybeSingle();
      findErr = r.error;
      rows = r.data;
    }
    if (findErr) {
      console.error('plan-price find error:', findErr);
      return NextResponse.json({ success: false, error: findErr.message }, { status: 500 });
    }
    if (!rows) {
      return NextResponse.json({ success: false, error: 'Plan not found for id/slug: ' + planId }, { status: 404 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('esim_packages')
      .update({ price_usd: num, updated_at: new Date().toISOString() })
      .eq('id', rows.id);

    if (updateErr) {
      console.error('plan-price update error:', updateErr);
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: rows.id,
        slug: rows.package_id,
        title: rows.title,
        previous_price_usd: rows.price_usd,
        price_usd: num,
      },
    });
  } catch (e) {
    console.error('plan-price error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
