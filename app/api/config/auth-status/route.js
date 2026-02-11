import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

// Mark this route as dynamic to prevent pre-rendering during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public API endpoint to get auth provider status (Google/Yandex)
 * Returns whether each auth method is enabled and their client IDs
 *
 * Note: Google OAuth is configured in Supabase Dashboard, so we check for
 * google_auth_enabled flag. Yandex uses custom OAuth with credentials from admin_config.
 */
export async function GET(request) {
  try {
    // Get admin config from Supabase
    const { data: config, error } = await supabaseAdmin
      .from('admin_config')
      .select('google_id, google_auth_enabled, yandex_app_id')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching auth status from Supabase:', error);
      // Return Google enabled by default (configured in Supabase Dashboard), Yandex disabled
      return NextResponse.json({
        success: true,
        googleAuthEnabled: true,
        yandexAuthEnabled: false,
        googleId: '',
        yandexAppId: '',
      });
    }

    const googleId = config?.google_id || '';
    const yandexAppId = config?.yandex_app_id || '';

    // Google auth: check google_auth_enabled flag, or google_id, or default to true
    // (since Google OAuth is configured in Supabase Dashboard)
    const googleAuthEnabled = config?.google_auth_enabled !== false &&
      (config?.google_auth_enabled === true || !!googleId || true);

    // Yandex auth: requires yandex_app_id in admin_config
    const yandexAuthEnabled = !!yandexAppId;

    return NextResponse.json({
      success: true,
      googleAuthEnabled: googleAuthEnabled,
      yandexAuthEnabled: yandexAuthEnabled,
      googleId: googleId,
      yandexAppId: yandexAppId,
    });

  } catch (error) {
    console.error('Error fetching auth status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch auth status',
        details: error.message,
        googleAuthEnabled: true,  // Default to true since configured in Supabase Dashboard
        yandexAuthEnabled: false,
        googleId: '',
        yandexAppId: '',
      },
      { status: 500 }
    );
  }
}
