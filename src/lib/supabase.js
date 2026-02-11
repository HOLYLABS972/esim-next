import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Single client instance for client-side operations
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth',
        autoRefreshToken: true,
        detectSessionInUrl: false // Disabled: /auth/google and /auth/callback handle tokens manually
      }
    })
  : null;

// Client for server-side operations (uses service role key for admin operations)
export const supabaseAdmin = supabaseServiceKey && supabaseUrl
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Edge Function base URL
export const SUPABASE_EDGE_FUNCTION_URL = supabaseUrl
  ? `${supabaseUrl}/functions/v1`
  : '';

// Helper function to check if Supabase is configured
export function isSupabaseConfigured() {
  return !!(supabaseUrl && (supabaseAnonKey || supabaseServiceKey));
}
