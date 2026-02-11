import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Find and delete the order by Supabase id
    const { data: deletedOrder, error } = await supabaseAdmin
      .from('esim_orders')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (!deletedOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
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

