import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { userId, ...updateData } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Allowed fields to update (map camelCase to snake_case)
    const fieldMapping = {
      displayName: 'display_name',
      role: 'role',
      emailVerified: 'email_verified',
      isActive: 'is_active',
      phone: 'phone'
    };
    
    // Build update object
    const update = {};
    Object.keys(fieldMapping).forEach(camelKey => {
      const snakeKey = fieldMapping[camelKey];
      if (updateData[camelKey] !== undefined) {
        // Normalize UTF-8 encoding for displayName (especially important for Cyrillic characters)
        if (camelKey === 'displayName' && typeof updateData[camelKey] === 'string') {
          update[snakeKey] = String(updateData[camelKey]).normalize('NFC').trim();
        } else {
          update[snakeKey] = updateData[camelKey];
        }
      }
    });
    
    update.updated_at = new Date().toISOString();
    
    // Update user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(update)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating user in Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}
