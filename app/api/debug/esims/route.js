import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

/**
 * GET endpoint to fetch eSIM data by orderId for debugging/troubleshooting
 * Query params: orderId (required)
 */
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId parameter is required' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Debug: Fetching eSIM data for orderId:', orderId);
    
    const orderIdStr = orderId.toString();
    
    // Find eSIM order in Supabase by airalo_order_id
    const { data: order, error: orderError } = await supabaseAdmin
      .from('esim_orders')
      .select('*')
      .eq('airalo_order_id', orderIdStr)
      .maybeSingle();
    
    if (orderError && orderError.code !== 'PGRST116') {
      throw orderError;
    }
    
    if (!order) {
      // Try by numeric ID as fallback
      if (!isNaN(orderIdStr)) {
        const { data: orderByNumericId } = await supabaseAdmin
          .from('esim_orders')
          .select('*')
          .eq('id', parseInt(orderIdStr, 10))
          .maybeSingle();
        
        if (orderByNumericId) {
          console.log('✅ eSIM found for orderId (numeric ID):', orderId);
          return NextResponse.json({
            success: true,
            order: orderByNumericId,
            esim: orderByNumericId
          });
        }
      }
      
      console.log('⚠️ eSIM not found for orderId:', orderId);
      return NextResponse.json({
        success: true,
        order: null,
        esim: null,
        message: 'eSIM not found for this orderId'
      });
    }
    
    console.log('✅ eSIM found for orderId:', orderId);
    
    return NextResponse.json({
      success: true,
      order: order,
      esim: order
    });
    
  } catch (error) {
    console.error('❌ Error fetching eSIM debug data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eSIM data', details: error.message },
      { status: 500 }
    );
  }
}

