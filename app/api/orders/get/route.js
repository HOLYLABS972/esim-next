import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const iccid = searchParams.get('iccid');
    
    if (!orderId && !iccid) {
      return NextResponse.json(
        { error: 'Either orderId or iccid parameter is required' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Fetching order:', { orderId, iccid: iccid ? iccid.substring(0, 10) + '...' : null });
    
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
          country_id,
          esim_countries:country_id(
            airalo_country_code,
            country_name,
            country_name_ru
          )
        ),
        users(
          id,
          email
        )
      `);
    
    // Query by orderId or iccid
    if (orderId) {
      const orderIdStr = orderId.toString();
      query = query.eq('airalo_order_id', orderIdStr);
    } else if (iccid) {
      query = query.eq('iccid', iccid);
    }
    
    const { data: order, error } = await query
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
    
    if (!order) {
      const searchParam = orderId ? `orderId: ${orderId}` : `iccid: ${iccid?.substring(0, 10)}...`;
      console.log(`⚠️ Order not found in database (${searchParam})`);
      
      // If searching by orderId, try to check if it might exist with a different format
      if (orderId) {
        const orderIdStr = orderId.toString();
        const { data: orderByNumericId } = await supabaseAdmin
          .from('esim_orders')
          .select('id, airalo_order_id')
          .eq('id', parseInt(orderIdStr, 10))
          .maybeSingle();
        
        if (orderByNumericId) {
          console.log(`ℹ️ Found order with numeric ID ${orderByNumericId.id}, but airalo_order_id is ${orderByNumericId.airalo_order_id}`);
        }
      }
      
      return NextResponse.json(
        { error: 'Order not found', orderId: orderId || null, iccid: iccid ? iccid.substring(0, 10) + '...' : null },
        { status: 404 }
      );
    }
    
    console.log('✅ Found order:', order.id);
    
    // Get country info from package relation or direct on order
    const packageCountry = order.esim_packages?.esim_countries;
    const countryCode = order.country_code || packageCountry?.airalo_country_code || order.esim_packages?.country_id;
    const countryName = order.country_name || packageCountry?.country_name;

    // Transform snake_case to camelCase for frontend compatibility
    const transformedOrder = {
      id: order.id,
      orderId: order.airalo_order_id || order.id.toString(),
      iccid: order.iccid,
      amount: order.price_rub || 0,
      currency: order.currency || 'RUB',
      status: order.status,
      paymentStatus: order.payment_status || (order.status === 'active' ? 'paid' : 'pending'),
      customerEmail: order.customer_email,
      userId: order.user_id,
      packageId: order.package_id,
      countryCode: countryCode,
      countryName: countryName,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      metadata: order.metadata,
      planName: order.esim_packages?.title || order.esim_packages?.title_ru,
      package: order.esim_packages ? {
        id: order.esim_packages.id,
        slug: order.esim_packages.package_id,
        title: order.esim_packages.title,
        titleRu: order.esim_packages.title_ru,
        dataAmountMb: order.esim_packages.data_amount_mb,
        validityDays: order.esim_packages.validity_days,
        priceUsd: order.esim_packages.price_usd,
        priceRub: order.esim_packages.price_rub,
        countryId: order.esim_packages.country_id,
        country: packageCountry ? {
          code: packageCountry.airalo_country_code,
          name: packageCountry.country_name,
          nameRu: packageCountry.country_name_ru
        } : null
      } : null,
      user: order.users ? {
        id: order.users.id,
        email: order.users.email
      } : null
    };
    
    return NextResponse.json({
      success: true,
      order: transformedOrder
    });
    
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order', details: error.message },
      { status: 500 }
    );
  }
}
