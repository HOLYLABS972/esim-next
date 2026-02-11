import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { token, email, password, displayName, expiresAt } = await request.json();

    console.log('📝 Store pending signup request:', { token: token ? 'provided' : 'missing', email });

    if (!token || !email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Token, email, password, and displayName are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in Supabase Auth
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (existingUser) {
      console.log('⚠️ User already exists, not storing pending signup');
      return NextResponse.json({
        success: true,
        message: 'User already exists'
      });
    }

    // Remove any existing pending signup for this email
    await supabaseAdmin
      .from('pending_signups')
      .delete()
      .eq('email', normalizedEmail);

    // Store new pending signup (NOT creating user yet)
    const { error: insertError } = await supabaseAdmin
      .from('pending_signups')
      .insert({
        token,
        email: normalizedEmail,
        password, // Note: In production, password should be hashed
        display_name: displayName,
        expires_at: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default 24h expiry
      });

    if (insertError) {
      console.error('❌ Error storing pending signup:', insertError);
      throw insertError;
    }

    console.log('✅ Pending signup stored (user NOT created yet):', email);

    return NextResponse.json({
      success: true,
      message: 'Pending signup stored successfully'
    });
  } catch (error) {
    console.error('❌ Store pending signup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store pending signup' },
      { status: 500 }
    );
  }
}

