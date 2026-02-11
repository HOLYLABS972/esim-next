import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test Supabase connection
    let isConnected = false;
    let dbName = 'unknown';
    
    if (supabaseAdmin) {
      try {
        // Simple query to test connection
        const { error } = await supabaseAdmin
          .from('admin_config')
          .select('id')
          .limit(1);
        
        isConnected = !error;
        dbName = 'supabase';
      } catch (testError) {
        console.error('Supabase connection test error:', testError);
      }
    }
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: isConnected,
        type: 'supabase',
        dbName: dbName
      }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      }
    }, { status: 500 });
  }
}

export async function POST(request) {
  // Test POST logging - this helps verify POST requests are being logged in Vercel
  const timestamp = new Date().toISOString();
  console.error('🧪 TEST POST REQUEST RECEIVED AT:', timestamp);
  console.log('🧪 TEST POST REQUEST RECEIVED AT:', timestamp);
  
  try {
    const body = await request.json().catch(() => ({}));
    console.log('🧪 TEST POST body:', JSON.stringify(body, null, 2));
    
    return NextResponse.json({
      status: 'ok',
      message: 'POST request received and logged',
      timestamp: timestamp,
      body: body
    }, { status: 200 });
  } catch (error) {
    console.error('🧪 TEST POST error:', error.message);
    return NextResponse.json({
      status: 'error',
      timestamp: timestamp,
      error: error.message
    }, { status: 500 });
  }
}





