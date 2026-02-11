import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    // Get stats using Promise.all for parallel queries
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: customers },
      { count: admins },
      { count: businesses }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business')
    ]);
    
    return NextResponse.json({
      success: true,
      stats: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        inactive: (totalUsers || 0) - (activeUsers || 0),
        customers: customers || 0,
        admins: admins || 0,
        businesses: businesses || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching user stats from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}
