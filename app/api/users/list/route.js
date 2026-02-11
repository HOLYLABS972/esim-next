import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    
    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });
    
    // Priority: userId or email filter (exact match)
    if (userId) {
      query = query.eq('id', userId);
    } else if (email) {
      query = query.ilike('email', email.trim());
    } else if (search) {
      // General search (regex match)
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    
    if (role) {
      query = query.eq('role', role);
    }
    
    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    const { data: users, error, count } = await query;
    
    if (error) throw error;
    
    // Transform snake_case to camelCase for frontend compatibility
    const transformedUsers = (users || []).map(user => ({
      _id: user.id,
      id: user.id,
      email: user.email,
      displayName: user.display_name || user.full_name,
      role: user.role || 'customer',
      emailVerified: user.email_verified || false,
      isActive: user.is_active !== false,
      phone: user.phone,
      provider: user.provider || 'local',
      avatar: user.avatar,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login
    }));
    
    return NextResponse.json({
      success: true,
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching users from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}
