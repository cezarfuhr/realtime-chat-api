import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isReconnecting = false;
    this.token = null;
    this.currentRoomId = null;
    this.reconnectCallbacks = [];
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.token = token;
    this.reconnectAttempts = 0;

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      timeout: 20000
    });

    this.setupEventHandlers();

    return this.socket;
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      toast.success('Connected to chat server');

      // Rejoin current room if any
      if (this.currentRoomId) {
        console.log('Rejoining room:', this.currentRoomId);
        this.joinRoom(this.currentRoomId);
      }

      // Process queued messages
      this.processMessageQueue();

      // Call reconnect callbacks for syncing
      this.reconnectCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Reconnect callback error:', error);
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('❌ Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server disconnected the socket, need to reconnect manually
        toast.error('Disconnected from server');
        this.reconnect();
      } else if (reason === 'transport close' || reason === 'transport error') {
        toast.warning('Connection lost, reconnecting...');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Failed to connect. Please refresh the page.');
        this.isReconnecting = false;
      } else {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        toast.loading(`Reconnecting in ${delay / 1000}s...`, { duration: delay });
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('✅ Reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
      toast.success('Reconnected successfully!');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
      this.isReconnecting = true;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      toast.error('Could not reconnect. Please refresh the page.');
      this.isReconnecting = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);

      // Handle rate limiting errors
      if (error.retryAfter) {
        toast.error(`Rate limit: Please wait ${error.retryAfter}s`);
      } else {
        toast.error(error.message || 'Socket error occurred');
      }
    });
  }

  reconnect() {
    if (this.isReconnecting || !this.token) {
      return;
    }

    this.isReconnecting = true;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      } else {
        this.connect(this.token);
      }
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      this.messageQueue = [];
      this.currentRoomId = null;
      this.reconnectCallbacks = [];
    }
  }

  on(event, callback) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.on(event, callback);

    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);

    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (!this.socket || !this.isConnected()) {
      console.warn('Socket not connected, queueing message');
      this.queueMessage(event, data);
      return;
    }

    this.socket.emit(event, data);
  }

  queueMessage(event, data) {
    // Queue message for later delivery
    this.messageQueue.push({ event, data, timestamp: Date.now() });

    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  processMessageQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.messageQueue.length} queued messages`);

    const now = Date.now();
    const maxAge = 60000; // 1 minute

    // Process messages that are not too old
    while (this.messageQueue.length > 0) {
      const queued = this.messageQueue.shift();

      // Skip messages older than 1 minute
      if (now - queued.timestamp > maxAge) {
        console.warn('Skipping old queued message:', queued.event);
        continue;
      }

      if (this.socket && this.isConnected()) {
        this.socket.emit(queued.event, queued.data);
      }
    }
  }

  // Room methods
  joinRoom(roomId) {
    this.currentRoomId = roomId;
    this.emit('join_room', { roomId });
  }

  leaveRoom(roomId) {
    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
    }
    this.emit('leave_room', { roomId });
  }

  sendMessage(roomId, content, replyTo = null) {
    this.emit('send_message', { roomId, content, replyTo });
  }

  startTyping(roomId) {
    if (this.isConnected()) {
      this.emit('typing_start', { roomId });
    }
  }

  stopTyping(roomId) {
    if (this.isConnected()) {
      this.emit('typing_stop', { roomId });
    }
  }

  markMessageAsRead(messageId) {
    this.emit('message_read', { messageId });
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getConnectionState() {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.isReconnecting) return 'reconnecting';
    return 'disconnected';
  }

  onReconnect(callback) {
    this.reconnectCallbacks.push(callback);
  }

  offReconnect(callback) {
    const index = this.reconnectCallbacks.indexOf(callback);
    if (index > -1) {
      this.reconnectCallbacks.splice(index, 1);
    }
  }
}

const socketService = new SocketService();

export default socketService;
