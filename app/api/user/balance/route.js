import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

// API URLs - check both environment variable names for compatibility
const API_PRODUCTION_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://sdk.roamjet.net';
const API_SANDBOX_URL = process.env.NEXT_PUBLIC_API_SANDBOX_URL || process.env.API_SANDBOX_URL || 'https://sandbox.roamjet.net';

/**
 * Get the correct API base URL based on mode
 * For server-side, we default to production unless explicitly set
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
 * Get RoamJet API key from Supabase
 */
const getRoamJetApiKey = async () => {
  try {
    // First try environment variable
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
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS(request) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Get business account balance from RoamJet API
 * This proxies the request to the external RoamJet API
 */
export async function GET(request) {
  const requestStartTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`\n💰 [${requestId}] ===== Balance Check Request Started =====`);
  console.log(`⏰ [${requestId}] Request timestamp: ${new Date().toISOString()}`);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  try {
    // Check for mode in query params or default to production
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');
    const apiBaseUrl = getApiBaseUrl(mode);
    
    // Get RoamJet API key
    const apiKey = await getRoamJetApiKey();
    
    // Get authorization token from request headers (if provided)
    const authToken = request.headers.get('authorization') || request.headers.get('Authorization');
    
    // Build headers for external API request
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };
    
    // Add authorization header if provided
    if (authToken) {
      headers['Authorization'] = authToken;
    }
    
    const endpointPath = '/api/user/balance';
    const fullUrl = `${apiBaseUrl}${endpointPath}`;
    
    console.log(`🌐 [${requestId}] Proxying balance request to: ${fullUrl}`);
    console.log(`🔍 [${requestId}] API Base URL: ${apiBaseUrl}`);
    console.log(`🔍 [${requestId}] Mode: ${mode || 'production (default)'}`);
    
    // Make request to external API with timeout
    const TIMEOUT_MS = 30000; // 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    let response;
    try {
      response = await fetch(fullUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log(`📡 [${requestId}] API Response Status: ${response.status} ${response.statusText}`);
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error(`❌ [${requestId}] Request timeout after ${TIMEOUT_MS}ms`);
        return NextResponse.json(
          {
            success: false,
            error: 'Request timeout: API did not respond within 30 seconds',
          },
          { 
            status: 504,
            headers: corsHeaders,
          }
        );
      }
      
      console.error(`❌ [${requestId}] Fetch error:`, fetchError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to connect to API: ${fetchError.message}`,
        },
        { 
          status: 503,
          headers: corsHeaders,
        }
      );
    }
    
    // Parse response
    let responseData;
    try {
      const responseText = await response.text();
      if (responseText) {
        responseData = JSON.parse(responseText);
      } else {
        responseData = {};
      }
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse response:`, parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid response from API',
        },
        { 
          status: 502,
          headers: corsHeaders,
        }
      );
    }
    
    const processingTime = Date.now() - requestStartTime;
    console.log(`✅ [${requestId}] Balance check completed in ${processingTime}ms`);
    console.log(`💰 [${requestId}] Balance response:`, {
      balance: responseData.balance,
      hasInsufficientFunds: responseData.hasInsufficientFunds,
      minimumRequired: responseData.minimumRequired,
      mode: responseData.mode
    });
    
    // Return the response from external API
    return NextResponse.json(
      responseData,
      {
        status: response.ok ? 200 : response.status,
        headers: corsHeaders,
      }
    );
    
  } catch (error) {
    const processingTime = Date.now() - requestStartTime;
    console.error(`❌ [${requestId}] Balance check error after ${processingTime}ms:`, error);
    console.error(`❌ [${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check balance',
      },
      { 
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

