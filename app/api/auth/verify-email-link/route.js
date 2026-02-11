import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

// This endpoint is ONLY called when user clicks the email verification link
export async function POST(request) {
  try {
    const { email } = await request.json();

    console.log('🔗 Email link clicked for:', email);

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

    // Check if user already exists in Supabase Auth
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw new Error('Failed to check user status');
    }

    let user = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (user) {
      console.log('👤 User already exists, confirming email');
      
      // Update user to confirm email if not already confirmed
      if (!user.email_confirmed_at) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        
        if (updateError) {
          console.error('❌ Error updating user:', updateError);
        } else {
          console.log('✅ User email confirmed');
        }
      }

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
    }

    // User doesn't exist - create from pending signup
    console.log('📝 Looking for pending signup...');
    
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

    const pendingSignup = pendingSignups?.[0];

    if (!pendingSignup) {
      console.log('❌ No pending signup found');
      return NextResponse.json(
        { verified: false, error: 'No pending registration found. Please register again.' },
        { status: 404 }
      );
    }

    console.log('✅ Pending signup found, creating user account...');

    // Create user account with verified email using Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: pendingSignup.email,
      password: pendingSignup.password,
      email_confirm: true,
      user_metadata: {
        display_name: pendingSignup.display_name || pendingSignup.email.split('@')[0],
        role: 'customer',
        provider: 'local'
      }
    });

    if (createError || !newUser.user) {
      console.error('❌ Error creating user:', createError);
      throw new Error('Failed to create user account');
    }

    user = newUser.user;
    console.log('✅ User account created:', user.id);

    // Add user to newsletter
    try {
      await authService.addToNewsletter(user.email, user.user_metadata?.display_name || user.email.split('@')[0], 'mobile_app');
      console.log('✅ User added to newsletter');
    } catch (newsletterError) {
      console.error('❌ Newsletter error:', newsletterError);
    }

    // Delete pending signup
    const { error: deleteError } = await supabaseAdmin
      .from('pending_signups')
      .delete()
      .eq('id', pendingSignup.id);

    if (deleteError) {
      console.error('❌ Error deleting pending signup:', deleteError);
    } else {
      console.log('✅ Pending signup deleted');
    }

    console.log('✅ Email verified and account created!');

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
    console.error('❌ Verify email link API error:', error);
    return NextResponse.json(
      { verified: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

