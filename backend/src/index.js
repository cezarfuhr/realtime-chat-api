require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const connectDB = require('./config/database');
const { initRedis } = require('./config/redis');
const SocketService = require('./services/socketService');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// API documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'Real-time Chat API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        updatePushToken: 'POST /api/auth/push-token',
        logout: 'POST /api/auth/logout'
      },
      rooms: {
        create: 'POST /api/rooms',
        list: 'GET /api/rooms',
        get: 'GET /api/rooms/:id',
        update: 'PUT /api/rooms/:id',
        delete: 'DELETE /api/rooms/:id',
        addMember: 'POST /api/rooms/:id/members',
        removeMember: 'DELETE /api/rooms/:id/members',
        leave: 'POST /api/rooms/:id/leave'
      },
      messages: {
        list: 'GET /api/messages/:roomId',
        send: 'POST /api/messages',
        upload: 'POST /api/messages/upload',
        edit: 'PUT /api/messages/:messageId',
        delete: 'DELETE /api/messages/:messageId',
        markRead: 'POST /api/messages/:messageId/read',
        search: 'GET /api/messages/search'
      },
      notifications: {
        list: 'GET /api/notifications',
        markRead: 'POST /api/notifications/:notificationId/read',
        markAllRead: 'POST /api/notifications/read-all',
        delete: 'DELETE /api/notifications/:notificationId'
      }
    },
    websocket: {
      events: {
        client: [
          'join_room',
          'leave_room',
          'send_message',
          'typing_start',
          'typing_stop',
          'message_read'
        ],
        server: [
          'new_message',
          'user_joined',
          'user_left',
          'user_typing',
          'message_read',
          'user_status',
          'notification',
          'online_users',
          'error'
        ]
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Redis
    await initRedis();

    // Initialize Socket.io
    const socketService = new SocketService(server);
    app.set('socketService', socketService);

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await initializeServices();

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
