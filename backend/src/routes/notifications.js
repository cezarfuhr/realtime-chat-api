const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/', notificationController.getNotifications);
router.post('/:notificationId/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.delete('/:notificationId', notificationController.deleteNotification);

module.exports = router;
