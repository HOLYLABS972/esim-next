import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const esimData = await request.json();
    
    // Check if eSIM already exists for this orderId to avoid duplicates
    const orderId = esimData.orderResult?.orderId || esimData.orderId;
    if (orderId) {
      const orderIdStr = orderId.toString();
      const { data: existingOrder, error: checkError } = await supabaseAdmin
        .from('esim_orders')
        .select('id')
        .eq('airalo_order_id', orderIdStr)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingOrder) {
        console.log('✅ eSIM already exists for orderId:', orderId);
        return NextResponse.json({ 
          success: true, 
          esimId: existingOrder.id,
          alreadyExists: true,
          message: 'eSIM record already exists' 
        });
      }
    }
    
    // Map MongoDB esimData to Supabase format
    const orderResult = esimData.orderResult || {};
    const orderData = {
      airalo_order_id: (orderResult.orderId || orderId || '').toString(),
      package_id: orderResult.planId || esimData.planId || null,
      price_rub: esimData.price || 0,
      currency: esimData.currency || 'RUB',
      status: orderResult.status || esimData.status || 'pending',
      country_code: esimData.countryCode || null,
      country_name: esimData.countryName || null,
      customer_email: esimData.customerEmail || null,
      user_id: esimData.userId || null,
      iccid: orderResult.iccid || esimData.iccid || null,
      qr_code_url: orderResult.qrCode || esimData.qrCode || null,
      activation_code: orderResult.activationCode || esimData.activationCode || null,
      smdp_address: orderResult.smdpAddress || esimData.smdpAddress || null,
      metadata: {
        plan_name: orderResult.planName || esimData.planName || null,
        provider: orderResult.provider || 'airalo',
        ...esimData.metadata
      },
      created_at: esimData.createdAt ? new Date(esimData.createdAt).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newOrder, error: createError } = await supabaseAdmin
      .from('esim_orders')
      .insert(orderData)
      .select()
      .single();
    
    if (createError) {
      throw createError;
    }
    
    console.log('✅ eSIM record saved to Supabase:', newOrder.id);
    
    return NextResponse.json({ 
      success: true, 
      esimId: newOrder.id,
      message: 'eSIM record created successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error creating eSIM record:', error);
    return NextResponse.json(
      { error: 'Failed to create eSIM record', details: error.message },
      { status: 500 }
    );
  }
}
