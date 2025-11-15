const { Server } = require('socket.io');
const { socketAuth } = require('../middleware/auth');
const socketRateLimiter = require('../middleware/socketRateLimiter');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { getRedisPublisher, getRedisSubscriber } = require('../config/redis');
const { createNotification } = require('../controllers/notificationController');
const logger = require('../utils/logger');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true
      }
    });

    this.userSockets = new Map(); // userId -> Set of socketIds
    this.initializeMiddleware();
    this.initializeEventHandlers();
    this.initializeRedis();
  }

  initializeMiddleware() {
    this.io.use(socketAuth);
  }

  initializeEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);

      socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
      socket.on('send_message', (data) => this.handleSendMessage(socket, data));
      socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
      socket.on('message_read', (data) => this.handleMessageRead(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  async initializeRedis() {
    try {
      const subscriber = getRedisSubscriber();

      // Subscribe to message broadcasts
      await subscriber.subscribe('message:broadcast', (message) => {
        const data = JSON.parse(message);
        this.io.to(data.roomId).emit('new_message', data.message);
      });

      // Subscribe to user status updates
      await subscriber.subscribe('user:status', (message) => {
        const data = JSON.parse(message);
        this.io.emit('user_status', data);
      });

      // Subscribe to notifications
      await subscriber.subscribe('notification:send', (message) => {
        const data = JSON.parse(message);
        this.sendNotificationToUser(data.userId, data.notification);
      });

      logger.info('Redis pub/sub initialized for Socket.io');
    } catch (error) {
      logger.error('Redis pub/sub initialization error:', error);
    }
  }

  async handleConnection(socket) {
    const userId = socket.userId;

    // Add socket to user's socket set
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    // Update user status
    await User.findByIdAndUpdate(userId, {
      status: 'online',
      socketId: socket.id,
      lastSeen: new Date()
    });

    // Broadcast user online status
    await this.broadcastUserStatus(userId, 'online');

    logger.info(`User connected: ${socket.user.username} (${socket.id})`);

    // Send online users to the connected user
    const onlineUsers = await this.getOnlineUsers();
    socket.emit('online_users', onlineUsers);
  }

  async handleJoinRoom(socket, { roomId }) {
    try {
      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isMember(socket.userId)) {
        return socket.emit('error', { message: 'Not a member of this room' });
      }

      socket.join(roomId);

      // Notify others in the room
      socket.to(roomId).emit('user_joined', {
        roomId,
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar
        }
      });

      logger.info(`User ${socket.user.username} joined room ${roomId}`);
    } catch (error) {
      logger.error('Join room error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  async handleLeaveRoom(socket, { roomId }) {
    try {
      socket.leave(roomId);

      socket.to(roomId).emit('user_left', {
        roomId,
        user: {
          _id: socket.user._id,
          username: socket.user.username
        }
      });

      logger.info(`User ${socket.user.username} left room ${roomId}`);
    } catch (error) {
      logger.error('Leave room error:', error);
    }
  }

  async handleSendMessage(socket, { roomId, content, replyTo }) {
    try {
      // Check rate limit
      const limitCheck = socketRateLimiter.checkLimit(socket.userId, 'messages');
      if (!limitCheck.allowed) {
        return socket.emit('error', {
          message: `Rate limit exceeded. Please wait ${limitCheck.retryAfter} seconds.`,
          retryAfter: limitCheck.retryAfter
        });
      }

      const room = await Room.findById(roomId);

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isMember(socket.userId)) {
        return socket.emit('error', { message: 'Not a member of this room' });
      }

      // Create message
      const message = await Message.create({
        room: roomId,
        sender: socket.userId,
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

      // Broadcast message via Redis for scalability
      const publisher = getRedisPublisher();
      await publisher.publish('message:broadcast', JSON.stringify({
        roomId,
        message
      }));

      // Send notifications to room members
      for (const member of room.members) {
        if (member.user.toString() !== socket.userId.toString()) {
          const notification = await createNotification(
            member.user,
            'message',
            `New message in ${room.name}`,
            content.substring(0, 100),
            { room: roomId, message: message._id, sender: socket.userId }
          );

          // Broadcast notification
          await publisher.publish('notification:send', JSON.stringify({
            userId: member.user.toString(),
            notification
          }));
        }
      }

      logger.info(`Message sent in room ${roomId} by ${socket.user.username}`);
    } catch (error) {
      logger.error('Send message error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  async handleTypingStart(socket, { roomId }) {
    // Check rate limit for typing
    const limitCheck = socketRateLimiter.checkLimit(socket.userId, 'typing');
    if (!limitCheck.allowed) {
      return; // Silently ignore excessive typing events
    }

    socket.to(roomId).emit('user_typing', {
      roomId,
      user: {
        _id: socket.user._id,
        username: socket.user.username
      },
      typing: true
    });
  }

  async handleTypingStop(socket, { roomId }) {
    socket.to(roomId).emit('user_typing', {
      roomId,
      user: {
        _id: socket.user._id,
        username: socket.user.username
      },
      typing: false
    });
  }

  async handleMessageRead(socket, { messageId }) {
    try {
      const message = await Message.findById(messageId);

      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      message.markAsRead(socket.userId);
      await message.save();

      // Notify sender
      this.io.to(message.room.toString()).emit('message_read', {
        messageId,
        userId: socket.userId
      });
    } catch (error) {
      logger.error('Message read error:', error);
    }
  }

  async handleDisconnect(socket) {
    const userId = socket.userId;

    // Remove socket from user's socket set
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket.id);

      // If no more sockets for this user, mark as offline
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);

        await User.findByIdAndUpdate(userId, {
          status: 'offline',
          lastSeen: new Date(),
          socketId: null
        });

        await this.broadcastUserStatus(userId, 'offline');
      }
    }

    logger.info(`User disconnected: ${socket.user.username} (${socket.id})`);
  }

  async broadcastUserStatus(userId, status) {
    try {
      const publisher = getRedisPublisher();
      await publisher.publish('user:status', JSON.stringify({
        userId,
        status,
        timestamp: new Date()
      }));
    } catch (error) {
      logger.error('Broadcast user status error:', error);
    }
  }

  async getOnlineUsers() {
    try {
      const users = await User.find({ status: 'online' })
        .select('username email avatar status lastSeen');
      return users;
    } catch (error) {
      logger.error('Get online users error:', error);
      return [];
    }
  }

  sendNotificationToUser(userId, notification) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit('notification', notification);
      });
    }
  }

  getIO() {
    return this.io;
  }
}

module.exports = SocketService;
