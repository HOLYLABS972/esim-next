import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const rawStore = searchParams.get('store') || 'globalbanka';
    const storeParam = rawStore === 'roamjet' ? 'easycall' : rawStore;

    let query = supabaseAdmin
      .from('esim_orders')
      .select(
        `
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
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (storeParam) {
      // Include NULL store_id when filtering by globalbanka (backward compatibility)
      if (storeParam === 'globalbanka') {
        query = query.or('store_id.eq.globalbanka,store_id.is.null');
      } else {
        query = query.eq('store_id', storeParam);
      }
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    const transformedOrders = (orders || []).map((order) => {
      const packageData = order.esim_packages;
      const countryData = packageData?.esim_countries;
      const dataMB = packageData?.data_amount_mb || 0;
      const dataGB = dataMB / 1024;
      const dataFormatted =
        dataGB >= 1
          ? `${dataGB.toFixed(dataGB % 1 === 0 ? 0 : 1)}GB`
          : `${dataMB}MB`;
      const planName = packageData
        ? `${dataFormatted} - ${packageData.validity_days || 0} days`
        : order.plan_name || 'Unknown Plan';

      return {
        _id: order.id.toString(),
        id: order.id.toString(),
        orderId: order.airalo_order_id || order.id.toString(),
        userId: order.user_id,
        customerEmail: order.users?.email || order.customer_email || null,
        description: planName,
        packageId: order.package_id?.toString(),
        planId: order.package_id?.toString(),
        planName,
        amount: parseFloat(order.price_rub) || 0,
        currency: order.currency || 'RUB',
        status: order.status || 'pending',
        paymentStatus:
          order.status === 'active' ? 'paid' : order.status || 'pending',
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        completedAt: order.activated_at,
        countryCode: countryData?.airalo_country_code || order.country_code || null,
        countryName:
          countryData?.country_name ||
          countryData?.country_name_ru ||
          order.country_name ||
          null,
        orderType: order.order_type || 'esim_purchase',
        storeId: order.store_id || null,
        metadata: order.metadata || {}
      };
    });

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching config orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}
