// Edge Function service - Helper to call Supabase Edge Functions directly
// Replaces Next.js API route proxies with direct Edge Function calls

import { supabase } from '../lib/supabase';

/**
 * Helper to get auth headers for Edge Functions
 */
const getAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Get Supabase session token - try multiple methods
  try {
    // First try getSession (faster, uses cached session)
    let session = null;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (!sessionError && sessionData?.session) {
      session = sessionData.session;
    } else {
      // If getSession fails, try getUser (forces refresh)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user) {
        // getUser doesn't return session, so try getSession again
        const { data: retrySession } = await supabase.auth.getSession();
        session = retrySession?.session;
      }
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      console.log('✅ JWT token included in Edge Function request');
    } else {
      console.warn('⚠️ No Supabase session found - Edge Function may require authentication');
    }
  } catch (error) {
    // Silently handle AbortError (request was cancelled/timeout)
    if (error.name === 'AbortError') {
      console.warn('⚠️ Auth check aborted - continuing without JWT');
      return headers;
    }
    // Only log non-abort errors
    if (error.name !== 'AbortError') {
      console.warn('⚠️ No Supabase session found:', error.message);
    }
  }

  // Get API key from environment if available
  const apiKey = process.env.NEXT_PUBLIC_ROAMJET_API_KEY;
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  return headers;
};

/**
 * Invoke an Edge Function
 * @param {string} functionName - Name of the Edge Function
 * @param {Object} options - Request options
 * @param {Object} options.body - Request body
 * @param {Object} options.headers - Additional headers
 * @returns {Promise<Object>} Response data
 */
export const invokeEdgeFunction = async (functionName, options = {}) => {
  try {
    const { body, headers: customHeaders = {} } = options;
    
    // Ensure we have a valid session before calling Edge Functions that require auth
    // supabase.functions.invoke() automatically includes JWT from session
    let session = null;
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (!sessionError && currentSession) {
        session = currentSession;
      } else {
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshedSession) {
          session = refreshedSession;
        }
      }
    } catch (authError) {
      console.warn(`⚠️ Could not get session for Edge Function ${functionName}:`, authError.message);
    }

    // Get additional headers (like API keys)
    const authHeaders = await getAuthHeaders();
    
    // Merge headers (excluding Authorization as supabase.functions.invoke() handles JWT automatically)
    const { Authorization, ...additionalHeaders } = authHeaders;
    const headers = {
      ...additionalHeaders,
      ...customHeaders,
    };

    console.log(`🚀 Invoking Edge Function: ${functionName}`, body ? { bodyKeys: Object.keys(body) } : '');
    if (session) {
      console.log('✅ Session available - JWT will be included automatically');
    } else {
      console.warn('⚠️ No session available - Edge Function may require authentication');
    }
    
    // Invoke Edge Function via Supabase client
    // The client automatically includes JWT from the current session
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: body || undefined,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (error) {
      console.error(`❌ Edge Function ${functionName} error:`, error);
      
      // Check for 401/authentication errors - check both message and status code
      const errorMessage = error.message || '';
      const statusCode = error.status || error.statusCode || null;
      const isAuthError = statusCode === 401 || 
                         statusCode === 403 ||
                         errorMessage.includes('401') || 
                         errorMessage.includes('Unauthorized') ||
                         errorMessage.includes('non-2xx status code');
      
      // If 401 error and no session, throw a special error that can be caught for fallback
      if (isAuthError && !session) {
        const authError = new Error('Authentication required. Please log in to access this feature.');
        authError.isAuthError = true;
        authError.statusCode = statusCode || 401;
        throw authError;
      } else if (isAuthError && session) {
        const authError = new Error('Authentication failed. Please try logging in again.');
        authError.isAuthError = true;
        authError.statusCode = statusCode || 401;
        throw authError;
      }
      
      throw new Error(error.message || `Failed to invoke ${functionName}`);
    }

    // Handle response format
    // Edge Functions can return data directly or wrapped in { success, data }
    if (data && typeof data === 'object') {
      if (data.success === false) {
        throw new Error(data.error || `Error from ${functionName}`);
      }
      // If wrapped in { success, data }, return the data
      if (data.success === true && data.data !== undefined) {
        return data;
      }
    }

    return data;
  } catch (error) {
    console.error(`❌ Error invoking Edge Function ${functionName}:`, error);
    throw error;
  }
};

/**
 * Specific Edge Function wrappers for type safety and convenience
 */
export const edgeFunctions = {
  // User endpoints
  getUserBalance: () => 
    invokeEdgeFunction('user-balance'),
  
  createOrder: (orderData) =>
    invokeEdgeFunction('user-order', { body: orderData }),
  
  getQrCode: (orderId) =>
    invokeEdgeFunction('user-qr-code', { body: { orderId } }),
  
  getMobileData: ({ iccid, orderId }) =>
    invokeEdgeFunction('user-mobile-data', { body: { iccid, orderId } }),
  
  createTopup: (topupData) =>
    invokeEdgeFunction('user-topup', { body: topupData }),

  // Public endpoints
  getCountries: () =>
    invokeEdgeFunction('public-countries'),
  
  getPlans: (params = {}) => {
    // Handle query params for plans (country filter, etc.)
    if (Object.keys(params).length > 0) {
      // Edge Functions receive params in body for POST
      return invokeEdgeFunction('public-plans', { body: params });
    }
    // For GET-like requests, use empty body
    return invokeEdgeFunction('public-plans');
  },
  
  getTopups: (params = {}) => {
    if (Object.keys(params).length > 0) {
      return invokeEdgeFunction('public-topups', { body: params });
    }
    return invokeEdgeFunction('public-topups');
  },
};

export default edgeFunctions;
