import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  login: (data) => api.post('/auth/login', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data)
};

export const userAPI = {
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (formData) => api.put('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchUsers: (query) => api.get(`/users/search?query=${query}`),
  getUserChats: () => api.get('/users/chats')
};

export const messageAPI = {
  getConversation: (userId, page = 0, size = 50) => 
    api.get(`/messages/conversation?userId=${userId}&page=${page}&size=${size}`),
  sendFile: (recipientId, file) => {
    const formData = new FormData();
    formData.append('recipientId', recipientId);
    formData.append('file', file);
    return api.post('/messages/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default api;