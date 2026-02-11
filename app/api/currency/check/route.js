import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

// Mark this route as dynamic to prevent pre-rendering during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      // Return defaults if Supabase not configured
      return NextResponse.json({
        success: true,
        rates: { usdToRub: 100 },
        config: {
          discountPercentage: 0,
          robokassaMode: 'production',
          roamjetMode: 'production'
        }
      });
    }
    
    // Get admin config from Supabase
    const { data: config, error } = await supabaseAdmin
      .from('admin_config')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching admin config:', error);
    }
    
    // Return currency rates and config
    return NextResponse.json({
      success: true,
      rates: {
        usdToRub: config?.usd_to_rub_rate || 100
      },
      config: {
        discountPercentage: config?.discount_percentage || 0,
        robokassaMode: config?.robokassa_mode || 'test',
        roamjetMode: config?.roamjet_mode || 'sandbox'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching currency config:', error);
    // Return defaults on error
    return NextResponse.json({
      success: true, 
      rates: { usdToRub: 100 },
      config: {
        discountPercentage: 0,
        robokassaMode: 'test',
        roamjetMode: 'sandbox'
      }
    });
  }
}
