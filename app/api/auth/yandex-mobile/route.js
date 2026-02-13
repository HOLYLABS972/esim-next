import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_JWT || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request) {
  try {
    const { access_token, yandex_user } = await request.json();

    if (!access_token || !yandex_user?.default_email) {
      return NextResponse.json({ error: 'Missing token or user data' }, { status: 400 });
    }

    // Verify the Yandex token by calling Yandex API
    const verifyRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${access_token}` },
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Invalid Yandex token' }, { status: 401 });
    }

    const verifiedUser = await verifyRes.json();
    const email = verifiedUser.default_email;

    if (!email) {
      return NextResponse.json({ error: 'No email from Yandex' }, { status: 400 });
    }

    // Check if user exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let authUser;

    if (existingUser) {
      // User exists — generate a new session
      // Update metadata
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          full_name: verifiedUser.real_name || verifiedUser.display_name || email.split('@')[0],
          avatar_url: verifiedUser.default_avatar_id
            ? `https://avatars.yandex.net/get-yapic/${verifiedUser.default_avatar_id}/islands-200`
            : undefined,
          provider: 'yandex',
        },
      });
      authUser = existingUser;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: verifiedUser.real_name || verifiedUser.display_name || email.split('@')[0],
          avatar_url: verifiedUser.default_avatar_id
            ? `https://avatars.yandex.net/get-yapic/${verifiedUser.default_avatar_id}/islands-200`
            : undefined,
          provider: 'yandex',
        },
      });

      if (createError) {
        console.error('Failed to create auth user:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      authUser = newUser.user;
    }

    // Generate a magic link / session for the user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError) {
      console.error('Failed to generate link:', linkError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Extract token from the link and verify it to get a session
    const token_hash = linkData?.properties?.hashed_token;

    if (!token_hash) {
      return NextResponse.json({ error: 'No token generated' }, { status: 500 });
    }

    // Verify OTP to get access + refresh tokens
    const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`;
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type: 'magiclink',
        token_hash,
      }),
    });

    if (!verifyResponse.ok) {
      const err = await verifyResponse.text();
      console.error('Verify failed:', err);
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
    }

    const session = await verifyResponse.json();

    return NextResponse.json({
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: authUser.id,
        email,
        display_name: verifiedUser.real_name || verifiedUser.display_name || email.split('@')[0],
        avatar_url: verifiedUser.default_avatar_id
          ? `https://avatars.yandex.net/get-yapic/${verifiedUser.default_avatar_id}/islands-200`
          : undefined,
      },
    });

  } catch (error) {
    console.error('Yandex mobile auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
