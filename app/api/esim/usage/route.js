import { NextRequest, NextResponse } from 'next/server';

const AIRALO_CLIENT_ID = '5f260affb036f58486895b58a0fbb803';
const AIRALO_CLIENT_SECRET = 'x8BesR7YdqZrRFAYRyQx5GFf6KGWs8wgEMTlpSr3';
const AIRALO_BASE_URL = 'https://partners-api.airalo.com/v2';

// Cache for Airalo access tokens
let accessTokenCache = {
  token: null,
  expiresAt: null
};

async function getAiraloAccessToken() {
  // Check if we have a valid cached token
  if (accessTokenCache.token && accessTokenCache.expiresAt && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

  console.log('[Airalo API] Requesting new access token');

  const response = await fetch(`${AIRALO_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      client_id: AIRALO_CLIENT_ID,
      client_secret: AIRALO_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Airalo API] Token request failed:', response.status, errorText);
    throw new Error(`Failed to get access token: HTTP ${response.status}`);
  }

  const tokenData = await response.json();
  
  if (!tokenData.access_token) {
    console.error('[Airalo API] No access_token in response:', tokenData);
    throw new Error('Invalid token response');
  }

  // Cache the token (default to 1 hour if expires_in not provided)
  const expiresInMs = (tokenData.expires_in || 3600) * 1000;
  accessTokenCache.token = tokenData.access_token;
  accessTokenCache.expiresAt = Date.now() + expiresInMs - 60000; // 1 minute buffer

  console.log('[Airalo API] Got new access token, expires in', tokenData.expires_in, 'seconds');
  
  return accessTokenCache.token;
}

export async function POST(request) {
  try {
    const { iccid } = await request.json();

    if (!iccid) {
      return NextResponse.json(
        { error: 'ICCID is required' },
        { status: 400 }
      );
    }

    console.log('[eSIM Usage API] Fetching usage for ICCID:', iccid);

    // Get access token
    const accessToken = await getAiraloAccessToken();

    // Fetch usage data from Airalo
    const response = await fetch(`${AIRALO_BASE_URL}/sims/${iccid}/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Airalo API] Usage request failed:', response.status, errorText);
      return NextResponse.json(
        { error: `Airalo API error: HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const usageData = await response.json();
    console.log('[eSIM Usage API] Successfully fetched usage data');

    return NextResponse.json({
      success: true,
      data: usageData
    });

  } catch (error) {
    console.error('[eSIM Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const iccid = url.searchParams.get('iccid');

    if (!iccid) {
      return NextResponse.json(
        { error: 'ICCID is required' },
        { status: 400 }
      );
    }

    console.log('[eSIM Usage API] Fetching usage for ICCID (GET):', iccid);

    // Get access token
    const accessToken = await getAiraloAccessToken();

    // Fetch usage data from Airalo
    const response = await fetch(`${AIRALO_BASE_URL}/sims/${iccid}/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Airalo API] Usage request failed:', response.status, errorText);
      return NextResponse.json(
        { error: `Airalo API error: HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const usageData = await response.json();
    console.log('[eSIM Usage API] Successfully fetched usage data');

    return NextResponse.json({
      success: true,
      data: usageData
    });

  } catch (error) {
    console.error('[eSIM Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}