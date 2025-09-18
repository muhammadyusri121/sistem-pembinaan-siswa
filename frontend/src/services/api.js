import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export const authService = {
  login: (nip, password) => {
    const formData = new URLSearchParams();
    formData.append('username', nip);
    formData.append('password', password);
    return apiClient.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  getCurrentUser: () => {
    return apiClient.get('/auth/me');
  },
};

export const dashboardService = {
  getStats: () => {
    return apiClient.get('/dashboard/stats');
  },
};

// Re-export configured client for general API calls
export const profileService = {
  updateProfile: (payload) => apiClient.put('/auth/me/profile', payload),
  updatePassword: (payload) => apiClient.put('/auth/me/password', payload),
};

export { apiClient };
