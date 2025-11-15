const express = require('express');
const { body } = require('express-validator');
const roomController = require('../controllers/roomController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Validation rules
const createRoomValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1 and 100 characters'),
  body('type')
    .optional()
    .isIn(['public', 'private', 'direct'])
    .withMessage('Invalid room type'),
  validate
];

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', createRoomValidation, roomController.createRoom);
router.get('/', roomController.getRooms);
router.get('/:id', roomController.getRoomById);
router.put('/:id', roomController.updateRoom);
router.post('/:id/members', roomController.addMember);
router.delete('/:id/members', roomController.removeMember);
router.post('/:id/leave', roomController.leaveRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;
