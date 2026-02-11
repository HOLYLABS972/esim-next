import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }
    
    // Get user orders as transactions from Supabase
    // Orders represent both purchases (withdrawals) and can include deposits
    const { data: orders, error } = await supabaseAdmin
      .from('esim_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    // Convert orders to transaction format
    const transactions = (orders || []).map(order => ({
      id: order.id,
      _id: order.id,
      type: order.status === 'completed' ? 'purchase' : order.status === 'refunded' ? 'deposit' : 'pending',
      amount: order.amount || 0,
      currency: order.currency || 'RUB', // Use order currency, default to RUB
      description: order.plan_id || order.plan_name || 'eSIM purchase',
      timestamp: order.created_at,
      createdAt: order.created_at,
      status: order.status,
      orderId: order.order_id,
      orderType: order.order_type || 'esim_purchase', // Include orderType to identify credit card vs eSIM transactions
      metadata: order.metadata || {}, // Include metadata to identify credit card vs eSIM transactions
    }));
    
    return NextResponse.json({
      success: true,
      transactions
    });
    
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const body = await request.json();
    const { userId, transactionId } = body;
    
    if (!userId || !transactionId) {
      return NextResponse.json(
        { error: 'userId and transactionId are required' },
        { status: 400 }
      );
    }
    
    // Verify the transaction belongs to the user
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('esim_orders')
      .select('id, user_id')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Transaction not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete the order
    const { error: deleteError } = await supabaseAdmin
      .from('esim_orders')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete transaction', details: error.message },
      { status: 500 }
    );
  }
}

