import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let orderData;
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    orderData = await request.json();
    
    console.log('📦 Creating order with data:', JSON.stringify(orderData, null, 2));
    
    // Validate required fields
    if (!orderData.orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }
    
    if (!orderData.packageId) {
      return NextResponse.json(
        { error: 'packageId is required' },
        { status: 400 }
      );
    }
    
    if (!orderData.customerEmail) {
      return NextResponse.json(
        { error: 'customerEmail is required' },
        { status: 400 }
      );
    }
    
    if (orderData.amount === undefined || orderData.amount === null) {
      return NextResponse.json(
        { error: 'amount is required' },
        { status: 400 }
      );
    }
    
    // Check if order with this orderId already exists
    const { data: existingOrder, error: findError } = await supabaseAdmin
      .from('esim_orders')
      .select('id, airalo_order_id')
      .eq('airalo_order_id', orderData.orderId.toString())
      .limit(1)
      .single();
    
    if (existingOrder && !findError) {
      console.log('⚠️ Order with orderId already exists, updating instead:', orderData.orderId);
      
      // Update existing order
      const updateData = {
        price_rub: parseFloat(orderData.amount) || 0,
        status: orderData.status || 'pending',
        updated_at: new Date().toISOString()
      };
      
      // Update package_id if provided and it's a valid numeric ID (not an orderId)
      if (orderData.packageId) {
        const packageIdNum = parseInt(orderData.packageId);
        // Only use as package_id if it's a reasonable number (not an orderId)
        // Package IDs are typically < 1,000,000, order IDs are 13+ digits
        if (!isNaN(packageIdNum) && packageIdNum > 0 && packageIdNum < 1000000) {
          updateData.package_id = packageIdNum;
        } else {
          console.warn(`⚠️ packageId "${orderData.packageId}" looks like an orderId (too large), skipping package_id update`);
        }
      }
      
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('esim_orders')
        .update(updateData)
        .eq('id', existingOrder.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      console.log('✅ Order updated in Supabase:', updatedOrder.id);
      
      return NextResponse.json({ 
        success: true, 
        orderId: updatedOrder.id,
        message: 'Order updated successfully',
        existing: true
      });
    }
    
    // Ensure status is set to 'pending' if not provided (for payment flow)
    const status = orderData.status || 'pending';
    
    // Prepare order data for Supabase
    const supabaseOrderData = {
      airalo_order_id: orderData.orderId.toString(),
      price_rub: parseFloat(orderData.amount) || 0,
      status: status
    };
    
    // Set user_id if userId is provided (UUID format)
    if (orderData.userId) {
      // Check if userId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(orderData.userId)) {
        supabaseOrderData.user_id = orderData.userId;
      } else {
        console.warn('⚠️ userId is not a valid UUID, skipping user_id assignment');
      }
    }
    
    // Set package_id if it's a valid numeric ID (not an orderId)
    if (orderData.packageId) {
      const packageIdNum = parseInt(orderData.packageId);
      // Only use as package_id if it's a reasonable number (not an orderId)
      // Package IDs are typically < 1,000,000, order IDs are 13+ digits
      if (!isNaN(packageIdNum) && packageIdNum > 0 && packageIdNum < 1000000) {
        supabaseOrderData.package_id = packageIdNum;
      } else {
        console.warn(`⚠️ packageId "${orderData.packageId}" looks like an orderId (too large), skipping package_id assignment`);
      }
    }
    
    // Create new order
    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from('esim_orders')
      .insert(supabaseOrderData)
      .select()
      .single();
    
    if (insertError) {
      // Check for duplicate key error (unique constraint violation)
      if (insertError.code === '23505') {
        console.log('⚠️ Duplicate key error, trying to update existing order');
        // Try to find and update
        const { data: existing, error: findErr } = await supabaseAdmin
          .from('esim_orders')
          .select('id')
          .eq('airalo_order_id', orderData.orderId.toString())
          .limit(1)
          .single();
        
        if (existing && !findErr) {
          const { data: updated, error: updateErr } = await supabaseAdmin
            .from('esim_orders')
            .update(supabaseOrderData)
            .eq('id', existing.id)
            .select()
            .single();
          
          if (!updateErr && updated) {
            return NextResponse.json({ 
              success: true, 
              orderId: updated.id,
              message: 'Order updated successfully',
              existing: true
            });
          }
        }
      }
      throw insertError;
    }
    
    console.log('✅ Order saved to Supabase:', newOrder.id);
    
    return NextResponse.json({ 
      success: true, 
      orderId: newOrder.id,
      message: 'Order created successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error creating order:', error);
    console.error('❌ Error details:', error.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to create order', 
        details: error.message
      },
      { status: 500 }
    );
  }
}
