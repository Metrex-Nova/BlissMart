const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

let admin;

// Initialize Firebase Admin safely
try {
  admin = require('firebase-admin');
  
  if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    });
    console.log('✅ Firebase initialized');
  }
} catch (error) {
  console.warn('⚠️ Firebase not configured (notifications will work locally only)');
  admin = null;
}

// ✅ Send notification to user
async function sendNotification({ userId, title, message, type, actionUrl, metadata }) {
  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        actionUrl,
        metadata: metadata || {},
        sentVia: 'IN_APP'
      }
    });

    console.log(`📬 Notification created for user ${userId}: ${title}`);

    // Send push notification if Firebase is available
    if (admin && admin.apps.length > 0) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { fcmToken: true }
        });

        if (user?.fcmToken) {
          await admin.messaging().send({
            token: user.fcmToken,
            notification: { title, body: message },
            data: {
              type,
              actionUrl: actionUrl || '',
              notificationId: notification.id.toString()
            }
          });

          // Update notification to mark as FCM sent
          await prisma.notification.update({
            where: { id: notification.id },
            data: { sentVia: 'FCM_PUSH' }
          });

          console.log(`📲 FCM push sent to user ${userId}`);
        }
      } catch (fcmError) {
        console.warn('⚠️ FCM send error:', fcmError.message);
        // Continue even if FCM fails - in-app notification still works
      }
    }

    return notification;
  } catch (error) {
    console.error('❌ Notification error:', error);
    throw error;
  }
}

// ✅ Send notification to multiple users
async function sendBulkNotification(userIds, { title, message, type, actionUrl, metadata }) {
  try {
    const promises = userIds.map(userId =>
      sendNotification({ userId, title, message, type, actionUrl, metadata })
    );
    const results = await Promise.all(promises);
    console.log(`📬 Bulk notification sent to ${results.length} users`);
    return results;
  } catch (error) {
    console.error('❌ Bulk notification error:', error);
    throw error;
  }
}

// ✅ Get user notifications
async function getUserNotifications(userId, limit = 20) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return notifications;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    throw error;
  }
}

// ✅ Mark notification as read
async function markNotificationAsRead(notificationId) {
  try {
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });
    return updated;
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    throw error;
  }
}

// ✅ Mark all notifications as read for user
async function markAllNotificationsAsRead(userId) {
  try {
    const updated = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
    return updated;
  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    throw error;
  }
}

// ✅ Get unread notification count
async function getUnreadCount(userId) {
  try {
    const count = await prisma.notification.count({
      where: { userId, read: false }
    });
    return count;
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    throw error;
  }
}

module.exports = {
  sendNotification,
  sendBulkNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
};
