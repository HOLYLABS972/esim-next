import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../src/lib/supabase';

export async function POST(request) {
  try {
    const { credential, code } = await request.json();

    // Handle Google Identity Services (One Tap) credential
    if (credential) {
      try {
        // Validate JWT format
        const parts = credential.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid JWT format');
        }
        
        // Decode the JWT token to get user information
        const payload = JSON.parse(atob(parts[1]));
        
        // Import AuthService to handle Google sign-in
        const { default: authService } = await import('../../../../../src/services/authService');
        
        // Create user object for AuthService
        const googleUser = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          provider: 'google',
          emailVerified: payload.email_verified,
        };

        // Use AuthService to handle Google sign-in (creates/finds user in DB)
        const result = await authService.signInWithGoogle(googleUser);

        // Generate a magic link token so the client can establish a real Supabase session
        if (result.success && result.user?.email) {
          try {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: result.user.email,
            });
            if (!linkError && linkData?.properties?.hashed_token) {
              result.token_hash = linkData.properties.hashed_token;
            } else {
              console.warn('⚠️ Could not generate session link for One Tap:', linkError?.message);
            }
          } catch (linkErr) {
            console.warn('⚠️ generateLink failed for One Tap:', linkErr.message);
          }
        }

        return NextResponse.json(result);
      } catch (jwtError) {
        console.error('JWT parsing error:', jwtError);
        throw new Error('Invalid Google credential format');
      }
    }

    // Handle traditional OAuth flow (fallback)
    if (code) {
      // Load Google config from Supabase
      if (!supabaseAdmin) {
        throw new Error('Supabase not configured');
      }

      const { data: config, error: configError } = await supabaseAdmin
        .from('admin_config')
        .select('google_id, google_secret')
        .limit(1)
        .single();

      if (configError || !config) {
        console.error('❌ Error loading Google OAuth config from Supabase:', configError);
        return NextResponse.json(
          { 
            error: 'Google OAuth is not configured. Please add Google Client ID and Secret in the admin config.',
            details: {
              hasClientId: false,
              hasClientSecret: false
            }
          },
          { status: 500 }
        );
      }

      const googleClientId = config.google_id || '';
      const googleClientSecret = config.google_secret || '';
      
      // Validate credentials are configured
      if (!googleClientId || !googleClientSecret) {
        console.error('❌ Google OAuth credentials not configured in admin_config');
        return NextResponse.json(
          { 
            error: 'Google OAuth is not configured. Please add Google Client ID and Secret in the admin config.',
            details: {
              hasClientId: !!googleClientId,
              hasClientSecret: !!googleClientSecret
            }
          },
          { status: 500 }
        );
      }
      
      // Exchange code for access token
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
      const redirectUri = `${baseUrl}/auth/google/callback`;
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        console.error('❌ Google token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorData,
          redirectUri
        });
        throw new Error(`Failed to exchange code for token: ${errorData.error || errorData.error_description || tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userData = await userResponse.json();

      // Import AuthService to handle Google sign-in
      const { default: authService } = await import('../../../../../src/services/authService');
      
      // Create user object for AuthService
      const googleUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        provider: 'google',
        emailVerified: userData.verified_email,
      };

      // Use AuthService to handle Google sign-in (creates/finds user in DB)
      const result = await authService.signInWithGoogle(googleUser);

      // Generate a magic link token so the client can establish a real Supabase session
      if (result.success && result.user?.email) {
        try {
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: result.user.email,
          });
          if (!linkError && linkData?.properties?.hashed_token) {
            result.token_hash = linkData.properties.hashed_token;
          } else {
            console.warn('⚠️ Could not generate session link for code flow:', linkError?.message);
          }
        } catch (linkErr) {
          console.warn('⚠️ generateLink failed for code flow:', linkErr.message);
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'No credential or authorization code provided' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Google OAuth callback error:', error);
    return NextResponse.json(
      { 
        error: 'Google authentication failed',
        details: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}
