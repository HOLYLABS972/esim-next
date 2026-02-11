import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { orderId, iccid, qrCode, activationCode, smdpAddress } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }
    
    if (!iccid) {
      return NextResponse.json(
        { error: 'iccid is required' },
        { status: 400 }
      );
    }
    
    console.log(`🔄 Updating eSIM ICCID for order: ${orderId}`);
    
    // Find the eSIM record by orderId
    const orderIdStr = orderId.toString();
    const { data: order, error: findError } = await supabaseAdmin
      .from('esim_orders')
      .select('id, country_code, country_name')
      .eq('airalo_order_id', orderIdStr)
      .maybeSingle();
    
    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }
    
    if (!order) {
      return NextResponse.json(
        { error: 'eSIM record not found' },
        { status: 404 }
      );
    }
    
    console.log(`📱 Found eSIM record: ${order.id} (Country: ${order.country_code} - ${order.country_name})`);
    
    // Update only the ICCID and related fields, keep country unchanged
    const updateData = {
      iccid: iccid,
      updated_at: new Date().toISOString()
    };
    
    // Add optional fields if provided
    if (qrCode) {
      updateData.qr_code_url = qrCode;
    }
    
    if (activationCode) {
      updateData.activation_code = activationCode;
    }
    
    if (smdpAddress) {
      updateData.smdp_address = smdpAddress;
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
    
    console.log(`✅ Updated eSIM ${updatedOrder.id} with ICCID: ${iccid} (Country remains: ${order.country_code} - ${order.country_name})`);
    
    return NextResponse.json({
      success: true,
      message: 'eSIM ICCID updated successfully',
      esimId: updatedOrder.id,
      countryCode: order.country_code,
      countryName: order.country_name,
      iccid: iccid
    });
    
  } catch (error) {
    console.error('❌ Error updating eSIM ICCID:', error);
    return NextResponse.json(
      { error: 'Failed to update eSIM ICCID', details: error.message },
      { status: 500 }
    );
  }
}
