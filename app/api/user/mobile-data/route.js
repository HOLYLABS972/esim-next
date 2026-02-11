import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

// API URLs - check both environment variable names for compatibility
const API_PRODUCTION_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.roamjet.net';
const API_SANDBOX_URL = process.env.NEXT_PUBLIC_API_SANDBOX_URL || process.env.API_SANDBOX_URL || 'https://sandbox.roamjet.net';

/**
 * Get RoamJet API key (for authenticating with RoamJet API server)
 */
const getRoamJetApiKey = async () => {
  try {
    // Try environment variable first
    let apiKey = process.env.NEXT_PUBLIC_ROAMJET_API_KEY || process.env.ROAMJET_API_KEY;
    
    // Get from Supabase if not in environment
    if (!apiKey) {
      try {
        const { data: config } = await supabaseAdmin
          .from('admin_config')
          .select('roamjet_api_key')
          .limit(1)
          .single();
        
        if (config?.roamjet_api_key) {
          apiKey = config.roamjet_api_key;
        }
      } catch (supabaseError) {
        console.error('❌ Error getting API key from Supabase:', supabaseError);
      }
    }
    
    if (!apiKey) {
      throw new Error('RoamJet API key is not configured. Please configure it in admin settings or set NEXT_PUBLIC_ROAMJET_API_KEY environment variable.');
    }
    
    return apiKey;
  } catch (error) {
    console.error('❌ Error getting RoamJet API key:', error);
    throw error;
  }
};

/**
 * Get the correct API base URL based on mode
 * For server-side, we default to production unless explicitly set
 * The client-side code handles mode detection, but we can accept it as a parameter
 */
const getApiBaseUrl = (mode) => {
  // If mode is explicitly provided (from query param or header), use it
  if (mode === 'test' || mode === 'sandbox') {
    return API_SANDBOX_URL;
  }
  // Default to production
  return API_PRODUCTION_URL;
};

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Proxy mobile-data requests to external API
 * This avoids CORS issues by making the request server-side
 */
