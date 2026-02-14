import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// --- Auth ---
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// --- Chat ---
export const chatAPI = {
  send: (message) => api.post('/chat/send', { message }),
  history: (limit = 50, offset = 0) => api.get(`/chat/history?limit=${limit}&offset=${offset}`),
};

// --- Profile ---
export const profileAPI = {
  get: () => api.get('/profile/me'),
  getUser: (userId) => api.get(`/profile/${userId}`),
  update: (data) => api.put('/profile/me', data),
  getEmotions: (limit = 30) => api.get(`/profile/emotions?limit=${limit}`),
  logEmotion: (data) => api.post('/profile/emotions', data),
  emotionSummary: () => api.get('/profile/emotions/summary'),
  userEmotionSummary: (userId) => api.get(`/profile/${userId}/emotions/summary`),
};

// --- Connections ---
export const connectAPI = {
  discover: (mood) => api.get(`/connect/discover${mood ? `?mood=${mood}` : ''}`),
  request: (targetUserId) => api.post('/connect/request', { target_user_id: targetUserId }),
  accept: (connectionId) => api.put(`/connect/accept/${connectionId}`),
  myConnections: () => api.get('/connect/my-connections'),
  pending: () => api.get('/connect/pending'),
  sendMessage: (data) => api.post('/connect/messages', data),
  getMessages: (userId, limit = 50) => api.get(`/connect/messages/${userId}?limit=${limit}`),
  clearMessages: (userId) => api.delete(`/connect/messages/${userId}`),
};

// --- Extras ---
export const extrasAPI = {
  quote: () => api.get('/extras/quote'),
  emergencyResources: () => api.get('/extras/emergency-resources'),
  salChat: (message) => api.post('/extras/sal', { message }),
};

export default api;
