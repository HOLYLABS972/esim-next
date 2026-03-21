import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET - Return public site settings (discount, minimum price) for the client.
 * Fresh DB read so admin changes apply on reload.
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { discountPercentage: 0, minimumPrice: 0.5 },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const { data, error } = await supabaseAdmin
      .from('admin_config')
      .select('discount_percentage')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const discountPercentage = Math.max(0, Math.min(100, Number(data?.discount_percentage) || 0));
    const minimumPrice = 0.5;

    return NextResponse.json(
      { discountPercentage, minimumPrice },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error('public/settings GET error:', e);
    return NextResponse.json(
      { discountPercentage: 0, minimumPrice: 0.5 },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
