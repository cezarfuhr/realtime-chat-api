const Message = require('../models/Message');
const Room = require('../models/Room');
const logger = require('../utils/logger');

// Get messages for a room
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check if user is member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isMember(req.userId) && room.type === 'private') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await Message.find({
      room: roomId,
      deleted: false
    })
      .populate('sender', 'username email avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ room: roomId, deleted: false });

    res.json({
      messages: messages.reverse(),
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

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { roomId, content, replyTo } = req.body;

    // Check if user is member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isMember(req.userId)) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    const message = await Message.create({
      room: roomId,
      sender: req.userId,
      content,
      type: 'text',
      replyTo: replyTo || null
    });

    await message.populate('sender', 'username email avatar');
    if (message.replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Update room last activity
    room.lastActivity = new Date();
    await room.save();

    logger.info(`Message sent in room ${roomId} by ${req.user.username}`);

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Upload file message
exports.uploadFile = async (req, res) => {
  try {
    const { roomId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user is member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isMember(req.userId)) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    // Check room settings
    if (!room.settings.allowFileUpload) {
      return res.status(403).json({ error: 'File upload is disabled in this room' });
    }

    const message = await Message.create({
      room: roomId,
      sender: req.userId,
      type: 'file',
      content: file.originalname,
      file: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`
      }
    });

    await message.populate('sender', 'username email avatar');

    // Update room last activity
    room.lastActivity = new Date();
    await room.save();

    logger.info(`File uploaded in room ${roomId} by ${req.user.username}`);

    res.status(201).json({
      message: 'File uploaded successfully',
      data: message
    });
  } catch (error) {
    logger.error('Upload file error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Edit message
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    if (message.type !== 'text') {
      return res.status(400).json({ error: 'Only text messages can be edited' });
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate('sender', 'username email avatar');

    logger.info(`Message edited: ${messageId}`);

    res.json({
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    message.softDelete();
    await message.save();

    logger.info(`Message deleted: ${messageId}`);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.markAsRead(req.userId);
    await message.save();

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Search messages
exports.searchMessages = async (req, res) => {
  try {
    const { query, roomId } = req.query;
    const { limit = 20, offset = 0 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = {
      $text: { $search: query },
      deleted: false
    };

    if (roomId) {
      searchQuery.room = roomId;
    }

    const messages = await Message.find(searchQuery)
      .populate('sender', 'username email avatar')
      .populate('room', 'name type')
      .sort({ score: { $meta: 'textScore' } })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Message.countDocuments(searchQuery);

    res.json({
      messages,
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
