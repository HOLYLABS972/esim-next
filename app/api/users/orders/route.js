import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'userId or email is required' },
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
    
    // Build query to match by userId OR email (via users table)
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (email) {
      // If email is provided, we need to find the user_id first, then query orders
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1)
        .single();
      
      if (userError || !user) {
        return NextResponse.json({
          success: true,
          orders: []
        });
      }
      
      query = query.eq('user_id', user.id);
    }
    
    console.log(`🔍 Fetching orders for userId: ${userId}, email: ${email}`);
    
    const { data: orders, error } = await query;
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${orders?.length || 0} orders`);
    
    // Transform snake_case to camelCase for frontend compatibility
    const transformedOrders = (orders || []).map(order => {
      const packageData = order.esim_packages;
      const countryData = packageData?.esim_countries;
      
      // Build plan name from package data
      const dataMB = packageData?.data_amount_mb || 0;
      const dataGB = dataMB / 1024;
      const dataFormatted = dataGB >= 1 ? `${dataGB.toFixed(dataGB % 1 === 0 ? 0 : 1)}GB` : `${dataMB}MB`;
      const planName = packageData ? `${dataFormatted} - ${packageData.validity_days || 0} days` : 'Unknown Plan';
      
      return {
        _id: order.id.toString(),
        id: order.id.toString(),
        orderId: order.airalo_order_id || order.id.toString(),
        userId: order.user_id,
        customerEmail: order.users?.email || null,
        description: planName,
        packageId: order.package_id?.toString(),
        planId: order.package_id?.toString(),
        planName: planName,
        amount: parseFloat(order.price_rub) || 0,
        currency: 'RUB',
        status: order.status || 'pending',
        paymentStatus: order.status === 'active' ? 'paid' : order.status || 'pending',
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        completedAt: order.activated_at,
        countryCode: countryData?.airalo_country_code || null,
        countryName: countryData?.country_name || countryData?.country_name_ru || null,
        orderType: 'esim_purchase',
        metadata: {}
      };
    });
    
    return NextResponse.json({
      success: true,
      orders: transformedOrders
    });
    
  } catch (error) {
    console.error('❌ Error fetching user orders from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}
