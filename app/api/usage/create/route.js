import { NextResponse } from 'next/server';
// MongoDB removed - API usage logging disabled
// If needed, create a Supabase table for api_usage

export async function POST(request) {
  try {
    const usageData = await request.json();
    
    // API usage logging disabled (MongoDB removed)
    // If needed, implement Supabase logging here:
    // const { data, error } = await supabaseAdmin
    //   .from('api_usage')
    //   .insert(usageData);
    
    console.log('⚠️ API usage logging disabled (MongoDB removed)');
    console.log('Usage data:', usageData);
    
    // Return success even though we're not logging
    return NextResponse.json({ 
      success: true, 
      message: 'API usage logging is disabled (MongoDB removed)' 
    });
    
  } catch (error) {
    console.error('❌ Error in usage endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process usage request', details: error.message },
      { status: 500 }
    );
  }
}
