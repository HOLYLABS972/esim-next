import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    
    console.log('🔍 Fetching pending orders from Supabase');
    
    // Build query to find all pending orders
    // An order is considered pending if status is 'pending'
    // Exclude credit card applications (order_type)
    let query = supabaseAdmin
      .from('esim_orders')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);
    
    const { data: orders, error, count } = await query;
    
    if (error) throw error;
    
    console.log(`✅ Found ${orders?.length || 0} pending orders (total: ${count})`);
    
    // Transform snake_case to camelCase for frontend compatibility
    const transformedOrders = (orders || []).map(order => ({
      _id: order.id,
      orderId: order.order_id,
      userId: order.user_id,
      description: order.plan_name || order.plan_id || 'Unknown Plan',
      packageId: order.plan_id,
      planId: order.plan_id,
      amount: order.amount,
      currency: order.currency || 'USD',
      status: order.status,
      paymentStatus: order.status, // Map to paymentStatus for compatibility
      quantity: 1,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      completedAt: order.completed_at,
      customerEmail: '', // Will need to join with users table if needed
      countryCode: order.country_code,
      countryName: order.country_name,
      orderType: 'esim_purchase',
      metadata: order.metadata || {}
    }));
    
    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      pagination: {
        total: count || 0,
        limit,
        skip,
        hasMore: skip + (orders?.length || 0) < (count || 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching pending orders from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending orders', details: error.message },
      { status: 500 }
    );
  }
}
