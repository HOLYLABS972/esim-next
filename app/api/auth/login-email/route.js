import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

// Direct email login - no password, no magic link
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔐 Direct email login for:', normalizedEmail);

    if (!supabase || !supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Check if user exists in Supabase Auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    let user = null;
    if (!listError && existingUsers?.users) {
      user = existingUsers.users.find(u => u.email === normalizedEmail);
    }

    // Create or get user, then generate magic link and extract session
    let targetUser = user;

    if (!targetUser) {
      // User doesn't exist - create them
      console.log('📝 Creating new user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          display_name: normalizedEmail.split('@')[0],
        }
      });

      if (createError || !newUser.user) {
        console.error('❌ Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      targetUser = newUser.user;
    }

    // Direct login - no tokens, just return user info (like Yandex auth)
    // Client will store in localStorage and dispatch event
    
    const userData = {
      id: targetUser.id,
      email: targetUser.email,
      displayName: targetUser.user_metadata?.display_name || normalizedEmail.split('@')[0],
      emailVerified: !!targetUser.email_confirmed_at,
      role: 'customer',
      provider: 'email'
    };

    return NextResponse.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('❌ Email login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
