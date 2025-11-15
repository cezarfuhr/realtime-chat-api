import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  rooms: [],
  currentRoom: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  notifications: [],
  unreadCount: 0,

  // Rooms
  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) => set((state) => ({
    rooms: [room, ...state.rooms]
  })),

  updateRoom: (roomId, updates) => set((state) => ({
    rooms: state.rooms.map((room) =>
      room._id === roomId ? { ...room, ...updates } : room
    )
  })),

  removeRoom: (roomId) => set((state) => ({
    rooms: state.rooms.filter((room) => room._id !== roomId),
    currentRoom: state.currentRoom?._id === roomId ? null : state.currentRoom
  })),

  setCurrentRoom: (room) => set({ currentRoom: room }),

  // Messages
  setMessages: (roomId, messages) => set((state) => ({
    messages: { ...state.messages, [roomId]: messages }
  })),

  addMessage: (roomId, message) => set((state) => {
    const roomMessages = state.messages[roomId] || [];
    return {
      messages: {
        ...state.messages,
        [roomId]: [...roomMessages, message]
      }
    };
  }),

  updateMessage: (roomId, messageId, updates) => set((state) => {
    const roomMessages = state.messages[roomId] || [];
    return {
      messages: {
        ...state.messages,
        [roomId]: roomMessages.map((msg) =>
          msg._id === messageId ? { ...msg, ...updates } : msg
        )
      }
    };
  }),

  deleteMessage: (roomId, messageId) => set((state) => {
    const roomMessages = state.messages[roomId] || [];
    return {
      messages: {
        ...state.messages,
        [roomId]: roomMessages.filter((msg) => msg._id !== messageId)
      }
    };
  }),

  // Online users
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateUserStatus: (userId, status) => set((state) => ({
    onlineUsers: state.onlineUsers.map((user) =>
      user._id === userId ? { ...user, status } : user
    )
  })),

  // Typing users
  setUserTyping: (roomId, userId, username, typing) => set((state) => {
    const roomTyping = state.typingUsers[roomId] || {};

    if (typing) {
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: { ...roomTyping, [userId]: username }
        }
      };
    } else {
      const newRoomTyping = { ...roomTyping };
      delete newRoomTyping[userId];
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: newRoomTyping
        }
      };
    }
  }),

  // Notifications
  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),

  markNotificationAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map((notif) =>
      notif._id === notificationId ? { ...notif, read: true } : notif
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),

  setUnreadCount: (count) => set({ unreadCount: count }),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

  // Clear all
  reset: () => set({
    rooms: [],
    currentRoom: null,
    messages: {},
    onlineUsers: [],
    typingUsers: {},
    notifications: [],
    unreadCount: 0
  })
}));
