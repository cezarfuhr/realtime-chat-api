import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePushToken: (token) => api.post('/auth/push-token', { pushToken: token }),
  logout: () => api.post('/auth/logout')
};

// Rooms API
export const roomsAPI = {
  create: (data) => api.post('/rooms', data),
  getAll: (params) => api.get('/rooms', { params }),
  getById: (id) => api.get(`/rooms/${id}`),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
  addMember: (id, userId, role) => api.post(`/rooms/${id}/members`, { userId, role }),
  removeMember: (id, userId) => api.delete(`/rooms/${id}/members`, { data: { userId } }),
  leave: (id) => api.post(`/rooms/${id}/leave`)
};

// Messages API
export const messagesAPI = {
  getMessages: (roomId, params) => api.get(`/messages/${roomId}`, { params }),
  send: (data) => api.post('/messages', data),
  uploadFile: (formData) => {
    return api.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  edit: (messageId, content) => api.put(`/messages/${messageId}`, { content }),
  delete: (messageId) => api.delete(`/messages/${messageId}`),
  markAsRead: (messageId) => api.post(`/messages/${messageId}/read`),
  search: (params) => api.get('/messages/search', { params })
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (notificationId) => api.post(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (notificationId) => api.delete(`/notifications/${notificationId}`)
};

export default api;
