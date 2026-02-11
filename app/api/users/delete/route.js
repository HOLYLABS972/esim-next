import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Delete related orders (CASCADE should handle this automatically, but we can do it explicitly)
    await supabaseAdmin
      .from('esim_orders')
      .delete()
      .eq('user_id', userId);
    
    // Delete related eSIMs (CASCADE should handle this automatically, but we can do it explicitly)
    await supabaseAdmin
      .from('esims')
      .delete()
      .eq('user_id', userId);
    
    // Delete the user
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({
      success: true,
      message: 'User and all related data deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting user from Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
}
