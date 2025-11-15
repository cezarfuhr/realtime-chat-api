import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../services/authStore';
import { useChatStore } from '../services/chatStore';
import { messagesAPI } from '../services/api';
import socketService from '../services/socket';
import './ChatWindow.css';

function ChatWindow() {
  const { user } = useAuthStore();
  const { currentRoom, messages, typingUsers } = useChatStore();
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);

  const roomMessages = currentRoom ? messages[currentRoom._id] || [] : [];
  const roomTyping = currentRoom ? typingUsers[currentRoom._id] || {} : {};
  const typingUsernames = Object.values(roomTyping).filter(Boolean);

  useEffect(() => {
    scrollToBottom();
  }, [roomMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = (e) => {
    setMessageInput(e.target.value);

    if (!currentRoom) return;

    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Send typing start
    socketService.startTyping(currentRoom._id);

    // Set timeout to stop typing
    const timeout = setTimeout(() => {
      socketService.stopTyping(currentRoom._id);
    }, 2000);

    setTypingTimeout(timeout);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageInput.trim() || !currentRoom || sending) return;

    setSending(true);

    try {
      // Send via socket
      socketService.sendMessage(currentRoom._id, messageInput.trim());

      setMessageInput('');
      socketService.stopTyping(currentRoom._id);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentRoom) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', currentRoom._id);

    try {
      toast.loading('Uploading file...');
      await messagesAPI.uploadFile(formData);
      toast.dismiss();
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to upload file');
    }
  };

  if (!currentRoom) {
    return (
      <div className="chat-window">
        <div className="empty-state">
          <h2>Welcome to Real-time Chat!</h2>
          <p>Select a room to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>{currentRoom.name}</h2>
        <p>{currentRoom.members?.length || 0} members</p>
      </div>

      <div className="messages-container">
        {roomMessages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          roomMessages.map((message) => (
            <div
              key={message._id}
              className={`message ${message.sender?._id === user._id ? 'own-message' : ''}`}
            >
              <div className="message-avatar">
                {message.sender?.avatar ? (
                  <img src={message.sender.avatar} alt={message.sender.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {message.sender?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">{message.sender?.username}</span>
                  <span className="message-time">
                    {format(new Date(message.createdAt), 'HH:mm')}
                  </span>
                </div>
                {message.type === 'file' ? (
                  <div className="message-file">
                    <a href={message.file?.url} target="_blank" rel="noopener noreferrer">
                      {message.file?.originalName}
                    </a>
                  </div>
                ) : (
                  <p className="message-text">{message.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingUsernames.length > 0 && (
        <div className="typing-indicator">
          {typingUsernames.join(', ')} {typingUsernames.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      <form className="message-input-container" onSubmit={handleSendMessage}>
        <label className="file-upload-btn">
          <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
          📎
        </label>
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          value={messageInput}
          onChange={handleTyping}
          disabled={sending}
        />
        <button type="submit" className="send-button" disabled={sending || !messageInput.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
