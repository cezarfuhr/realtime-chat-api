import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../../src/services/chatStore';

describe('Chat Store', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  describe('Rooms', () => {
    it('should set rooms', () => {
      const rooms = [
        { _id: '1', name: 'Room 1' },
        { _id: '2', name: 'Room 2' }
      ];

      useChatStore.getState().setRooms(rooms);

      expect(useChatStore.getState().rooms).toEqual(rooms);
    });

    it('should add room', () => {
      const room = { _id: '1', name: 'New Room' };

      useChatStore.getState().addRoom(room);

      expect(useChatStore.getState().rooms).toHaveLength(1);
      expect(useChatStore.getState().rooms[0]).toEqual(room);
    });

    it('should update room', () => {
      const rooms = [{ _id: '1', name: 'Room 1', description: 'Old' }];
      useChatStore.getState().setRooms(rooms);

      useChatStore.getState().updateRoom('1', { description: 'New' });

      expect(useChatStore.getState().rooms[0].description).toBe('New');
    });

    it('should remove room', () => {
      const rooms = [
        { _id: '1', name: 'Room 1' },
        { _id: '2', name: 'Room 2' }
      ];
      useChatStore.getState().setRooms(rooms);

      useChatStore.getState().removeRoom('1');

      expect(useChatStore.getState().rooms).toHaveLength(1);
      expect(useChatStore.getState().rooms[0]._id).toBe('2');
    });
  });

  describe('Messages', () => {
    it('should set messages for room', () => {
      const messages = [
        { _id: '1', content: 'Hello' },
        { _id: '2', content: 'World' }
      ];

      useChatStore.getState().setMessages('room1', messages);

      expect(useChatStore.getState().messages['room1']).toEqual(messages);
    });

    it('should add message to room', () => {
      const message = { _id: '1', content: 'New message' };

      useChatStore.getState().addMessage('room1', message);

      expect(useChatStore.getState().messages['room1']).toHaveLength(1);
      expect(useChatStore.getState().messages['room1'][0]).toEqual(message);
    });

    it('should update message', () => {
      const messages = [{ _id: '1', content: 'Old content' }];
      useChatStore.getState().setMessages('room1', messages);

      useChatStore.getState().updateMessage('room1', '1', { content: 'New content' });

      expect(useChatStore.getState().messages['room1'][0].content).toBe('New content');
    });
  });

  describe('Online Users', () => {
    it('should set online users', () => {
      const users = [
        { _id: '1', username: 'user1', status: 'online' },
        { _id: '2', username: 'user2', status: 'online' }
      ];

      useChatStore.getState().setOnlineUsers(users);

      expect(useChatStore.getState().onlineUsers).toEqual(users);
    });

    it('should update user status', () => {
      const users = [{ _id: '1', username: 'user1', status: 'online' }];
      useChatStore.getState().setOnlineUsers(users);

      useChatStore.getState().updateUserStatus('1', 'away');

      expect(useChatStore.getState().onlineUsers[0].status).toBe('away');
    });
  });

  describe('Notifications', () => {
    it('should add notification', () => {
      const notification = {
        _id: '1',
        title: 'New message',
        message: 'You have a new message'
      };

      useChatStore.getState().addNotification(notification);

      expect(useChatStore.getState().notifications).toHaveLength(1);
      expect(useChatStore.getState().unreadCount).toBe(1);
    });

    it('should mark notification as read', () => {
      const notification = { _id: '1', title: 'Test', read: false };
      useChatStore.getState().setNotifications([notification]);
      useChatStore.getState().setUnreadCount(1);

      useChatStore.getState().markNotificationAsRead('1');

      expect(useChatStore.getState().notifications[0].read).toBe(true);
      expect(useChatStore.getState().unreadCount).toBe(0);
    });
  });
});
