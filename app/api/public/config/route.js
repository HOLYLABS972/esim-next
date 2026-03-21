import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

// Mark this route as dynamic to prevent pre-rendering during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public API endpoint to get OpenRouter API key
 * This is safe to expose as it's used by the mobile app
 */
export async function GET(request) {
  try {
    // Get admin config from Supabase
    const { data: config, error } = await supabaseAdmin
      .from('admin_config')
      .select('open_router_api_key, appearance_theme')
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching public config from Supabase:', error);
    }

    const theme = config?.appearance_theme === 'dark' ? 'dark' : 'light';
    return NextResponse.json({
      success: true,
      openRouterApiKey: config?.open_router_api_key || config?.openRouterApiKey || '',
      appearanceTheme: theme,
    });
    
  } catch (error) {
    console.error('❌ Error fetching public config:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch config', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

