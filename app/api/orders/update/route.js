import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const orderData = await request.json();
    const { orderId, ...updateFields } = orderData;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    console.log('📦 Updating order:', orderId, 'with data:', JSON.stringify(updateFields, null, 2));
    
    // Convert camelCase to snake_case for Supabase
    const supabaseUpdateFields = {};
    if (updateFields.status !== undefined) supabaseUpdateFields.status = updateFields.status;
    // payment_status might not exist in schema - map paymentStatus to status
    if (updateFields.paymentStatus !== undefined) {
      if (updateFields.paymentStatus === 'paid') {
        supabaseUpdateFields.status = 'active';
      } else if (updateFields.paymentStatus === 'pending') {
        supabaseUpdateFields.status = 'pending';
      }
      // Don't set payment_status column - it may not exist in schema
    }
    if (updateFields.amount !== undefined) supabaseUpdateFields.price_rub = parseFloat(updateFields.amount);
    if (updateFields.currency !== undefined) supabaseUpdateFields.currency = updateFields.currency;
    if (updateFields.customerEmail !== undefined) supabaseUpdateFields.customer_email = updateFields.customerEmail;
    if (updateFields.packageId !== undefined) {
      const packageIdNum = parseInt(updateFields.packageId);
      // Only use as package_id if it's a reasonable number (not an orderId)
      // Package IDs are typically < 1,000,000, order IDs are 13+ digits
      if (!isNaN(packageIdNum) && packageIdNum > 0 && packageIdNum < 1000000) {
        supabaseUpdateFields.package_id = packageIdNum;
      } else {
        console.warn(`⚠️ packageId "${updateFields.packageId}" looks like an orderId (too large), skipping package_id update`);
      }
    }
    if (updateFields.userId !== undefined) supabaseUpdateFields.user_id = updateFields.userId;
    // Only include country fields if they are provided and have truthy values
    // This prevents schema errors if columns don't exist in the table
    if (updateFields.countryCode !== undefined && updateFields.countryCode) {
      supabaseUpdateFields.country_code = updateFields.countryCode;
    }
    if (updateFields.countryName !== undefined && updateFields.countryName) {
      supabaseUpdateFields.country_name = updateFields.countryName;
    }
    
    // Always update updated_at
    supabaseUpdateFields.updated_at = new Date().toISOString();
    
    // Find and update the order by airalo_order_id or id
    // Note: airalo_order_id is stored as text/bigint, so we only use string comparison
    const orderIdStr = orderId.toString();
    
    // Try to find order first - use string comparison for airalo_order_id
    const { data: existingOrder, error: findError } = await supabaseAdmin
      .from('esim_orders')
      .select('id')
      .eq('airalo_order_id', orderIdStr)
      .limit(1)
      .maybeSingle();
    
    if (findError) {
      console.error('❌ Error finding order:', findError);
      return NextResponse.json(
        { error: 'Error finding order', details: findError.message },
        { status: 500 }
      );
    }
    
    // If order doesn't exist, create it with the provided data
    if (!existingOrder) {
      console.log(`📝 Order ${orderIdStr} not found, creating new order...`);
      
      // Determine status based on paymentStatus if provided
      let initialStatus = supabaseUpdateFields.status || 'pending';
      if (updateFields.paymentStatus === 'paid') {
        initialStatus = 'active';
      }
      
      const newOrderData = {
        airalo_order_id: orderIdStr,
        price_rub: supabaseUpdateFields.price_rub || 0,
        status: initialStatus,
        currency: supabaseUpdateFields.currency || 'RUB',
        customer_email: supabaseUpdateFields.customer_email || null,
        user_id: supabaseUpdateFields.user_id || null,
        package_id: supabaseUpdateFields.package_id || null,
        metadata: {
          roamjet_api_key: 'roamjet' // Track RoamJet API key for security/filtering
        },
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
    
      // This prevents schema errors if columns don't exist in the table
      if (supabaseUpdateFields.country_code) {
        newOrderData.country_code = supabaseUpdateFields.country_code;
      }
      if (supabaseUpdateFields.country_name) {
        newOrderData.country_name = supabaseUpdateFields.country_name;
      }
      
      // Remove null package_id if not set
      if (newOrderData.package_id === null) {
        delete newOrderData.package_id;
      }
      
      const { data: newOrder, error: createError } = await supabaseAdmin
        .from('esim_orders')
        .insert(newOrderData)
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating order:', createError);
        return NextResponse.json(
          { error: 'Failed to create order', details: createError.message },
          { status: 500 }
        );
      }
      
      console.log('✅ Created new order:', newOrder.id);
      return NextResponse.json({ 
        success: true, 
        orderId: newOrder.airalo_order_id || newOrder.id.toString(),
        message: 'Order created successfully',
        created: true
      });
    }
    
    // Remove payment_status and any undefined/null values from update fields
    const updateFieldsForDb = { ...supabaseUpdateFields };
    delete updateFieldsForDb.payment_status;
    
    // Remove undefined values to avoid SQL errors
    // Also remove country_code and country_name if they're null/undefined
    // (these columns may not exist in the schema)
    Object.keys(updateFieldsForDb).forEach(key => {
      if (updateFieldsForDb[key] === undefined) {
        delete updateFieldsForDb[key];
      } else if ((key === 'country_code' || key === 'country_name') && !updateFieldsForDb[key]) {
        // Remove country fields if they're null/empty (columns may not exist)
        delete updateFieldsForDb[key];
      }
    });
    
    // Ensure we have at least one field to update (besides updated_at)
    if (Object.keys(updateFieldsForDb).filter(k => k !== 'updated_at').length === 0) {
      console.log('⚠️ No fields to update, skipping update operation');
      // Return existing order
      const { data: currentOrder } = await supabaseAdmin
        .from('esim_orders')
        .select()
        .eq('id', existingOrder.id)
        .single();
      
      return NextResponse.json({ 
        success: true, 
        orderId: currentOrder?.airalo_order_id || currentOrder?.id.toString() || orderIdStr,
        message: 'Order already up to date',
        skipped: true
      });
    }
    
    // Update the order
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('esim_orders')
      .update(updateFieldsForDb)
      .eq('id', existingOrder.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Update error details:', updateError);
      throw updateError;
    }
    
    console.log('✅ Order updated in Supabase:', updatedOrder.id);
    
    return NextResponse.json({ 
      success: true, 
      orderId: updatedOrder.airalo_order_id || updatedOrder.id.toString(),
      message: 'Order updated successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error updating order:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to update order', 
        details: error.message,
        errorName: error.name
      },
      { status: 500 }
    );
  }
}
