const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const { limit = 20, offset = 0, unreadOnly } = req.query;

    const query = { user: req.userId };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('data.sender', 'username avatar')
      .populate('data.room', 'name type')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: req.userId, read: false });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        total,
        offset: parseInt(offset),
        limit: parseInt(limit),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.markAsRead();
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.userId, read: false },
      { read: true, readAt: new Date() }
    );

    logger.info(`All notifications marked as read for user: ${req.user.username}`);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: req.userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Create notification (internal use)
exports.createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data
    });

    return notification;
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
};
