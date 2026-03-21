import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Process order endpoint - simplified to only check/update status
 * eSIM creation is now handled by n8n workflow, not here
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const body = await request.json();
    const { orderId, customerEmail, amount, planId, planName, countryCode, countryName, userId } = body;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`🔄 Processing order ${orderId} from frontend payment success page`);
    
    // Find order in Supabase
    // Note: airalo_order_id is stored as text/bigint, so we only use string comparison
    const orderIdStr = orderId.toString();
    
    const { data: order, error: findError } = await supabaseAdmin
      .from('esim_orders')
      .select('*')
      .eq('airalo_order_id', orderIdStr)
      .limit(1)
      .maybeSingle();
    
    if (!order && !findError) {
      // Order doesn't exist yet - create it first
      console.log(`📝 Creating new order ${orderId}`);
      
      const orderData = {
        airalo_order_id: orderId.toString(),
        price_rub: parseFloat(amount) || 0,
        status: 'pending',
        metadata: {
          roamjet_api_key: 'roamjet' // Track RoamJet API key for security/filtering
        }
      };
      
      // Set user_id if userId is provided (UUID format)
      if (userId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(userId)) {
          orderData.user_id = userId;
        }
      }
      
      // Set package_id if it's a valid numeric ID (not an orderId)
      // Order IDs are typically 13+ digits, package IDs are much smaller
      if (planId) {
        const packageIdNum = parseInt(planId);
        // Only use as package_id if it's a reasonable number (not an orderId)
        // Package IDs are typically < 1,000,000, order IDs are 13+ digits
        if (!isNaN(packageIdNum) && packageIdNum > 0 && packageIdNum < 1000000) {
          orderData.package_id = packageIdNum;
          console.log(`✅ Valid package_id found: ${packageIdNum}`);
        } else {
          console.warn(`⚠️ planId "${planId}" looks like an orderId (too large), skipping package_id assignment`);
        }
      }
      
      const { data: newOrder, error: insertError } = await supabaseAdmin
        .from('esim_orders')
        .insert(orderData)
        .select()
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      console.log(`✅ Created new order ${orderId}`);
      
      // Use the new order as finalOrder
      var finalOrder = {
        id: newOrder.id,
        airalo_order_id: newOrder.airalo_order_id,
        price_rub: newOrder.price_rub,
        status: newOrder.status,
        package_id: newOrder.package_id,
        user_id: newOrder.user_id
      };
    } else if (order) {
      // Order exists - check if already processed
      if (order.status === 'active') {
        console.log(`✅ Order ${orderId} already processed - idempotent`);
        return NextResponse.json({
          success: true,
          message: 'Order already processed',
          orderId: order.airalo_order_id || order.id.toString(),
          alreadyProcessed: true
        });
      }
      
      // Update order status (keep as pending until eSIM is purchased)
      const updateData = {
        status: 'pending',
        updated_at: new Date().toISOString()
      };
      
      // Only update package_id if it's a valid numeric ID (not an orderId)
      if (planId) {
        const packageIdNum = parseInt(planId);
        // Only use as package_id if it's a reasonable number (not an orderId)
        // Package IDs are typically < 1,000,000, order IDs are 13+ digits
        if (!isNaN(packageIdNum) && packageIdNum > 0 && packageIdNum < 1000000) {
          updateData.package_id = packageIdNum;
          console.log(`✅ Valid package_id found for update: ${packageIdNum}`);
        } else {
          console.warn(`⚠️ planId "${planId}" looks like an orderId (too large), skipping package_id update`);
        }
      }
      
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('esim_orders')
        .update(updateData)
        .eq('id', order.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ Updated order ${orderId} to processing`);
      
      // Use updated order as finalOrder
      var finalOrder = {
        id: updatedOrder.id,
        airalo_order_id: updatedOrder.airalo_order_id,
        price_rub: updatedOrder.price_rub,
        status: updatedOrder.status,
        package_id: updatedOrder.package_id,
        user_id: updatedOrder.user_id
      };
    } else {
      throw findError;
    }
    
    // NOTE: eSIM creation is now handled by n8n workflow, not here
    // This endpoint only checks/updates order status
    console.log(`ℹ️ eSIM creation is handled by n8n workflow, not in process-order endpoint`);
    
    // Return success - order is ready, n8n will handle eSIM creation
    return NextResponse.json({
      success: true,
      message: 'Order is ready. eSIM creation will be handled by n8n workflow.',
      orderId: finalOrder.airalo_order_id || finalOrder.id.toString(),
      alreadyProcessed: finalOrder.status === 'active'
    });
    
  } catch (error) {
    console.error('❌ Error processing order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process order', details: error.message },
      { status: 500 }
    );
  }
}

