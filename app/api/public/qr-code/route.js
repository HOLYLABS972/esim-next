import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public endpoint to get QR code for an eSIM by orderId
 * This endpoint does not require authentication
 * If QR code is not in database, tries to fetch it from external API
 */
export async function POST(request) {
  console.log('📡 POST /api/public/qr-code called');
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const body = await request.json();
    const { orderId } = body;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId parameter is required' },
        { status: 400 }
      );
    }
    
    console.log('📡 Public QR Code API called for orderId:', orderId);
    
    // Use string comparison for airalo_order_id (it's stored as text/bigint, not integer)
    const orderIdStr = orderId.toString();
    
    // Find order in Supabase: try airalo_order_id first, then numeric id
    let order = null;
    let orderError = null;
    const byAiraloId = await supabaseAdmin
      .from('esim_orders')
      .select('*')
      .eq('airalo_order_id', orderIdStr)
      .limit(1)
      .maybeSingle();
    if (byAiraloId.error) orderError = byAiraloId.error;
    if (byAiraloId.data) order = byAiraloId.data;
    if (!order && /^\d+$/.test(orderIdStr)) {
      const byId = await supabaseAdmin
        .from('esim_orders')
        .select('*')
        .eq('id', parseInt(orderIdStr, 10))
        .limit(1)
        .maybeSingle();
      if (byId.data) order = byId.data;
    }
    
    if (orderError) {
      console.error('❌ Error finding order:', orderError);
    }
    
    console.log('🔍 Order lookup result:', { 
      found: !!order, 
      orderId: order?.airalo_order_id || order?.id
    });
    
    // Check if order has QR code data stored in metadata or qr_code fields
    let qrCode = order?.qr_code || null;
    let qrCodeUrl = order?.qr_code_url || null;
    let directAppleInstallationUrl = order?.direct_apple_installation_url || null;
    let iccid = order?.iccid || null;
    let lpa = order?.lpa || null;
    let matchingId = order?.matching_id || null;
    
    // Check metadata JSON field if it exists
    if (!qrCode && order?.metadata) {
      try {
        const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
        if (metadata?.simDetails?.sims?.[0]) {
          const sim = metadata.simDetails.sims[0];
          qrCode = sim.qrcode || sim.qrCode || qrCode;
          qrCodeUrl = sim.qrcode_url || sim.qrCodeUrl || qrCodeUrl;
          directAppleInstallationUrl = sim.direct_apple_installation_url || sim.directAppleInstallationUrl || directAppleInstallationUrl;
          iccid = sim.iccid || iccid;
          lpa = sim.lpa || lpa;
          matchingId = sim.matching_id || sim.matchingId || matchingId;
        }
      } catch (parseError) {
        console.error('⚠️ Error parsing metadata:', parseError);
      }
    }

    // Resolve country for response (used by both early returns below)
    const resolveCountry = async () => {
      let countryCode = order?.country_code || null;
      let countryName = order?.country_name || null;
      if (!countryCode && order?.package_id) {
        try {
          const { data: packageData } = await supabaseAdmin
            .from('esim_packages')
            .select('esim_countries(airalo_country_code, country_name, country_name_ru)')
            .eq('id', order.package_id)
            .limit(1)
            .maybeSingle();
          if (packageData?.esim_countries?.[0]) {
            countryCode = packageData.esim_countries[0].airalo_country_code;
            countryName = packageData.esim_countries[0].country_name;
          }
        } catch (e) {
          console.error('⚠️ Error fetching package for country:', e);
        }
      }
      return { countryCode, countryName };
    };

    // Success when we have direct_apple_installation_url (even if no qr_code) — use it for install page
    if (order && directAppleInstallationUrl) {
      const { countryCode: cc, countryName: cn } = await resolveCountry();
      return NextResponse.json({
        success: true,
        qrCode: qrCode || null,
        lpa: lpa || qrCode || null,
        data: qrCode || null,
        iccid: iccid,
        activationCode: null,
        directAppleInstallationUrl,
        qrCodeUrl: qrCodeUrl,
        matchingId: matchingId,
        countryCode: cc,
        country_code: cc,
        countryName: cn,
        country_name: cn,
      });
    }
    
    if (qrCode && qrCode !== 'null' && qrCode.trim() !== '') {
      console.log('✅ QR code found in order record');
      
      // Extract country code from order
      let countryCode = order?.country_code || null;
      let countryName = order?.country_name || null;
      
      // If country info not in order, try to get from package
      if (!countryCode && order?.package_id) {
        try {
          const { data: packageData } = await supabaseAdmin
            .from('esim_packages')
            .select(`
              esim_countries(
                airalo_country_code,
                country_name,
                country_name_ru
              )
            `)
            .eq('id', order.package_id)
            .limit(1)
            .maybeSingle();
          
          if (packageData?.esim_countries?.[0]) {
            countryCode = packageData.esim_countries[0].airalo_country_code;
            countryName = packageData.esim_countries[0].country_name;
          }
        } catch (packageError) {
          console.error('⚠️ Error fetching package for country:', packageError);
        }
      }
      
      return NextResponse.json({
        success: true,
        qrCode: qrCode,
        lpa: lpa || qrCode,
        data: qrCode,
        iccid: iccid,
        activationCode: null,
        directAppleInstallationUrl: directAppleInstallationUrl,
        qrCodeUrl: qrCodeUrl,
        matchingId: matchingId,
        countryCode: countryCode,
        country_code: countryCode,
        countryName: countryName,
        country_name: countryName,
      });
    }
    
    // If QR code not in database, try to fetch it from external API
    if (!qrCode || qrCode === 'null' || qrCode.trim() === '') {
      console.log('⚠️ QR code not in database, trying to fetch from external API');
      
      try {
        // Get API URL from config
        const { loadAdminConfig } = await import('../../../../src/utils/configLoader');
        const config = await loadAdminConfig();
        const apiUrl = config.roamjetApiUrl || process.env.NEXT_PUBLIC_SANDBOX_URL || 'https://api.roamjet.net';
        const apiKey = process.env.ROAMJET_API_KEY || process.env.NEXT_PUBLIC_ROAMJET_API_KEY;
        
        const orderIdToUse = order?.airalo_order_id || orderIdStr;
        
        console.log('🔍 Using orderId for Python API:', orderIdToUse);
        console.log('📡 API URL:', apiUrl);
        
        if (!apiKey) {
          console.log('⚠️ API key not configured, cannot fetch QR code from Python API');
        } else {
          // Fetch from Python API
          console.log('📡 Fetching QR code from Python API with orderId:', orderIdToUse);
          const externalResponse = await fetch(`${apiUrl}/api/user/qr-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'X-API-Key': apiKey,
            },
            body: JSON.stringify({ orderId: orderIdToUse }),
          });
          
          let externalData = null;
          let responseText = null;
          
          // Read response body only once
          try {
            responseText = await externalResponse.text();
          } catch (readError) {
            console.error('⚠️ Error reading external API response:', readError);
          }
          
          if (externalResponse.ok && responseText) {
            try {
              externalData = JSON.parse(responseText);
              console.log('✅ External API response:', externalData);
            } catch (parseError) {
              console.error('⚠️ Error parsing external API response as JSON:', parseError);
            }
          } else {
            console.log('⚠️ External API returned error:', externalResponse.status, responseText);
          }
          
          if (externalResponse && externalResponse.ok && externalData) {
            const externalQrCode = externalData.qrCode || externalData.lpa || externalData.data;
            
            if (externalQrCode && externalQrCode !== 'null' && externalQrCode.trim() !== '') {
              console.log('✅ QR code fetched from external API');
              
              // Update QR code variables
              qrCode = externalQrCode;
              lpa = externalData.lpa || externalQrCode;
              iccid = externalData.iccid || iccid;
              qrCodeUrl = externalData.qrCodeUrl || qrCodeUrl;
              directAppleInstallationUrl = externalData.directAppleInstallationUrl || directAppleInstallationUrl;
              
              // Save QR code to database for future use
              if (order) {
                try {
                  const updateData = {
                    qr_code: externalQrCode,
                    lpa: externalData.lpa || externalQrCode,
                    iccid: externalData.iccid || iccid,
                    qr_code_url: externalData.qrCodeUrl || qrCodeUrl,
                    direct_apple_installation_url: externalData.directAppleInstallationUrl || directAppleInstallationUrl,
                    updated_at: new Date().toISOString(),
                  };
                  
                  await supabaseAdmin
                    .from('esim_orders')
                    .update(updateData)
                    .eq('id', order.id);
                  
                  console.log('✅ QR code saved to order record');
                } catch (saveError) {
                  console.error('⚠️ Failed to save QR code to database:', saveError);
                }
              }
            } else {
              console.log('⚠️ External API returned but no QR code in response');
            }
          } else if (!externalResponse.ok) {
            console.log('⚠️ External API returned error:', externalResponse?.status, responseText || 'No response');
          }
        }
      } catch (externalError) {
        console.error('⚠️ Error fetching QR code from external API:', externalError);
      }
    }
    
    // If still no QR code, return error
    if (!qrCode || qrCode === 'null' || qrCode.trim() === '') {
      console.log('⚠️ QR code not available for orderId:', orderId);
      return NextResponse.json(
        { 
          success: false,
          error: 'QR code not available yet',
          qrCode: null
        },
        { status: 200 } // Return 200 but with error message
      );
    }
    
    console.log('✅ QR code found for orderId:', orderId);
    
    // Extract country code from order
    let countryCode = order?.country_code || null;
    let countryName = order?.country_name || null;
    
    // If country info not in order, try to get from package
    if (!countryCode && order?.package_id) {
      try {
        const { data: packageData } = await supabaseAdmin
          .from('esim_packages')
          .select(`
            esim_countries(
              airalo_country_code,
              country_name,
              country_name_ru
            )
          `)
          .eq('id', order.package_id)
          .limit(1)
          .maybeSingle();
        
        if (packageData?.esim_countries?.[0]) {
          countryCode = packageData.esim_countries[0].airalo_country_code;
          countryName = packageData.esim_countries[0].country_name;
        }
      } catch (packageError) {
        console.error('⚠️ Error fetching package for country:', packageError);
      }
    }
    
    // Return QR code data
    return NextResponse.json({
      success: true,
      qrCode: qrCode,
      lpa: lpa || qrCode,
      data: qrCode,
      iccid: iccid,
      activationCode: null,
      directAppleInstallationUrl: directAppleInstallationUrl,
      qrCodeUrl: qrCodeUrl,
      matchingId: matchingId,
      countryCode: countryCode,
      country_code: countryCode,
      countryName: countryName,
      country_name: countryName,
    });
    
  } catch (error) {
    console.error('❌ Error getting QR code:', error);
    return NextResponse.json(
      { error: 'Failed to get QR code', details: error.message },
      { status: 500 }
    );
  }
}
