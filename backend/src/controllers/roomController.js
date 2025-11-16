const Room = require('../models/Room');
const Message = require('../models/Message');
const logger = require('../utils/logger');

// Create new room
exports.createRoom = async (req, res) => {
  try {
    const { name, description, type, members } = req.body;

    const room = await Room.create({
      name,
      description,
      type: type || 'public',
      owner: req.userId,
      members: [
        { user: req.userId, role: 'admin' },
        ...(members || []).map(userId => ({ user: userId, role: 'member' }))
      ]
    });

    await room.populate('members.user', 'username email avatar');

    logger.info(`Room created: ${room.name} by ${req.user.username}`);

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    logger.error('Create room error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get all rooms (user is member of)
exports.getRooms = async (req, res) => {
  try {
    const { type } = req.query;

    const query = {
      'members.user': req.userId,
      isActive: true
    };

    if (type) {
      query.type = type;
    }

    const rooms = await Room.find(query)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar status')
      .sort({ lastActivity: -1 });

    res.json({ rooms });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get room by ID
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar status');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isMember(req.userId) && room.type === 'private') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ room });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update room
exports.updateRoom = async (req, res) => {
  try {
    const { name, description, avatar, settings } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is owner or admin
    const member = room.members.find(m => m.user.toString() === req.userId.toString());
    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (avatar !== undefined) room.avatar = avatar;
    if (settings) room.settings = { ...room.settings, ...settings };

    room.lastActivity = new Date();
    await room.save();

    await room.populate('members.user', 'username email avatar status');

    logger.info(`Room updated: ${room.name}`);

    res.json({
      message: 'Room updated successfully',
      room
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add member to room
exports.addMember = async (req, res) => {
  try {
    const { userId, role } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check permissions
    const member = room.members.find(m => m.user.toString() === req.userId.toString());
    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    room.addMember(userId, role || 'member');
    await room.save();

    await room.populate('members.user', 'username email avatar status');

    logger.info(`Member added to room: ${room.name}`);

    res.json({
      message: 'Member added successfully',
      room
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Remove member from room
exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check permissions
    const member = room.members.find(m => m.user.toString() === req.userId.toString());
    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    room.removeMember(userId);
    await room.save();

    logger.info(`Member removed from room: ${room.name}`);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Leave room
exports.leaveRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    room.removeMember(req.userId);
    await room.save();

    logger.info(`User left room: ${room.name}`);

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete room
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only room owner can delete the room' });
    }

    room.isActive = false;
    await room.save();

    logger.info(`Room deleted: ${room.name}`);

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