export async function POST(request) {
  const requestStartTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`\n🚀 [${requestId}] ===== Mobile Data Request Started =====`);
  console.log(`⏰ [${requestId}] Request timestamp: ${new Date().toISOString()}`);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log(`📦 [${requestId}] Request body parsed successfully`);
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { 
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { iccid, orderId } = body || {};
    console.log(`📋 [${requestId}] Request params:`, { iccid: iccid?.substring(0, 10) + '...', orderId });

    if (!iccid && !orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either iccid or orderId is required',
        },
        { 
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Try to get data from Supabase
    let order = null;
    let foundIccid = iccid;

    // If orderId provided but no iccid, try to find Order by orderId
    if (orderId && !iccid) {
      console.log(`🔍 [${requestId}] Looking up Order by orderId: ${orderId}`);
      
      const orderIdStr = orderId.toString();
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('esim_orders')
        .select('iccid, metadata, esim_packages(title, title_ru)')
        .eq('airalo_order_id', orderIdStr)
        .maybeSingle();
      
      if (orderError && orderError.code !== 'PGRST116') {
        console.error(`❌ [${requestId}] Error looking up order:`, orderError);
      } else if (orderData) {
        order = orderData;
        foundIccid = order.iccid || foundIccid;
        console.log(`✅ [${requestId}] Found order by orderId`);
      }
    }

    // If we have ICCID, try to find order by ICCID
    if (foundIccid && !order) {
      console.log(`🔍 [${requestId}] Looking up order by ICCID: ${foundIccid.substring(0, 10)}...`);
      const { data: orderData } = await supabaseAdmin
        .from('esim_orders')
        .select('iccid, metadata, esim_packages(title, title_ru)')
        .eq('iccid', foundIccid)
        .maybeSingle();
      
      if (orderData) {
        order = orderData;
        console.log(`✅ [${requestId}] Found order by ICCID`);
      }
    }

    // Extract package name and operator from Supabase data
    let packageName = 'eSIM Package';
    let operator = 'Roamjet';
    
    if (order) {
      // Get package name from joined package or metadata
      if (order.esim_packages) {
        packageName = order.esim_packages.title || order.esim_packages.title_ru || packageName;
      }
      if (order.metadata?.packageName) {
        packageName = order.metadata.packageName;
      }
      if (order.metadata?.operator) {
        operator = order.metadata.operator;
      }
    }

    // Check for mode in query params or default to production
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');
    const apiBaseUrl = getApiBaseUrl(mode);
    
    // Get RoamJet API key for authentication
    const roamjetApiKey = await getRoamJetApiKey();
    
    // Use foundIccid (from Supabase lookup) or iccid from request
    const iccidToUse = foundIccid || iccid;
    
    if (!iccidToUse) {
      // No ICCID available, return Supabase data as fallback
      console.log(`⚠️ [${requestId}] No ICCID available, returning Supabase data only`);
      const status = order?.status || 'active';
      const expiryDate = order?.expires_at || order?.activated_at;
      
      let daysRemaining = 0;
      let daysUsed = 0;
      if (expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        const diffTime = expiry - now;
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        // Try to get period from package metadata or default to 30
        const period = order?.esim_packages?.validity_days || order?.metadata?.period || 30;
        daysUsed = Math.max(0, period - daysRemaining);
      }
      
      return NextResponse.json({
        success: true,
        data: {
          packageName: packageName,
          operator: operator,
          status: status,
          dataUsed: 'N/A',
          dataTotal: order?.esim_packages?.data_amount_mb ? `${(order.esim_packages.data_amount_mb / 1024).toFixed(2)} GB` : 'N/A',
          dataRemaining: 'N/A',
          usagePercentage: 0,
          isUnlimited: false,
          daysUsed: daysUsed,
          daysRemaining: daysRemaining,
          expiresAt: expiryDate,
          lastUpdated: order?.updated_at || new Date().toISOString()
        }
      }, { status: 200, headers: corsHeaders });
    }
    
    // Try mobile-data endpoint first, then fallback to sim-usage
    // Note: The endpoint should be available at api.roamjet.net after deployment
    let endpointPath = '/api/user/mobile-data';
    let fullUrl = `${apiBaseUrl}${endpointPath}`;
    
    console.log(`🌐 [${requestId}] Proxying mobile-data request to: ${fullUrl}`);
    console.log(`🔍 [${requestId}] API Base URL: ${apiBaseUrl}`);
    console.log(`🔍 [${requestId}] Mode: ${mode || 'production (default)'}`);
    console.log(`🔍 [${requestId}] Using ICCID: ${iccidToUse ? iccidToUse.substring(0, 10) + '...' : 'N/A'}`);
    console.log(`🔍 [${requestId}] Package name from Supabase: ${packageName}`);
    console.log(`🔍 [${requestId}] Operator from Supabase: ${operator}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': roamjetApiKey,
    };

    // Try to get auth token from the request if available (optional - API key is primary auth)
    // Check both lowercase and capitalized versions
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log(`🔐 [${requestId}] Forwarding auth token to external API`);
    } else {
      console.log(`👤 [${requestId}] No auth token in header - using API key authentication only`);
    }
    
    // Note: Authentication is handled via X-API-Key header (already set above)

    // Forward the request to the external API with timeout
    let response;
    const TIMEOUT_MS = 30000; // 30 seconds timeout
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      try {
        response = await fetch(fullUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ iccid: iccidToUse, orderId }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log(`📡 [${requestId}] API Response Status: ${response.status} ${response.statusText}`);
        
        // If 404, try sim-usage endpoint as fallback (requires iccid)
        if (response.status === 404 && iccidToUse) {
          const altEndpointPath = '/api/user/sim-usage';
          const altFullUrl = `${apiBaseUrl}${altEndpointPath}`;
          console.log(`⚠️ 404 received, trying sim-usage endpoint: ${altFullUrl}`);
          
          // Create new controller for alternative request
          const altController = new AbortController();
          const altTimeoutId = setTimeout(() => altController.abort(), TIMEOUT_MS);
          
          try {
            const altResponse = await fetch(altFullUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ iccid: iccidToUse }), // sim-usage only needs iccid
              signal: altController.signal,
            });
            
            clearTimeout(altTimeoutId);
            
            if (altResponse.ok) {
              console.log(`✅ Sim-usage endpoint responded: ${altResponse.status}`);
              // Transform sim-usage response to mobile-data format
              const simUsageData = await altResponse.json();
              if (simUsageData.success && simUsageData.data) {
                const usageData = simUsageData.data.data || simUsageData.data;
                // Transform to mobile-data format, use Supabase data for package/operator if available
                const mobileDataFormat = {
                  success: true,
                  data: {
                    packageName: packageName, // Use from Supabase
                    operator: operator, // Use from Supabase
                    status: usageData.status || 'active',
                    dataUsed: usageData.used || (usageData.used_mb ? `${usageData.used_mb} MB` : '0 MB'),
                    dataTotal: usageData.total || (usageData.total_mb ? `${usageData.total_mb} MB` : '0 MB'),
                    dataRemaining: usageData.remaining || (usageData.remaining_mb ? `${usageData.remaining_mb} MB` : '0 MB'),
                    usagePercentage: usageData.percentage || 0,
                    isUnlimited: usageData.is_unlimited || false,
                    daysUsed: usageData.days_used || 0,
                    daysRemaining: usageData.days_remaining || 0,
                    expiresAt: usageData.validity_end,
                    lastUpdated: usageData.last_updated || new Date().toISOString()
                  }
                };
                return NextResponse.json(mobileDataFormat, {
                  status: 200,
                  headers: corsHeaders,
                });
              }
              response = altResponse;
            } else {
              console.error(`❌ Sim-usage endpoint also returned ${altResponse.status}`);
            }
          } catch (altError) {
            clearTimeout(altTimeoutId);
            if (altError.name === 'AbortError') {
              console.error('❌ Alternative endpoint request timed out');
              throw new Error('Request timeout: Alternative endpoint did not respond within 30 seconds');
            }
            throw altError;
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ Request timed out after 30 seconds');
          return NextResponse.json(
            {
              success: false,
              error: 'Request timeout: The API server did not respond within 30 seconds. Please try again later.',
              details: `Attempted URL: ${fullUrl}`,
            },
            { 
              status: 504,
              headers: corsHeaders,
            }
          );
        }
        throw fetchError;
      }
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      console.error('❌ Failed URL:', fullUrl);
      
      // Check if it's a timeout error
      if (fetchError.message && fetchError.message.includes('timeout')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Request timeout: The API server did not respond within 30 seconds. Please try again later.',
            details: `Attempted URL: ${fullUrl}`,
          },
          { 
            status: 504,
            headers: corsHeaders,
          }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: `Failed to connect to API: ${fetchError.message}`,
          details: `Attempted URL: ${fullUrl}`,
        },
        { 
          status: 503,
          headers: corsHeaders,
        }
      );
    }

    // Handle response
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError);
        const text = await response.text().catch(() => 'Unable to read response');
        console.error('❌ Response text:', text);
        return NextResponse.json(
          {
            success: false,
            error: `API returned invalid JSON: ${response.status} ${response.statusText}`,
          },
          {
            status: response.status || 500,
            headers: corsHeaders,
          }
        );
      }
    } else {
      // Non-JSON response (likely 404 HTML page)
      const text = await response.text().catch(() => 'Unable to read response');
      console.error(`❌ [${requestId}] Non-JSON response from API: ${response.status} ${response.statusText}`);
      console.error(`❌ [${requestId}] Response URL: ${fullUrl}`);
      
      // If 404, the endpoint doesn't exist on the server - return Supabase data as fallback
      if (response.status === 404) {
        console.log(`⚠️ [${requestId}] Endpoint not found (404), returning Supabase data as fallback`);
        
        const status = esim?.status || esim?.orderResult?.status || order?.status || 'active';
        const expiryDate = esim?.expiryDate || esim?.orderResult?.validUntil || order?.expiryDate;
        
        let daysRemaining = 0;
        let daysUsed = 0;
        if (expiryDate) {
          const expiry = new Date(expiryDate);
          const now = new Date();
          const diffTime = expiry - now;
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          const period = esim?.period || esim?.orderResult?.period || order?.period || 30;
          daysUsed = Math.max(0, period - daysRemaining);
        }
        
        return NextResponse.json({
          success: true,
          data: {
            packageName: packageName,
            operator: operator,
            status: status,
            dataUsed: 'N/A', // Real-time usage not available without Airalo API
            dataTotal: esim?.capacity ? `${esim.capacity} GB` : 'N/A',
            dataRemaining: 'N/A',
            usagePercentage: 0,
            isUnlimited: false,
            daysUsed: daysUsed,
            daysRemaining: daysRemaining,
            expiresAt: expiryDate,
            lastUpdated: esim?.updatedAt || order?.updatedAt || new Date().toISOString()
          }
        }, { status: 200, headers: corsHeaders });
      }
      
      return NextResponse.json(
        {
          success: false,
          error: `API returned non-JSON response: ${response.status} ${response.statusText}`,
          details: text.substring(0, 200), // Limit details length
          attemptedUrl: fullUrl,
        },
        {
          status: response.status || 500,
          headers: corsHeaders,
        }
      );
    }

    // If we got successful response, enhance it with Supabase package/operator data if available
    if (data && data.success && data.data && (packageName !== 'eSIM Package' || operator !== 'Roamjet')) {
      data.data.packageName = packageName;
      data.data.operator = operator;
    }

    // Return the response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('❌ Unexpected error proxying mobile-data request:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch mobile data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

