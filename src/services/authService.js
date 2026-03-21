import { supabase, supabaseAdmin } from '../lib/supabase';
import crypto from 'crypto';
import { sendPasswordResetEmail } from './emailService';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
  }

  // Generate verification token
  _generateVerificationToken() {
    return crypto.randomBytes(32).toString('base64url').replace(/=/g, '');
  }

  // Generate verification URL
  _generateVerificationUrl(email, isMobile = false) {
    const encodedEmail = encodeURIComponent(email);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://esim.globalbankaccounts.ru';

    if (isMobile) {
      return `${baseUrl}/verify-email-mobile?email=${encodedEmail}`;
    } else {
      return `${baseUrl}/verify-email?email=${encodedEmail}`;
    }
  }

  // Sign up with email and password using Supabase Auth
  // Uses client-side signUp() which automatically sends verification emails when Supabase SMTP is configured
  async signup(email, password, displayName, referralCode) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://esim.globalbankaccounts.ru';

      // Use client-side signUp() - this automatically sends verification emails if Supabase SMTP is configured
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
      );

      let signUpData = null;
      let userId = null;
      let emailSent = false;

      // Try client-side signUp() first - this automatically sends emails if SMTP is configured
      try {
        const { data: clientSignUpData, error: signUpError } = await supabaseClient.auth.signUp({
          email: normalizedEmail,
          password: password,
          options: {
            emailRedirectTo: `${baseUrl}/auth/callback?type=signup`,
            data: {
              display_name: displayName,
              referral_code: referralCode || null
            }
          }
        });

        if (!signUpError && clientSignUpData?.user) {
          // Success - email should be sent automatically
          signUpData = clientSignUpData;
          userId = clientSignUpData.user.id;
          emailSent = true;
          console.log(`✅ User created via client.signUp(): ${userId}`);
          console.log(`📧 Verification email sent automatically via Supabase SMTP`);
        } else if (signUpError) {
          // Check if it's an email sending error - if so, fall back to admin.createUser()
          if (signUpError.message?.includes('Error sending confirmation email') || 
              signUpError.message?.includes('confirmation email')) {
            console.warn('⚠️ Email sending failed via client.signUp(), using admin.createUser() fallback...');
            throw signUpError; // Throw to trigger fallback
          } 
          // Check if user already exists
          else if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
            console.log(`⚠️ User already exists, fetching user data...`);
            const { data: users } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = users?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
            
            if (existingUser) {
              signUpData = { user: existingUser };
              userId = existingUser.id;
              console.log(`✅ User already exists: ${userId}`);
            } else {
              throw new Error('User already exists but could not be found');
            }
          } else {
            // Other error - throw it
            throw signUpError;
          }
        }
      } catch (emailError) {
        // Email sending failed - use admin.createUser() as fallback
        // This creates the user but doesn't automatically send emails
        console.log('📝 Creating user via admin.createUser() (email sending disabled)...');
        
        try {
          const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password: password,
            email_confirm: false, // User will need to verify manually or via resend
            user_metadata: {
              display_name: displayName,
              referral_code: referralCode || null
            }
          });

          if (adminError) {
            // Check if user already exists from the failed signUp() attempt
            if (adminError.message?.includes('already registered') || adminError.message?.includes('already exists')) {
              const { data: users } = await supabaseAdmin.auth.admin.listUsers();
              const existingUser = users?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
              
              if (existingUser) {
                signUpData = { user: existingUser };
                userId = existingUser.id;
                console.log(`✅ User already exists from previous attempt: ${userId}`);
              } else {
                throw adminError;
              }
            } else {
              throw adminError;
            }
          } else {
            signUpData = adminData;
            userId = adminData.user.id;
            emailSent = false;
            console.log(`✅ User created via admin.createUser(): ${userId}`);
            console.warn('⚠️ User created but email not sent. Please configure SMTP in Supabase Dashboard → Authentication → Settings');
          }
        } catch (adminError) {
          console.error('❌ Failed to create user via admin.createUser():', adminError);
          throw new Error(adminError.message || 'Failed to create user account');
        }
      }

      if (!signUpData?.user || !userId) {
        throw new Error('Failed to create user account');
      }

      // Check if user profile already exists
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        // Create user profile in users table
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email: normalizedEmail,
            display_name: displayName,
            full_name: displayName,
            role: 'customer',
            email_verified: false,
            is_active: true,
            provider: 'local',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('❌ Error creating user profile:', profileError);
          // Rollback: delete auth user
          try {
            await supabaseAdmin.auth.admin.deleteUser(userId);
          } catch (deleteError) {
            console.error('❌ Error deleting auth user during rollback:', deleteError);
          }
          throw new Error('Failed to create user profile');
        }
      } else {
        // Profile already exists, update it
        console.log(`⚠️ User profile already exists for ${userId}, updating...`);
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            email: normalizedEmail,
            display_name: displayName,
            full_name: displayName,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error updating existing user profile:', updateError);
          throw new Error('Failed to update user profile');
        }
      }

      return {
        success: true,
        message: 'Account created! Please check your email to verify your account.',
        requiresVerification: true,
        email: normalizedEmail
      };

    } catch (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }
  }

  // Login with email and password using Supabase Auth
  async login(email, password) {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (error) {
        console.error('❌ Supabase Auth login error:', error);
        throw new Error(error.message || 'Invalid email or password');
      }

      if (!data.user) {
        throw new Error('Login failed - no user returned');
      }

      // Get user profile from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
      }

      // Check if email is verified
      if (!data.user.email_confirmed_at) {
        return {
          success: false,
          error: 'Please verify your email before logging in',
          requiresVerification: true,
          email: normalizedEmail
        };
      }

      console.log(`✅ User logged in: ${data.user.id}`);

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          displayName: userProfile?.display_name || data.user.user_metadata?.display_name,
          emailVerified: !!data.user.email_confirmed_at,
          role: userProfile?.role || 'customer',
          provider: userProfile?.provider || 'local'
        },
        session: data.session
      };

    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  // Logout using Supabase Auth
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      this.userProfile = null;

      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  // Get current user from Supabase Auth session
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        id: user.id,
        email: user.email,
        displayName: userProfile?.display_name || user.user_metadata?.display_name,
        emailVerified: !!user.email_confirmed_at,
        role: userProfile?.role || 'customer',
        provider: userProfile?.provider || 'local',
        ...userProfile
      };

    } catch (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
  }

  // Verify email using Supabase Auth
  async verifyEmail(email, token) {
    try {
      // Supabase handles email verification via magic links
      // This method is for compatibility - actual verification happens via Supabase's built-in flow
      
      const { error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: token,
        type: 'email'
      });

      if (error) {
        console.error('❌ Email verification error:', error);
        throw new Error('Invalid or expired verification code');
      }

      // Update user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabaseAdmin
          .from('users')
          .update({ email_verified: true, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      return {
        success: true,
        message: 'Email verified successfully! You can now log in.'
      };

    } catch (error) {
      console.error('❌ Email verification error:', error);
      throw error;
    }
  }

  // Request password reset using Supabase Auth
  async requestPasswordReset(email, baseUrl) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const origin = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${origin.replace(/\/$/, '')}/reset-password`
      });

      if (error) {
        console.error('❌ Password reset request error:', error);
        throw new Error(error.message);
      }

      console.log(`✅ Password reset email sent to ${normalizedEmail}`);

      return {
        success: true,
        message: 'Password reset instructions sent to your email'
      };

    } catch (error) {
      console.error('❌ Password reset request error:', error);
      throw error;
    }
  }

  // Reset password using Supabase Auth
  async resetPassword(token, newPassword) {
    try {
      // Update password with the token from email
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        throw new Error(error.message || 'Failed to reset password');
      }

      console.log('✅ Password reset successfully');

      return {
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.'
      };

    } catch (error) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  }

  // Update user profile (create if doesn't exist)
  async updateProfile(userId, updates) {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email: updates.email || '',
            display_name: updates.display_name || updates.email?.split('@')[0] || '',
            full_name: updates.full_name || updates.display_name || '',
            role: 'customer',
            email_verified: updates.email_verified || false,
            is_active: true,
            provider: 'local',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...updates
          });

        if (insertError) {
          console.error('❌ Profile creation error:', insertError);
          throw new Error(insertError.message);
        }

        console.log(`✅ Profile created for user ${userId}`);
      } else {
        // Update existing profile
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Profile update error:', updateError);
          throw new Error(updateError.message);
        }

        console.log(`✅ Profile updated for user ${userId}`);
      }

      // If updating display_name, also update in auth metadata
      if (updates.display_name) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { display_name: updates.display_name }
        }).catch(err => {
          console.warn('⚠️ Failed to update auth metadata:', err);
          // Don't fail the whole operation if metadata update fails
        });
      }

      return {
        success: true,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
  }

  // OAuth login with Google using Supabase Auth
  async loginWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/google`
        }
      });

      if (error) {
        console.error('❌ Google OAuth error:', error);
        throw error;
      }

      return data;

    } catch (error) {
      console.error('❌ Google login error:', error);
      throw error;
    }
  }

  // OAuth login with Yandex - would need Supabase configuration
  async loginWithYandex() {
    try {
      // Note: Yandex is not a built-in Supabase provider
      // You would need to use a custom OAuth flow or add it as a custom provider
      throw new Error('Yandex OAuth not yet configured in Supabase');
    } catch (error) {
      console.error('❌ Yandex login error:', error);
      throw error;
    }
  }

  // Handle Google OAuth sign-in (creates user in Supabase if doesn't exist)
  async signInWithGoogle(googleUser) {
    try {
      const normalizedEmail = googleUser.email?.toLowerCase().trim();
      if (!normalizedEmail) {
        throw new Error('Email is required for Google sign-in');
      }

      // Check if user already exists in Supabase Auth
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing users:', listError);
        throw new Error('Failed to check user existence');
      }

      let authUser = users?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
      let userId = null;

      if (!authUser) {
        // Create new user in Supabase Auth using admin API
        // Generate a random password since OAuth users don't need one
        const randomPassword = crypto.randomBytes(32).toString('base64url');
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: randomPassword, // Random password, user will use OAuth
          email_confirm: true, // OAuth emails are pre-verified
          user_metadata: {
            full_name: googleUser.name,
            name: googleUser.name,
            avatar_url: googleUser.picture,
            provider: 'google'
          }
        });

        if (createError) {
          console.error('❌ Error creating Google user in Supabase Auth:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }

        authUser = newUser.user;
        userId = newUser.user.id;
        console.log(`✅ Google user created in Supabase Auth: ${userId}`);
      } else {
        userId = authUser.id;
        console.log(`✅ Google user already exists in Supabase Auth: ${userId}`);
      }

      // Check if user profile exists in users table
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        // Create user profile in users table
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email: normalizedEmail,
            display_name: googleUser.name || normalizedEmail.split('@')[0],
            full_name: googleUser.name,
            role: 'customer',
            email_verified: true,
            is_active: true,
            provider: 'google',
            avatar: googleUser.picture,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('❌ Error creating Google user profile:', profileError);
          throw new Error('Failed to create user profile');
        }
        console.log(`✅ Google user profile created: ${userId}`);
      } else {
        // Update existing profile
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            display_name: googleUser.name || existingProfile.display_name,
            full_name: googleUser.name || existingProfile.full_name,
            avatar: googleUser.picture || existingProfile.avatar,
            email_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error updating Google user profile:', updateError);
        } else {
          console.log(`✅ Google user profile updated: ${userId}`);
        }
      }

      // Get session for the user (since we can't generate a JWT directly, return user data)
      return {
        success: true,
        user: {
          id: userId,
          email: normalizedEmail,
          displayName: googleUser.name || normalizedEmail.split('@')[0],
          name: googleUser.name,
          emailVerified: true,
          provider: 'google',
          avatar: googleUser.picture,
          role: 'customer'
        },
        // Note: Client-side will need to handle session management via Supabase client
        message: 'Google sign-in successful. Please log in using email/password or continue with OAuth flow.'
      };

    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      throw error;
    }
  }

  // Handle Yandex OAuth sign-in (creates user in Supabase if doesn't exist)
  async signInWithYandex(yandexUser) {
    try {
      const normalizedEmail = yandexUser.email?.toLowerCase().trim();
      if (!normalizedEmail) {
        throw new Error('Email is required for Yandex sign-in');
      }

      // Normalize display name (important for Cyrillic characters)
      const displayName = yandexUser.name
        ? String(yandexUser.name).normalize('NFC').trim()
        : normalizedEmail.split('@')[0] || 'User';

      // Check if user already exists in Supabase Auth
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing users:', listError);
        throw new Error('Failed to check user existence');
      }

      let authUser = users?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
      let userId = null;

      if (!authUser) {
        // Create new user in Supabase Auth using admin API
        // Generate a random password since OAuth users don't need one
        const randomPassword = crypto.randomBytes(32).toString('base64url');
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: randomPassword, // Random password, user will use OAuth
          email_confirm: true, // OAuth emails are pre-verified
          user_metadata: {
            full_name: displayName,
            name: displayName,
            avatar_url: yandexUser.picture,
            provider: 'yandex'
          }
        });

        if (createError) {
          console.error('❌ Error creating Yandex user in Supabase Auth:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }

        authUser = newUser.user;
        userId = newUser.user.id;
        console.log(`✅ Yandex user created in Supabase Auth: ${userId}`);
      } else {
        userId = authUser.id;
        console.log(`✅ Yandex user already exists in Supabase Auth: ${userId}`);
      }

      // Check if user profile exists in users table
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        // Create user profile in users table
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email: normalizedEmail,
            display_name: displayName,
            full_name: displayName,
            role: 'customer',
            email_verified: true,
            is_active: true,
            provider: 'yandex',
            avatar: yandexUser.picture,
            phone: yandexUser.phone || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('❌ Error creating Yandex user profile:', profileError);
          throw new Error('Failed to create user profile');
        }
        console.log(`✅ Yandex user profile created: ${userId}`);
      } else {
        // Update existing profile
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            display_name: displayName,
            full_name: displayName,
            avatar: yandexUser.picture || existingProfile.avatar,
            phone: yandexUser.phone || existingProfile.phone,
            email_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error updating Yandex user profile:', updateError);
        } else {
          console.log(`✅ Yandex user profile updated: ${userId}`);
        }
      }

      // Generate a simple token for compatibility with existing frontend code
      // Note: This is a temporary token format. For production, use Supabase sessions
      const token = `yandex_${userId}_${Date.now()}`;

      return {
        success: true,
        user: {
          id: userId,
          email: normalizedEmail,
          displayName: displayName,
          name: displayName,
          emailVerified: true,
          provider: 'yandex',
          avatar: yandexUser.picture,
          phone: yandexUser.phone,
          role: 'customer'
        },
        token: token,
        // Note: Client-side will need to handle session management via Supabase client
        message: 'Yandex sign-in successful.'
      };

    } catch (error) {
      console.error('❌ Yandex sign-in error:', error);
      throw error;
    }
  }

  // Handle OAuth callback
  async handleOAuthCallback(provider, code) {
    try {
      // Supabase handles OAuth callbacks automatically
      // This method is for compatibility with existing code
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        throw new Error('OAuth callback failed');
      }

      // Check if user profile exists, create if not
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Create user profile
        await supabaseAdmin
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            full_name: user.user_metadata?.full_name || user.user_metadata?.name,
            role: 'customer',
            email_verified: !!user.email_confirmed_at,
            is_active: true,
            provider: provider,
            avatar: user.user_metadata?.avatar_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.user_metadata?.full_name || user.user_metadata?.name,
          emailVerified: !!user.email_confirmed_at,
          provider: provider
        }
      };

    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;
