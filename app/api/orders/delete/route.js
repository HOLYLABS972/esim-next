import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Find and delete the order by airalo_order_id
    const orderIdStr = orderId.toString();
    const { data: deletedOrder, error } = await supabaseAdmin
      .from('esim_orders')
      .delete()
      .eq('airalo_order_id', orderIdStr)
      .select()
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (!deletedOrder) {
      // Try deleting by numeric ID as fallback
      if (!isNaN(orderIdStr)) {
        const { data: deletedByNumericId } = await supabaseAdmin
          .from('esim_orders')
          .delete()
          .eq('id', parseInt(orderIdStr, 10))
          .select()
          .maybeSingle();
        
        if (!deletedByNumericId) {
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order', details: error.message },
      { status: 500 }
    );
  }
}

