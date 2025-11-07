const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadCount 
} = require('../utils/notificationService');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/notifications/:userId - Get user notifications
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const notifications = await getUserNotifications(parseInt(userId), parseInt(limit));
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/:userId/unread - Get unread count
router.get('/:userId/unread', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await getUnreadCount(parseInt(userId));
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// POST /api/notifications/:notificationId/read - Mark as read
router.post('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await markNotificationAsRead(parseInt(notificationId));
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// POST /api/notifications/:userId/read-all - Mark all as read
router.post('/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await markAllNotificationsAsRead(parseInt(userId));
    res.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// POST /api/notifications/save-fcm-token - Save FCM token
router.post('/save-fcm-token', async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'userId and token required' });
    }

    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { fcmToken: token }
    });

    res.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
});

module.exports = router;
