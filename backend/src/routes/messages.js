const express = require('express');
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { messageLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');
const { optimizeImage } = require('../middleware/imageOptimizer');
const validate = require('../middleware/validate');

const router = express.Router();

// Validation rules
const sendMessageValidation = [
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  validate
];

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/search', messageController.searchMessages);
router.get('/:roomId', messageController.getMessages);
router.post('/', messageLimiter, sendMessageValidation, messageController.sendMessage);
router.post('/upload', uploadLimiter, upload.single('file'), optimizeImage, messageController.uploadFile);
router.put('/:messageId', messageController.editMessage);
router.delete('/:messageId', messageController.deleteMessage);
router.post('/:messageId/read', messageController.markAsRead);

module.exports = router;
