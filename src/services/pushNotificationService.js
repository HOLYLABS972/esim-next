/**
 * Push Notification Service
 * Handles sending push notifications via Expo Push Notification Service
 */

import { Expo } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a single user
 * @param {string} expoPushToken - Expo push token (e.g., "ExponentPushToken[xxx]")
 * @param {Object} notification - Notification details
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {string} [notification.subtitle] - Subtitle (iOS only)
 * @param {string} [notification.image] - Image URL (must be HTTPS)
 * @param {Object} [notification.data] - Additional data payload
 * @param {string} [notification.channelId] - Android notification channel
 * @param {string} [notification.sound] - Notification sound (default: 'default')
 * @param {string} [notification.priority] - Notification priority (default: 'high')
 * @param {number} [notification.badge] - Badge count (iOS only)
 * @param {string} [notification.categoryId] - Category ID for action buttons
 * @param {boolean} [notification.mutableContent] - Enable notification service extension (iOS)
 * @returns {Promise<Object>} Send result with success status and ticket ID
 */
export async function sendPushNotification(expoPushToken, notification) {
  // Validate token format
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.error(`❌ Invalid Expo push token: ${expoPushToken}`);
    return {
      success: false,
      error: 'Invalid push token format',
      details: 'Token must be in format: ExponentPushToken[xxxxxx]'
    };
  }

  // Validate image URL if provided
  if (notification.image && !notification.image.startsWith('https://')) {
    console.warn('⚠️ Image URL must use HTTPS:', notification.image);
    return {
      success: false,
      error: 'Image URL must use HTTPS protocol',
      details: 'Only HTTPS URLs are supported for notification images'
    };
  }

  const message = {
    to: expoPushToken,
    sound: notification.sound || 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    priority: notification.priority || 'high',
    channelId: notification.channelId || 'default',
  };

  // Add optional fields if provided
  if (notification.subtitle) {
    message.subtitle = notification.subtitle; // iOS only
  }

  if (notification.image) {
    // Image must be HTTPS URL
    message.image = notification.image;
  }

  if (notification.badge !== undefined) {
    message.badge = notification.badge; // iOS only
  }

  if (notification.categoryId) {
    message.categoryId = notification.categoryId; // For action buttons
  }

  if (notification.mutableContent) {
    message.mutableContent = true; // iOS notification service extension
  }

  try {
    console.log('📤 Sending push notification to:', expoPushToken.substring(0, 30) + '...');

    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    const ticket = ticketChunk[0];

    if (ticket.status === 'error') {
      console.error(`❌ Error sending push notification:`, ticket.message);
      if (ticket.details?.error === 'DeviceNotRegistered') {
        return {
          success: false,
          error: 'Device not registered',
          details: 'The push token is no longer valid. User may have uninstalled the app.',
          shouldRemoveToken: true
        };
      }
      return {
        success: false,
        error: ticket.message,
        details: ticket.details
      };
    }

    console.log('✅ Push notification sent successfully. Ticket ID:', ticket.id);
    return {
      success: true,
      ticketId: ticket.id
    };
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Send push notifications to multiple users (batch)
 * @param {Array<Object>} notifications - Array of notification objects
 * @param {string} notifications[].expoPushToken - Expo push token
 * @param {string} notifications[].title - Notification title
 * @param {string} notifications[].body - Notification body
 * @param {Object} [notifications[].data] - Additional data payload
 * @param {string} [notifications[].channelId] - Android notification channel
 * @returns {Promise<Object>} Send results with counts and details
 */
export async function sendBulkPushNotifications(notifications) {
  // Filter out invalid tokens
  const validNotifications = notifications.filter(n => {
    if (!Expo.isExpoPushToken(n.expoPushToken)) {
      console.warn(`⚠️ Skipping invalid token: ${n.expoPushToken}`);
      return false;
    }
    return true;
  });

  if (validNotifications.length === 0) {
    console.error('❌ No valid push tokens found');
    return {
      success: false,
      error: 'No valid push tokens provided',
      sent: 0,
      failed: notifications.length
    };
  }

  // Build messages
  const messages = validNotifications.map(n => ({
    to: n.expoPushToken,
    sound: n.sound || 'default',
    title: n.title,
    body: n.body,
    data: n.data || {},
    priority: n.priority || 'high',
    channelId: n.channelId || 'default',
  }));

  try {
    console.log(`📤 Sending ${messages.length} push notifications...`);

    // Chunk messages (Expo accepts max 100 at a time)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Error sending chunk:', error);
        // Continue with other chunks even if one fails
      }
    }

    // Count results
    const successCount = tickets.filter(t => t.status === 'ok').length;
    const errorCount = tickets.filter(t => t.status === 'error').length;
    const errorTickets = tickets.filter(t => t.status === 'error');

    console.log(`✅ Sent ${successCount} notifications, ${errorCount} failed`);

    // Log errors for debugging
    if (errorTickets.length > 0) {
      console.error('❌ Failed tickets:', errorTickets);
    }

    return {
      success: true,
      sent: successCount,
      failed: errorCount,
      total: tickets.length,
      tickets,
      errors: errorTickets.map(t => ({
        message: t.message,
        details: t.details
      }))
    };
  } catch (error) {
    console.error('❌ Error sending bulk push notifications:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: validNotifications.length
    };
  }
}

