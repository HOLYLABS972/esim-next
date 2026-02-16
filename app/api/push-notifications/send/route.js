import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import {
  sendPushNotification,
  sendBulkPushNotifications
} from '../../../../src/services/pushNotificationService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push-notifications/send
 * Send push notification to user(s)
 *
 * Request Body:
 * @param {string} [userId] - Send to specific user by ID
 * @param {string[]} [userIds] - Send to multiple users by IDs
 * @param {boolean} [all] - Send to all users with push tokens enabled
 * @param {string} title - Notification title (required)
 * @param {string} body - Notification message (required)
 * @param {Object} [data] - Additional data payload for deep linking
 * @param {string} [channelId] - Android notification channel (default: 'default')
 *
 * Response:
 * @returns {Object} { success, sent, failed, userCount, tickets, errors }
 *
 * Examples:
 * // Send to single user
 * POST { userId: "123", title: "Hello", body: "Welcome!" }
 *
 * // Send to all users
 * POST { all: true, title: "Announcement", body: "Check out our new plans!" }
 *
 * // Send with deep link data
 * POST { userId: "123", title: "Order Ready", body: "Your eSIM is ready", data: { orderId: "456" } }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, userIds, all, title, body: messageBody, data, channelId } = body;

    // Validation
    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      );
    }

    if (title.length > 65) {
      return NextResponse.json(
        { success: false, error: 'Title must be 65 characters or less' },
        { status: 400 }
      );
    }

    if (messageBody.length > 240) {
      return NextResponse.json(
        { success: false, error: 'Body must be 240 characters or less' },
        { status: 400 }
      );
    }

    let targetUsers = [];

    // Fetch target users based on parameters
    if (userId) {
      // Single user by ID
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, email, expo_push_token, push_notifications_enabled')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      targetUsers = [user];
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Multiple users by IDs
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, expo_push_token, push_notifications_enabled')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      targetUsers = users || [];
    } else if (all === true) {
      // All users with push tokens enabled
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, expo_push_token, push_notifications_enabled')
        .not('expo_push_token', 'is', null)
        .eq('push_notifications_enabled', true);

      if (error) {
        console.error('Error fetching all users:', error);
        throw error;
      }

      targetUsers = users || [];
    } else {
      return NextResponse.json(
        { success: false, error: 'Must specify userId, userIds, or all=true' },
        { status: 400 }
      );
    }

    // Filter users with valid push tokens and notifications enabled
    const usersWithTokens = targetUsers.filter(
      (u) => u.expo_push_token && u.push_notifications_enabled
    );

    if (usersWithTokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No users with valid push tokens found',
          details: targetUsers.length > 0
            ? 'Users found but no push tokens or notifications disabled'
            : 'No users found matching criteria'
        },
        { status: 404 }
      );
    }

    console.log(`📤 Sending push notification to ${usersWithTokens.length} user(s)`);

    // Send notifications
    let result;
    if (usersWithTokens.length === 1) {
      // Single notification
      result = await sendPushNotification(usersWithTokens[0].expo_push_token, {
        title,
        body: messageBody,
        data: data || {},
        channelId: channelId || 'default',
      });

      // If device not registered, clear the token
      if (result.shouldRemoveToken) {
        await supabaseAdmin
          .from('users')
          .update({
            expo_push_token: null,
            push_notifications_enabled: false
          })
          .eq('id', usersWithTokens[0].id);
      }
    } else {
      // Bulk notifications
      const notifications = usersWithTokens.map((u) => ({
        expoPushToken: u.expo_push_token,
        title,
        body: messageBody,
        data: data || {},
        channelId: channelId || 'default',
      }));

      result = await sendBulkPushNotifications(notifications);
    }

    // Log notifications to database
    const pushNotifications = usersWithTokens.map((u) => ({
      user_id: u.id,
      title,
      body: messageBody,
      data: data || {},
      channel_id: channelId || 'default',
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('push_notifications')
      .insert(pushNotifications);

    if (insertError) {
      console.error('Error logging push notifications:', insertError);
      // Don't fail the request if logging fails
    }

    // Return response
    return NextResponse.json({
      success: result.success,
      sent: result.sent || (result.success ? 1 : 0),
      failed: result.failed || (result.success ? 0 : 1),
      userCount: usersWithTokens.length,
      ticketId: result.ticketId,
      tickets: result.tickets,
      errors: result.errors,
      message: result.success
        ? `Sent to ${usersWithTokens.length} user(s)`
        : result.error
    });
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send push notification',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/push-notifications/send
 * Get statistics about push notifications
 *
 * Query Parameters:
 * @param {string} [userId] - Filter by user ID
 *
 * Response:
 * @returns {Object} Statistics about sent notifications
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = supabaseAdmin
      .from('push_notifications')
      .select('id, user_id, title, body, status, sent_at, error_message', { count: 'exact' });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: notifications, error, count } = await query
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Count by status
    const stats = {
      total: count || 0,
      sent: notifications?.filter(n => n.status === 'sent').length || 0,
      failed: notifications?.filter(n => n.status === 'failed').length || 0,
      pending: notifications?.filter(n => n.status === 'pending').length || 0,
    };

    // Get user count with push tokens
    const { count: userCount } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .not('expo_push_token', 'is', null)
      .eq('push_notifications_enabled', true);

    return NextResponse.json({
      success: true,
      stats,
      usersWithPushTokens: userCount || 0,
      recentNotifications: notifications || []
    });
  } catch (error) {
    console.error('❌ Error fetching push notification stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}
