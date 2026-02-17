import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const _dbg = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'NOT SET';
    const _svcKey = (process.env.SUPABASE_SERVICE_JWT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'NONE').substring(0, 20);
    const _adminOk = !!supabaseAdmin;
    if (!supabaseAdmin) {
      console.error('❌ supabaseAdmin is null - SUPABASE_SERVICE_ROLE_KEY may be missing');
      throw new Error('Supabase not configured');
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    const userIdParam = searchParams.get('userId'); // optional: supports UID-based orders
    const statusFilter = searchParams.get('status'); // optional: e.g. 'active'

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required', details: 'Please provide email parameter' },
        { status: 400 }
      );
    }
    
    const normalizedEmail = userEmail.toLowerCase().trim();

    // First, find user by email to get user_id
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (userError) {
      console.error('❌ Error finding user:', userError);
    }

    // Build query - try both user_id and customer_email for compatibility
    let orders = [];
    let error = null;
    
    const fetchOrders = async (queryBuilder) => {
      let q = queryBuilder
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (statusFilter) {
        if (statusFilter === 'active') {
          q = q.in('status', ['active', 'completed']);
        } else {
          q = q.eq('status', statusFilter);
        }
      }
      
      const result = await q;
      return result;
    };
    
    const baseSelect = () => supabaseAdmin
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
            package_type,
            esim_countries(
              id,
              airalo_country_code,
              country_name,
              country_name_ru,
              flag_url
            )
          )
        `);

    const results = [];

    const pushResult = async (fn) => {
      try {
        const r = await fn();
        results.push(r);
      } catch (e) {
        console.warn('List eSIMs query warning:', e?.message || e);
      }
    };

    // Query by customer_email
    await pushResult(() => fetchOrders(baseSelect().ilike('customer_email', normalizedEmail)));
    // Fallback: by customer_email with NO join (guarantees rows if any exist)
    const simpleSelect = () => supabaseAdmin.from('esim_orders').select('*');
    await pushResult(() => fetchOrders(simpleSelect().ilike('customer_email', normalizedEmail)));

    // Merge results, dedupe by primary key
    const merged = new Map();
    for (const r of results) {
      if (r?.error) {
        // Keep the latest error, but continue merging whatever data we got
        error = r.error;
      }
      for (const row of (r?.data || [])) {
        // Prefer rows with join data (esim_packages) over plain rows
        const existing = merged.get(row.id);
        if (!existing || (row.esim_packages && !existing.esim_packages)) {
          merged.set(row.id, row);
        }
      }
    }
    
    orders = Array.from(merged.values()).sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      // Don't fail the entire request if we have some data
      if (!orders || orders.length === 0) {
        throw error;
      }
    }
    
    // Format eSIM orders to match Dashboard expectations (use order row when join data missing)
    const esimsWithInfo = (orders || []).map((order) => {
      const packageData = order.esim_packages;
      const countryData = packageData?.esim_countries;
      
      // Get package ID (use package_id as slug, or numeric id)
      const packageId = packageData?.package_id || packageData?.id?.toString() || order.package_id?.toString();
      
      // Build plan name: prefer order.plan_name (set by bot/backend), then package data, then fallback
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
      
      // Get country info: from joined data, or from order row (esim_orders has country_code, country_name)
      const countryCode = countryData?.airalo_country_code || order.country_code || null;
      const countryName = countryData?.country_name || countryData?.country_name_ru || order.country_name || null;
      const flagUrl = countryData?.flag_url || null;
      
      return {
        // Core identifiers
        id: order.id,
        orderId: order.airalo_order_id || order.id.toString(),
        
        // Plan information (what Dashboard expects)
        planName: planName,
        planId: packageId,
        packageId: packageId,
        
        // Financial info
        amount: parseFloat(order.price_rub) || 0,
        currency: 'RUB',
        
        // Status and dates
        status: order.status || 'pending',
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        
        // Country information (use Airalo's flag URL)
        countryCode: countryCode,
        countryName: countryName,
        countryNameRu: countryData?.country_name_ru || null,
        flagUrl: flagUrl,
        
        // QR Code and eSIM data (what View button needs)
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
        
        // User info
        userId: order.user_id,
        customerEmail: null, // Can be joined from users table if needed
        
        // Additional status info
        isPending: order.status === 'pending',
        processingStatus: order.status,
        
        // Full orderResult for compatibility (mapped from order data)
        orderResult: {
          orderId: order.airalo_order_id || order.id.toString(),
          planName: planName,
          planId: packageId,
          iccid: order.iccid,
          activationCode: order.activation_code,
          qrCode: order.qr_code || null,
          qrCodeUrl: order.qr_code_url || null,
          directAppleInstallationUrl: order.direct_apple_installation_url || null
        },
        
        // Include simDetails and orderData for package ID detection
        simDetails: null,
        orderData: {
          package_id: packageId
        }
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        orders: esimsWithInfo // Frontend expects data.orders array for filtering
      },
      count: esimsWithInfo.length,
      _dbg, _svcKey, _adminOk
    });
    
  } catch (error) {
    console.error('❌ Error listing eSIMs:', error);
    return NextResponse.json(
      { error: 'Failed to list eSIMs', details: error.message },
      { status: 500 }
    );
  }
}