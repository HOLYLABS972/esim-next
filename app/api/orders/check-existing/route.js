import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Build query to find existing pending order
    let query = supabaseAdmin
      .from('esim_orders')
      .select('*')
      .eq('customer_email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);
    
    const { data: orders, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Filter for admin-created orders if no coupon code specified
    let existingOrder = orders && orders.length > 0 ? orders[0] : null;
    
    if (!existingOrder) {
      const { data: adminOrders } = await supabaseAdmin
        .from('esim_orders')
        .select('*')
        .eq('customer_email', email)
        .eq('status', 'pending')
        .or('metadata->created_from_admin.eq.true,metadata->admin_created.eq.true,metadata->source.eq.admin_coupon')
        .order('created_at', { ascending: false })
        .limit(1);
      
      existingOrder = adminOrders && adminOrders.length > 0 ? adminOrders[0] : null;
    }
    
    if (existingOrder) {
      console.log('✅ Found existing order:', {
        orderId: existingOrder.airalo_order_id,
        email: existingOrder.customer_email,
        status: existingOrder.status
      });
      
      return NextResponse.json({
        success: true,
        data: {
          order: {
            orderId: existingOrder.airalo_order_id || existingOrder.id.toString(),
            status: existingOrder.status,
            paymentStatus: existingOrder.status === 'active' ? 'paid' : 'pending',
            customerEmail: existingOrder.customer_email,
            amount: existingOrder.price_rub || 0,
            packageId: existingOrder.package_id?.toString()
          }
        }
      });
    }
    
    console.log('❌ No existing order found for:', { email });
    
    return NextResponse.json({
      success: false,
      data: { order: null }
    });
    
  } catch (error) {
    console.error('❌ Error checking for existing order:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check for existing order', 
        details: error.message
      },
      { status: 500 }
    );
  }
}

