import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const AIRALO_BASE_URL = 'https://partners-api.airalo.com';

interface RequestBody {
  iccid?: string;
  orderId?: string;
}

interface MobileDataResponse {
  success: boolean;
  data?: {
    packageName?: string;
    operator?: string;
    status?: string;
    dataUsed?: string;
    dataTotal?: string;
    dataRemaining?: string;
    usagePercentage?: number;
    isUnlimited?: boolean;
    daysUsed?: number;
    daysRemaining?: number;
    expiresAt?: string;
    lastUpdated?: string;
  };
  error?: string;
}

/**
 * Get Airalo credentials from Supabase admin_config
 */
async function getAiraloCredentials(supabase: any): Promise<{ clientId: string; clientSecret: string }> {
  try {
    // Try environment variables first
    const envClientId = Deno.env.get('AIRALO_CLIENT_ID') || Deno.env.get('AIRALO_API_KEY');
    const envClientSecret = Deno.env.get('AIRALO_CLIENT_SECRET_PRODUCTION') || Deno.env.get('AIRALO_CLIENT_SECRET');
    
    if (envClientId && envClientSecret) {
      return { clientId: envClientId, clientSecret: envClientSecret };
    }

    // Try Supabase admin_config
    const { data: config, error } = await supabase
      .from('admin_config')
      .select('airalo_api_key, airalo_client_secret')
      .limit(1)
      .single();

    if (error) {
      console.error('Error getting Airalo credentials from Supabase:', error);
      throw new Error('Airalo credentials are not configured');
    }

    if (config?.airalo_api_key && config?.airalo_client_secret) {
      return { clientId: config.airalo_api_key, clientSecret: config.airalo_client_secret };
    }

    throw new Error('Airalo credentials are not configured');
  } catch (error) {
    console.error('Error getting Airalo credentials:', error);
    throw error;
  }
}

/**
 * Get Airalo access token
 */
