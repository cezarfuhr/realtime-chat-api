import { useEffect, useState } from 'react';
import socketService from '../services/socket';
import { useChatStore } from '../services/chatStore';
import { messagesAPI } from '../services/api';
import toast from 'react-hot-toast';

export function useSocket() {
  const [connectionState, setConnectionState] = useState('disconnected');
  const currentRoom = useChatStore((state) => state.currentRoom);
  const setMessages = useChatStore((state) => state.setMessages);

  useEffect(() => {
    // Update connection state periodically
    const interval = setInterval(() => {
      setConnectionState(socketService.getConnectionState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Setup reconnect callback to resync messages
    const resyncMessages = async () => {
      if (currentRoom) {
        try {
          console.log('Resyncing messages after reconnect for room:', currentRoom._id);
          const response = await messagesAPI.getMessages(currentRoom._id, { limit: 50 });
          setMessages(currentRoom._id, response.data.messages);
          toast.success('Messages synced');
        } catch (error) {
          console.error('Failed to resync messages:', error);
          toast.error('Failed to sync messages');
        }
      }
    };

    socketService.onReconnect(resyncMessages);

    return () => {
      socketService.offReconnect(resyncMessages);
    };
  }, [currentRoom, setMessages]);

  return {
    isConnected: connectionState === 'connected',
    isReconnecting: connectionState === 'reconnecting',
    connectionState
  };
}

export default useSocket;
