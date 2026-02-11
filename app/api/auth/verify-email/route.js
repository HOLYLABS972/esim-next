import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import authService from '../../../../src/services/authService';

export const dynamic = 'force-dynamic';

// Handle GET requests (when user clicks the link in browser)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    console.log('🔍 GET Verify email request:', { email });

    if (!email) {
      console.log('❌ No email provided in GET request');
      return new Response('Email parameter is required', { status: 400 });
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();
    console.log('🔍 Looking for user:', normalizedEmail);

    // Check if user already exists in Supabase Auth
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw new Error('Failed to check user status');
    }

    let user = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (user) {
      console.log('👤 User found:', { id: user.id, email: user.email, verified: !!user.email_confirmed_at });
      
      // User exists, confirm email if not already confirmed
      if (!user.email_confirmed_at) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        
        if (updateError) {
          console.error('❌ Error updating user:', updateError);
        } else {
          console.log('✅ User email verified status updated');
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.user_metadata?.display_name || user.email.split('@')[0],
          emailVerified: true
        }
      });
    }

    console.log('❌ User not found, checking for pending signup...');

    // User doesn't exist, check for pending signup
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
      console.log('❌ No pending signup found for:', normalizedEmail);
      return NextResponse.json(
        { error: 'No pending registration found for this email. Please register again.' },
        { status: 404 }
      );
    }

    console.log('✅ Pending signup found:', { email: pendingSignup.email, displayName: pendingSignup.display_name });

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
      console.log('✅ User automatically added to newsletter');
    } catch (newsletterError) {
      console.error('❌ Error adding user to newsletter:', newsletterError);
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

    console.log('✅ Email verified and account created for:', normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Email verified and account created successfully',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name || user.email.split('@')[0],
        emailVerified: true
      }
    });
  } catch (error) {
    console.error('❌ GET Verify email API error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Email verification failed' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { email } = await request.json();

    console.log('🔍 Verify email request:', { email });

    if (!email) {
      console.log('❌ No email provided');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 Looking for user:', normalizedEmail);

    // Check if user already exists in Supabase Auth
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw new Error('Failed to check user status');
    }

    let user = usersData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (user) {
      console.log('👤 User found:', { id: user.id, email: user.email, verified: !!user.email_confirmed_at });
      
      // User exists, confirm email if not already confirmed
      if (!user.email_confirmed_at) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        
        if (updateError) {
          console.error('❌ Error updating user:', updateError);
        } else {
          console.log('✅ User email verified status updated');
        }
      }

      console.log('✅ Email verified successfully for existing user:', normalizedEmail);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.user_metadata?.display_name || user.email.split('@')[0],
          role: user.user_metadata?.role || 'customer',
          emailVerified: true
        }
      });
    }

    console.log('❌ User not found, checking for pending signup...');

    // User doesn't exist, check for pending signup
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
      console.log('❌ No pending signup found for:', normalizedEmail);
      return NextResponse.json(
        { error: 'No pending registration found for this email. Please register again.' },
        { status: 404 }
      );
    }

    console.log('✅ Pending signup found:', { email: pendingSignup.email, displayName: pendingSignup.display_name });

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
      console.log('✅ User automatically added to newsletter');
    } catch (newsletterError) {
      console.error('❌ Error adding user to newsletter:', newsletterError);
      // Don't fail the signup if newsletter addition fails
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

    console.log('✅ Email verified and account created for:', normalizedEmail);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name || user.email.split('@')[0],
        role: user.user_metadata?.role || 'customer',
        emailVerified: true
      }
    });
  } catch (error) {
    console.error('❌ Verify email API error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Email verification failed' },
      { status: 500 }
    );
  }
}