async function getAiraloToken(supabase: any): Promise<string> {
  const { clientId, clientSecret } = await getAiraloCredentials(supabase);
  
  const authResponse = await fetch(`${AIRALO_BASE_URL}/v2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });

  if (!authResponse.ok) {
    const errorText = await authResponse.text();
    throw new Error(`Airalo authentication failed: ${authResponse.statusText} - ${errorText}`);
  }

  const authData = await authResponse.json();
  const accessToken = authData.data?.access_token;

  if (!accessToken) {
    throw new Error('Airalo access token not found in response');
  }

  return accessToken;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const requestId = Math.random().toString(36).substring(7);
  console.log(`🚀 [${requestId}] Mobile Data Request Started`);

  try {
    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
      console.log(`📦 [${requestId}] Request body parsed:`, { 
        hasIccid: !!body.iccid, 
        hasOrderId: !!body.orderId 
      });
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request body. Expected JSON.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const { iccid, orderId } = body || {};

    if (!iccid && !orderId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Either iccid or orderId is required',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If orderId provided but no iccid, try to find order in Supabase
    let foundIccid = iccid;
    let orderData: any = null;
    let order: any = null;
    let packageName = 'eSIM Package';
    let operator = 'Roamjet';

    if (orderId && !iccid) {
      console.log(`🔍 [${requestId}] Looking up order by orderId: ${orderId}`);
      
      const { data: orderResult, error: orderError } = await supabase
        .from('esim_orders')
        .select(`
          *,
          esim_packages(
            id,
            title,
            title_ru,
            data_amount_mb,
            validity_days,
            price_usd
          )
        `)
        .eq('airalo_order_id', orderId.toString())
        .maybeSingle();

      if (orderError && orderError.code !== 'PGRST116') {
        console.error(`❌ [${requestId}] Error looking up order:`, orderError);
      } else if (orderResult) {
        console.log(`✅ [${requestId}] Found order in Supabase`);
        orderData = orderResult;
        order = orderResult;
        foundIccid = orderResult.iccid || foundIccid;
        
        // Get package name from package or metadata
        if (orderResult.esim_packages?.title_ru) {
          packageName = orderResult.esim_packages.title_ru;
        } else if (orderResult.esim_packages?.title) {
          packageName = orderResult.esim_packages.title;
        } else if (orderResult.metadata?.packageName) {
          packageName = orderResult.metadata.packageName;
        }
        
        if (orderResult.metadata?.operator) {
          operator = orderResult.metadata.operator;
        }
      }
    }

    // If we have ICCID, try to find order by ICCID for package info
    if (foundIccid && !orderData) {
      console.log(`🔍 [${requestId}] Looking up order by ICCID`);
      
      const { data: orderResult } = await supabase
        .from('esim_orders')
        .select(`
          *,
          esim_packages(
            id,
            title,
            title_ru,
            data_amount_mb,
            validity_days
          )
        `)
        .eq('iccid', foundIccid)
        .maybeSingle();

      if (orderResult) {
        orderData = orderResult;
        order = orderResult;
        if (orderResult.esim_packages?.title_ru) {
          packageName = orderResult.esim_packages.title_ru;
        } else if (orderResult.esim_packages?.title) {
          packageName = orderResult.esim_packages.title;
        } else if (orderResult.metadata?.packageName) {
          packageName = orderResult.metadata.packageName;
        }
        if (orderResult.metadata?.operator) {
          operator = orderResult.metadata.operator;
        }
      }
    }

    // Use foundIccid or iccid from request
    const iccidToUse = foundIccid || iccid;

    if (!iccidToUse) {
      // No ICCID available, return basic data from Supabase
      console.log(`⚠️ [${requestId}] No ICCID available, returning basic data from Supabase`);
      
      const status = orderData?.status || 'active';
      const expiryDate = orderData?.expires_at || orderData?.activated_at;
      const validityDays = orderData?.esim_packages?.validity_days || orderData?.validity_days || 30;
      const dataAmountMb = orderData?.esim_packages?.data_amount_mb || orderData?.data_amount_mb || null;
      
      // Calculate days remaining/used from package validity
      let daysRemaining = 0;
      let daysUsed = 0;
      if (expiryDate && validityDays) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        const diffTime = expiry.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        daysUsed = Math.max(0, validityDays - daysRemaining);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            packageName,
            operator,
            status,
            dataUsed: 'N/A',
            dataTotal: dataAmountMb ? `${(dataAmountMb / 1024).toFixed(2)} GB` : 'N/A',
            dataRemaining: 'N/A',
            usagePercentage: 0,
            isUnlimited: false,
            daysUsed,
            daysRemaining,
            expiresAt: expiryDate,
            lastUpdated: new Date().toISOString(),
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get Airalo access token
    let airaloToken: string;
    try {
      airaloToken = await getAiraloToken(supabase);
      console.log(`🔐 [${requestId}] Airalo token obtained`);
    } catch (tokenError: any) {
      console.error(`❌ [${requestId}] Failed to get Airalo token:`, tokenError);
      
      // Return Supabase data if Airalo auth fails
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            packageName,
            operator,
            status: orderData?.status || 'active',
            dataUsed: 'N/A',
            dataTotal: orderData?.esim_packages?.data_amount_mb ? `${(orderData.esim_packages.data_amount_mb / 1024).toFixed(2)} GB` : (orderData?.data_amount_mb ? `${(orderData.data_amount_mb / 1024).toFixed(2)} GB` : 'N/A'),
            dataRemaining: 'N/A',
            usagePercentage: 0,
            isUnlimited: false,
            daysUsed: 0,
            daysRemaining: 0,
            expiresAt: null,
            lastUpdated: new Date().toISOString(),
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Call Airalo API directly for usage data
    const usageUrl = `${AIRALO_BASE_URL}/v2/sims/${iccidToUse}/usage`;
    console.log(`🌐 [${requestId}] Calling Airalo API: ${usageUrl}`);
    console.log(`🔍 [${requestId}] Using ICCID: ${iccidToUse.substring(0, 10)}...`);

    const TIMEOUT_MS = 30000; // 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(usageUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${airaloToken}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`📡 [${requestId}] Airalo API Response Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${requestId}] Airalo API error:`, errorText);
        
        // Return Supabase data if Airalo fails
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              packageName,
              operator,
              status: orderData?.status || 'active',
              dataUsed: 'N/A',
              dataTotal: orderData?.esim_packages?.data_amount_mb ? `${(orderData.esim_packages.data_amount_mb / 1024).toFixed(2)} GB` : (orderData?.data_amount_mb ? `${(orderData.data_amount_mb / 1024).toFixed(2)} GB` : 'N/A'),
              dataRemaining: 'N/A',
              usagePercentage: 0,
              isUnlimited: false,
              daysUsed: 0,
              daysRemaining: 0,
              expiresAt: null,
              lastUpdated: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      const airaloData = await response.json();
      const usageData = airaloData.data || {};

      // Format Airalo response to mobile-data format
      const formattedData: MobileDataResponse = {
        success: true,
        data: {
          packageName: packageName !== 'eSIM Package' ? packageName : usageData.package_name || 'eSIM Package',
          operator: operator !== 'Roamjet' ? operator : usageData.operator || 'Roamjet',
          status: usageData.status || orderData?.status || 'active',
          dataUsed: usageData.used || (usageData.used_mb ? `${usageData.used_mb} MB` : '0 MB'),
          dataTotal: usageData.total || (usageData.total_mb ? `${usageData.total_mb} MB` : orderData?.esim_packages?.data_amount_mb ? `${(orderData.esim_packages.data_amount_mb / 1024).toFixed(2)} GB` : (orderData?.data_amount_mb ? `${(orderData.data_amount_mb / 1024).toFixed(2)} GB` : 'N/A')),
          dataRemaining: usageData.remaining || (usageData.remaining_mb ? `${usageData.remaining_mb} MB` : 'N/A'),
          usagePercentage: usageData.percentage || 0,
          isUnlimited: usageData.is_unlimited || false,
          daysUsed: usageData.days_used || 0,
          daysRemaining: usageData.days_remaining || 0,
          expiresAt: usageData.validity_end || orderData?.expires_at,
          lastUpdated: usageData.last_updated || new Date().toISOString(),
        },
      };

      console.log(`✅ [${requestId}] Successfully retrieved mobile data from Airalo`);

      return new Response(
        JSON.stringify(formattedData),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error(`❌ [${requestId}] Request timeout`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request timeout. Please try again.',
          }),
          {
            status: 504,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      console.error(`❌ [${requestId}] Fetch error:`, fetchError);
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`❌ [${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch mobile data',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
