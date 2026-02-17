import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    const statusFilter = searchParams.get('status');

    if (!userEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const normalizedEmail = userEmail.toLowerCase().trim();

    // Simple flat query — no joins
    let query = supabaseAdmin
      .from('esim_orders')
      .select('*')
      .ilike('customer_email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter === 'active') {
      query = query.in('status', ['active', 'completed']);
    } else if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    // Fetch package data separately for orders that have package_id
    const packageIds = [...new Set((orders || []).map(o => o.package_id).filter(Boolean))];
    let packagesMap = {};
    if (packageIds.length > 0) {
      const { data: packages } = await supabaseAdmin
        .from('esim_packages')
        .select('id, package_id, title, title_ru, data_amount_mb, validity_days, price_usd, price_rub, package_type, esim_countries(id, airalo_country_code, country_name, country_name_ru, flag_url)')
        .in('id', packageIds);
      for (const pkg of (packages || [])) {
        packagesMap[pkg.id] = pkg;
      }
    }

    const esimsWithInfo = (orders || []).map((order) => {
      const packageData = packagesMap[order.package_id] || null;
      const countryData = packageData?.esim_countries || null;
      
      const packageId = packageData?.package_id || packageData?.id?.toString() || order.package_id?.toString();
      
      let planName = order.plan_name || null;
      if (!planName && packageData && packageData.data_amount_mb) {
        const dataMB = packageData.data_amount_mb;
        const dataGB = dataMB / 1024;
        const dataFormatted = dataGB >= 1 ? `${dataGB.toFixed(dataGB % 1 === 0 ? 0 : 1)}GB` : `${dataMB}MB`;
        planName = `${dataFormatted} - ${packageData.validity_days || 0} days`;
      }
      if (!planName && packageData) {
        planName = packageData.title_ru || packageData.title || packageData.package_id;
      }
      if (!planName) {
        planName = order.package_slug || 'Unknown Plan';
      }
      
      const countryCode = countryData?.airalo_country_code || order.country_code || null;
      const countryName = countryData?.country_name || countryData?.country_name_ru || order.country_name || null;
      
      return {
        id: order.id,
        orderId: order.airalo_order_id || order.id.toString(),
        planName,
        planId: packageId,
        packageId,
        amount: parseFloat(order.price_rub) || 0,
        currency: 'RUB',
        status: order.status || 'pending',
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        countryCode,
        countryName,
        countryNameRu: countryData?.country_name_ru || null,
        flagUrl: countryData?.flag_url || null,
        qrCode: {
          qrCodeUrl: order.qr_code_url,
          directAppleInstallationUrl: order.direct_apple_installation_url || null,
          iccid: order.iccid,
          lpa: order.lpa || null
        },
        qrCodeUrl: order.qr_code_url,
        directAppleInstallationUrl: order.direct_apple_installation_url || null,
        iccid: order.iccid,
        lpa: null,
        smdpAddress: null,
        activationCode: order.activation_code,
        userId: order.user_id,
        customerEmail: null,
        isPending: order.status === 'pending',
        processingStatus: order.status,
        orderResult: {
          orderId: order.airalo_order_id || order.id.toString(),
          planName,
          planId: packageId,
          iccid: order.iccid,
          activationCode: order.activation_code,
          qrCode: order.qr_code || null,
          qrCodeUrl: order.qr_code_url || null,
          directAppleInstallationUrl: order.direct_apple_installation_url || null
        },
        simDetails: null,
        orderData: { package_id: packageId }
      };
    });
    
    return NextResponse.json({
      success: true,
      data: { orders: esimsWithInfo },
      count: esimsWithInfo.length
    });
    
  } catch (error) {
    console.error('❌ Error listing eSIMs:', error);
    return NextResponse.json(
      { error: 'Failed to list eSIMs', details: error.message },
      { status: 500 }
    );
  }
}
