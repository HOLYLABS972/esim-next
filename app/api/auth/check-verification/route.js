import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();

    console.log('🔍 Check verification request for:', email);

    if (!email) {
      return NextResponse.json(
        { verified: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in Supabase Auth
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw new Error('Failed to check user status');
    }

    const user = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (!user) {
      console.log('❌ User not found, checking for pending signup...');
      
      // Check for pending signup in Supabase
      const { data: pendingSignups, error: pendingError } = await supabaseAdmin
        .from('pending_signups')
        .select('*')
        .eq('email', normalizedEmail)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (pendingError) {
        console.error('❌ Error checking pending signups:', pendingError);
      }

      if (pendingSignups && pendingSignups.length > 0) {
        console.log('✅ Pending signup found but NOT creating user yet');
        console.log('ℹ️ User must click email verification link first');
        
        // Don't create user from polling - only from email link click
        return NextResponse.json({
          verified: false,
          pendingVerification: true,
          message: 'Email sent, waiting for link click'
        });
      }
      
      console.log('❌ No pending signup found');
      return NextResponse.json({
        verified: false,
        message: 'User not found and no pending signup'
      });
    }

    // User exists - check if email is verified
    const emailVerified = !!user.email_confirmed_at;

    if (!emailVerified) {
      console.log('⚠️ User exists but email not verified yet');
      return NextResponse.json({
        verified: false,
        pendingVerification: true,
        message: 'Email verification pending'
      });
    }

    console.log('✅ Email verification check: User is verified:', normalizedEmail);

    return NextResponse.json({
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name || user.email.split('@')[0],
        role: user.user_metadata?.role || 'customer',
        emailVerified: true
      }
    });
  } catch (error) {
    console.error('❌ Check verification API error:', error);
    return NextResponse.json(
      { verified: false, error: error.message || 'Check failed' },
      { status: 500 }
    );
  }
}

