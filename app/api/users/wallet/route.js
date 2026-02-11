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
    
    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Calculate balance from orders
    // For refunded orders, add to balance (deposits)
    // For completed orders with status 'active', subtract from balance (withdrawals)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('esim_orders')
      .select('price_rub, status, metadata')
      .eq('user_id', userId);
    
    if (ordersError && ordersError.code !== 'PGRST116') {
      console.error('Error fetching orders:', ordersError);
    }
    
    let balance = 0.0;
    if (orders) {
      orders.forEach(order => {
        const paymentStatus = order.metadata?.payment_status;
        const amount = parseFloat(order.price_rub) || 0;
        
        if (paymentStatus === 'refunded') {
          balance += amount;
        } else if (paymentStatus === 'paid' && order.status === 'active') {
          balance -= amount;
        }
      });
    }
    
    // If user has wallet_balance field, use it, otherwise calculate from orders
    const wallet = {
      balance: user.wallet_balance !== undefined ? user.wallet_balance : balance,
      currency: user.preferences?.currency || 'RUB',
      updatedAt: user.updated_at || new Date().toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      wallet
    });
    
  } catch (error) {
    console.error('❌ Error fetching wallet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet', details: error.message },
      { status: 500 }
    );
  }
}