/**
 * Get push notification receipts (check delivery status)
 * @param {Array<string>} ticketIds - Array of ticket IDs from previous sends
 * @returns {Promise<Object>} Receipt results
 */
export async function getPushNotificationReceipts(ticketIds) {
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    return { success: false, error: 'No ticket IDs provided' };
  }

  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);
    const receipts = [];

    for (const chunk of receiptIdChunks) {
      const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
      receipts.push(receiptChunk);
    }

    console.log('📬 Retrieved receipts for', ticketIds.length, 'notifications');
    return {
      success: true,
      receipts
    };
  } catch (error) {
    console.error('❌ Error getting push notification receipts:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate if a token is a valid Expo push token
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid
 */
export function isValidExpoPushToken(token) {
  return Expo.isExpoPushToken(token);
}

/**
 * Send notification about new eSIM order
 * @param {string} expoPushToken - User's push token
 * @param {Object} orderData - Order information
 * @returns {Promise<Object>} Send result
 */
export async function sendOrderNotification(expoPushToken, orderData) {
  return sendPushNotification(expoPushToken, {
    title: '🎉 Order Confirmed!',
    body: `Your ${orderData.planName} eSIM is ready. Tap to view QR code.`,
    data: {
      type: 'order',
      orderId: orderData.orderId,
      screen: `/qr-code/${orderData.orderId}`
    },
    channelId: 'orders',
  });
}

/**
 * Send notification about low data usage
 * @param {string} expoPushToken - User's push token
 * @param {Object} usageData - Data usage information
 * @returns {Promise<Object>} Send result
 */
export async function sendLowDataNotification(expoPushToken, usageData) {
  return sendPushNotification(expoPushToken, {
    title: '⚠️ Low Data Warning',
    body: `Your ${usageData.planName} has only ${usageData.remainingMB}MB left.`,
    data: {
      type: 'usage',
      iccid: usageData.iccid,
      screen: `/usage/${usageData.iccid}`
    },
    channelId: 'default',
  });
}

/**
 * Send promotional notification
 * @param {string} expoPushToken - User's push token
 * @param {Object} promoData - Promotion information
 * @returns {Promise<Object>} Send result
 */
export async function sendPromotionNotification(expoPushToken, promoData) {
  return sendPushNotification(expoPushToken, {
    title: promoData.title,
    body: promoData.body,
    data: {
      type: 'promotion',
      promoId: promoData.id,
      screen: promoData.screen || '/store'
    },
    channelId: 'promotions',
  });
}
