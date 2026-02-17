import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_JWT || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase not configured');
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    const statusFilter = searchParams.get('status');

    if (!userEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const normalizedEmail = userEmail.toLowerCase().trim();

    // Build PostgREST query directly via fetch
    const params = new URLSearchParams();
    params.set('customer_email', `ilike.${normalizedEmail}`);
    params.set('order', 'created_at.desc');
    params.set('limit', '100');
    params.set('select', '*');
    
    if (statusFilter === 'active') {
      params.set('status', 'in.(active,completed)');
    } else if (statusFilter) {
      params.set('status', `eq.${statusFilter}`);
    }

    const ordersRes = await fetch(`${supabaseUrl}/rest/v1/esim_orders?${params.toString()}`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!ordersRes.ok) {
      const errText = await ordersRes.text();
      throw new Error(`Supabase query failed: ${ordersRes.status} ${errText}`);
    }

    const orders = await ordersRes.json();

    // Fetch package data separately
    const packageIds = [...new Set((orders || []).map(o => o.package_id).filter(Boolean))];
    let packagesMap = {};
    if (packageIds.length > 0) {
      const pkgRes = await fetch(
        `${supabaseUrl}/rest/v1/esim_packages?id=in.(${packageIds.join(',')})&select=id,package_id,title,title_ru,data_amount_mb,validity_days,price_usd,price_rub,package_type,esim_countries(id,airalo_country_code,country_name,country_name_ru,flag_url)`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          cache: 'no-store',
        }
      );
      if (pkgRes.ok) {
        const packages = await pkgRes.json();
        for (const pkg of packages) {
          packagesMap[pkg.id] = pkg;
        }
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
