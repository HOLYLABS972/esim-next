import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }
    
    // Find all notifications for the user, sorted by newest first
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to 100 most recent
    
    if (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      notifications: notifications || []
    });
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(request) {
  try {
    const { notificationId, read } = await request.json();
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      );
    }
    
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: read !== undefined ? read : true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating notification:', error);
      throw error;
    }
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      notification
    });
    
  } catch (error) {
    console.error('❌ Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', details: error.message },
      { status: 500 }
    );
  }
}

// POST method to mark as read (for compatibility)
export async function POST(request) {
  try {
    const { notificationId, read } = await request.json();
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      );
    }
    
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: read !== undefined ? read : true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating notification:', error);
      throw error;
    }
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      notification
    });
    
  } catch (error) {
    console.error('❌ Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', details: error.message },
      { status: 500 }
    );
  }
}

