import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function PUT(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const updateData = await request.json();
    const { orderId, userId, orderResult, ...updates } = updateData;
    
    console.log('🔄 Updating eSIM with orderId:', orderId, 'userId:', userId);
    
    // Build update object for Supabase
    const supabaseUpdate = {
      updated_at: new Date().toISOString()
    };
    
    // Map MongoDB fields to Supabase columns
    if (updates.countryCode) supabaseUpdate.country_code = updates.countryCode;
    if (updates.countryName) supabaseUpdate.country_name = updates.countryName;
    if (updates.iccid) supabaseUpdate.iccid = updates.iccid;
    if (updates.qrCode || updates.qr_code_url) supabaseUpdate.qr_code_url = updates.qrCode || updates.qr_code_url;
    if (updates.activationCode || updates.activation_code) supabaseUpdate.activation_code = updates.activationCode || updates.activation_code;
    if (updates.smdpAddress || updates.smdp_address) supabaseUpdate.smdp_address = updates.smdpAddress || updates.smdp_address;
    if (updates.status) supabaseUpdate.status = updates.status;
    if (updates.price) supabaseUpdate.price_rub = updates.price;
    
    // Handle nested orderResult fields
    if (orderResult && typeof orderResult === 'object') {
      if (!supabaseUpdate.metadata) supabaseUpdate.metadata = {};
      Object.keys(orderResult).forEach(key => {
        // Map orderResult fields to metadata or direct columns
        if (key === 'iccid') supabaseUpdate.iccid = orderResult[key];
        else if (key === 'qrCode') supabaseUpdate.qr_code_url = orderResult[key];
        else if (key === 'activationCode') supabaseUpdate.activation_code = orderResult[key];
        else if (key === 'smdpAddress') supabaseUpdate.smdp_address = orderResult[key];
        else if (key === 'status') supabaseUpdate.status = orderResult[key];
        else supabaseUpdate.metadata[key] = orderResult[key];
      });
    }
    
    // Find eSIM record by orderId and userId
    const orderIdStr = orderId?.toString();
    let query = supabaseAdmin
      .from('esim_orders')
      .update(supabaseUpdate)
      .eq('airalo_order_id', orderIdStr);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: updatedOrder, error } = await query
      .select()
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (!updatedOrder) {
      console.log('⚠️ eSIM record not found for orderId:', orderId, 'userId:', userId);
      return NextResponse.json(
        { error: 'eSIM record not found', orderId, userId },
        { status: 404 }
      );
    }
    
    console.log('✅ eSIM record updated in Supabase:', updatedOrder.id);
    console.log('✅ Updated QR code:', updatedOrder.qr_code_url || 'not found');
    
    return NextResponse.json({ 
      success: true, 
      esimId: updatedOrder.id,
      qrCode: updatedOrder.qr_code_url || null,
      message: 'eSIM record updated successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error updating eSIM record:', error);
    return NextResponse.json(
      { error: 'Failed to update eSIM record', details: error.message },
      { status: 500 }
    );
  }
}
