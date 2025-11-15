import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../services/authStore';
import { useChatStore } from '../services/chatStore';
import { roomsAPI, messagesAPI, notificationsAPI } from '../services/api';
import socketService from '../services/socket';

import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import './ChatPage.css';

function ChatPage() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const {
    setRooms,
    setCurrentRoom,
    setMessages,
    addMessage,
    setOnlineUsers,
    updateUserStatus,
    setUserTyping,
    addNotification,
    setNotifications,
    setUnreadCount
  } = useChatStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeChat();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const initializeChat = async () => {
    try {
      // Connect socket
      socketService.connect(token);

      // Load rooms
      const roomsResponse = await roomsAPI.getAll();
      setRooms(roomsResponse.data.rooms);

      // Load notifications
      const notifsResponse = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(notifsResponse.data.notifications);
      setUnreadCount(notifsResponse.data.unreadCount);

      // Setup socket listeners
      setupSocketListeners();

      setLoading(false);
    } catch (error) {
      console.error('Chat initialization error:', error);
      toast.error('Failed to initialize chat');
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Online users
    socketService.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    // User status
    socketService.on('user_status', (data) => {
      updateUserStatus(data.userId, data.status);
    });

    // New message
    socketService.on('new_message', (data) => {
      addMessage(data.roomId, data.message);
      toast.success(`New message in ${data.message.room?.name || 'chat'}`);
    });

    // User joined room
    socketService.on('user_joined', (data) => {
      console.log('User joined:', data);
    });

    // User left room
    socketService.on('user_left', (data) => {
      console.log('User left:', data);
    });

    // Typing indicator
    socketService.on('user_typing', (data) => {
      setUserTyping(data.roomId, data.user._id, data.user.username, data.typing);
    });

    // Notification
    socketService.on('notification', (notification) => {
      addNotification(notification);
      toast.info(notification.title);
    });

    // Error
    socketService.on('error', (error) => {
      toast.error(error.message);
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      socketService.disconnect();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <Sidebar onLogout={handleLogout} />
      <ChatWindow />
    </div>
  );
}

export default ChatPage;
