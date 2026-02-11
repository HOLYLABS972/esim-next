import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    console.log('📡 /api/esims route called');
    console.log('📡 Request URL:', request.url);
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'active', 'expired', or null for all
    
    console.log('📡 userId:', userId);
    console.log('📡 status:', status);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }
    
    // Build query with joins to get package and country info
    let query = supabaseAdmin
      .from('esim_orders')
      .select(`
        *,
        esim_packages(
          id,
          package_id,
          title,
          title_ru,
          data_amount_mb,
          validity_days,
          price_usd,
          price_rub,
          esim_countries(
            airalo_country_code,
            country_name,
            country_name_ru
          )
        ),
        users(
          id,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    // Query by userId (try both formats)
    const userIdStr = userId.toString();
    const normalizedUserId = userIdStr.replace('email_', '');
    query = query.or(`user_id.eq.${userIdStr},user_id.eq.${normalizedUserId},customer_email.eq.${normalizedUserId}`);
    
    // Filter by status
    if (status === 'active') {
      query = query.eq('status', 'active');
    } else if (status === 'expired') {
      query = query.eq('status', 'expired');
    }
    
    const { data: orders, error } = await query;
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Found ${orders?.length || 0} eSIMs for user: ${userId}, status: ${status || 'all'}`);
    
    // Transform snake_case to camelCase for frontend compatibility
    const formattedEsims = (orders || []).map(order => {
      const packageData = order.esim_packages;
      const countryData = packageData?.esim_countries;
      
      // Build plan name from package data
      const dataMB = packageData?.data_amount_mb || 0;
      const dataGB = dataMB / 1024;
      const dataFormatted = dataGB >= 1 ? `${dataGB.toFixed(dataGB % 1 === 0 ? 0 : 1)}GB` : `${dataMB}MB`;
      const planName = packageData ? `${dataFormatted} - ${packageData.validity_days || 0} days` : (order.metadata?.plan_name || '');
      
      const orderId = order.airalo_order_id || order.id.toString();
      const planId = order.package_id?.toString() || '';
      
      return {
        id: order.id.toString(),
        orderId: orderId,
        planName: planName,
        planId: planId,
        packageId: planId,
        amount: parseFloat(order.price_rub) || 0,
        status: order.status || 'pending',
        customerEmail: order.customer_email || order.users?.email || '',
        createdAt: order.created_at || new Date().toISOString(),
        updatedAt: order.updated_at || new Date().toISOString(),
        countryCode: order.country_code || countryData?.airalo_country_code || '',
        countryName: order.country_name || countryData?.country_name || countryData?.country_name_ru || '',
        qrCode: order.qr_code_url || '',
        qrCodeUrl: order.qr_code_url || '',
        directAppleInstallationUrl: '',
        iccid: order.iccid || '',
        lpa: '',
        activationCode: order.activation_code || '',
        smdpAddress: order.smdp_address || '',
        isTestMode: false,
        sessionLost: !order.user_id,
        expiresAt: order.valid_until || null,
        validUntil: order.valid_until || null,
        dataUsage: null,
        totalData: packageData?.data_amount_mb || null,
        orderType: 'esim_purchase',
        orderResult: {
          orderId: orderId,
          planId: planId,
          planName: planName,
          status: order.status,
          iccid: order.iccid,
          qrCode: order.qr_code_url,
          activationCode: order.activation_code,
          smdpAddress: order.smdp_address
        },
        metadata: order.metadata || {},
        orderData: {
          package_id: planId,
          orderId: orderId,
          amount: parseFloat(order.price_rub) || 0
        }
      };
    });
    
    return NextResponse.json({
      success: true,
      esims: formattedEsims
    });
    
  } catch (error) {
    console.error('❌ Error fetching eSIMs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eSIMs', details: error.message },
      { status: 500 }
    );
  }
}

