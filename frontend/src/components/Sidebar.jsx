import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../services/authStore';
import { useChatStore } from '../services/chatStore';
import { roomsAPI, messagesAPI } from '../services/api';
import socketService from '../services/socket';
import './Sidebar.css';

function Sidebar({ onLogout }) {
  const { user } = useAuthStore();
  const { rooms, currentRoom, setCurrentRoom, addRoom } = useChatStore();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('public');
  const [loading, setLoading] = useState(false);

  const handleRoomClick = async (room) => {
    try {
      setCurrentRoom(room);

      // Join socket room
      socketService.joinRoom(room._id);

      // Load messages
      const response = await messagesAPI.getMessages(room._id, { limit: 50 });
      useChatStore.getState().setMessages(room._id, response.data.messages);
    } catch (error) {
      toast.error('Failed to load room');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await roomsAPI.create({
        name: roomName,
        type: roomType
      });

      addRoom(response.data.room);
      toast.success('Room created successfully');
      setShowCreateRoom(false);
      setRoomName('');
      setRoomType('public');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="user-info">
          <div className="user-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <div className="avatar-placeholder">{user?.username?.[0]?.toUpperCase()}</div>
            )}
          </div>
          <div className="user-details">
            <h3>{user?.username}</h3>
            <span className="status-online">Online</span>
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>

      <div className="rooms-header">
        <h2>Rooms</h2>
        <button
          className="btn-create-room"
          onClick={() => setShowCreateRoom(!showCreateRoom)}
        >
          +
        </button>
      </div>

      {showCreateRoom && (
        <form className="create-room-form" onSubmit={handleCreateRoom}>
          <input
            type="text"
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="rooms-list">
        {rooms.length === 0 ? (
          <p className="empty-message">No rooms yet. Create one!</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room._id}
              className={`room-item ${currentRoom?._id === room._id ? 'active' : ''}`}
              onClick={() => handleRoomClick(room)}
            >
              <div className="room-avatar">
                {room.avatar ? (
                  <img src={room.avatar} alt={room.name} />
                ) : (
                  <div className="avatar-placeholder">{room.name[0].toUpperCase()}</div>
                )}
              </div>
              <div className="room-info">
                <h4>{room.name}</h4>
                <p className="room-type">{room.type}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
