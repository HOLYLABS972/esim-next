import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { 
      orderId, 
      planId, 
      planName, 
      countryCode, 
      countryName, 
      amount, 
      currency, 
      userId, 
      customerEmail,
      status
    } = await request.json();
    
    // Map 'pending' to 'inactive' since status enum only allows: 'active', 'inactive', 'expired'
    const esimStatus = status === 'pending' ? 'inactive' : (status || 'inactive');
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }
    
    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }
    
    // Log received country data
    console.log('🌍 Received country data in eSIM create-pending:', {
      countryCode: countryCode,
      countryName: countryName,
      hasCountryCode: !!countryCode,
      hasCountryName: !!countryName,
      countryCodeType: typeof countryCode,
      countryNameType: typeof countryName
    });
    
    // Validate countryCode and countryName - DO NOT use fallback, require actual values
    if (!countryCode || !countryName) {
      console.error('❌ CRITICAL: Missing country information in eSIM create-pending!', { 
        received: { countryCode, countryName },
        orderId,
        planId,
        planName
      });
      return NextResponse.json(
        { error: 'countryCode and countryName are required', received: { countryCode, countryName } },
        { status: 400 }
      );
    }
    
    const finalCountryCode = countryCode;
    const finalCountryName = countryName;
    
    console.log(`📱 Creating pending eSIM record for order: ${orderId}`);
    console.log(`🌍 Country: ${finalCountryCode} - ${finalCountryName}`);
    console.log(`📦 Plan: ${planId} - ${planName}`);
    console.log(`💰 Amount: ${amount} ${currency || 'RUB'}`);
    
    // Check if eSIM already exists for this orderId
    const orderIdStr = orderId.toString();
    const { data: existingOrder, error: checkError } = await supabaseAdmin
      .from('esim_orders')
      .select('id')
      .eq('airalo_order_id', orderIdStr)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing order:', checkError);
      throw checkError;
    }
    
    if (existingOrder) {
      console.log(`⚠️ eSIM already exists for order ${orderId}, updating country info`);
      
      // Update existing eSIM with correct country info
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('esim_orders')
        .update({
          country_code: finalCountryCode,
          country_name: finalCountryName,
          package_id: planId,
          status: esimStatus,
          metadata: { processing_status: 'pending' },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrder.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Existing eSIM updated with country info',
        esimId: updatedOrder.id,
        countryCode: countryCode,
        countryName: countryName
      });
    }
    
    // Create new pending eSIM record with correct country
    const orderData = {
      airalo_order_id: orderIdStr,
      package_id: planId,
      price_rub: amount || 0,
      currency: currency || 'RUB',
      status: esimStatus,
      country_code: finalCountryCode,
      country_name: finalCountryName,
      customer_email: customerEmail || null,
      user_id: userId || null,
      iccid: null,
      qr_code_url: null,
      activation_code: null,
      smdp_address: null,
      metadata: {
        plan_name: planName,
        processing_status: 'pending',
        session_lost: !userId,
        processing_key: `${userId || `email_${customerEmail}`}_${orderId}_${Date.now()}`
      },
      created_at: new Date().toISOString(),
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
    
    console.log(`✅ Created pending eSIM record: ${newOrder.id}`);
    console.log(`🌍 Country stored: ${finalCountryCode} - ${finalCountryName}`);
    console.log(`📦 Plan stored: ${planId} - ${planName}`);
    console.log(`👁️ Status: ${esimStatus} (inactive/hidden until payment)`);
    console.log(`⏳ Processing Status: pending (will be completed after payment)`);
    
    return NextResponse.json({
      success: true,
      message: 'Pending eSIM record created successfully',
      esimId: newOrder.id,
      orderId: orderId,
      planId: planId,
      planName: planName,
      countryCode: finalCountryCode,
      countryName: finalCountryName,
      status: esimStatus,
      processingStatus: 'pending'
    });
    
  } catch (error) {
    console.error('❌ Error creating pending eSIM record:', error);
    return NextResponse.json(
      { error: 'Failed to create pending eSIM record', details: error.message },
      { status: 500 }
    );
  }
}
