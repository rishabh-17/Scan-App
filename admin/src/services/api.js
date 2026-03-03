import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001/api', // Changed to localhost for local dev
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const approveEntry = async (id, level) => {
  // level: 'supervisor' (verify), 'center', 'project', 'finance'
  let endpoint = '';
  if (level === 'supervisor') endpoint = 'verify';
  else endpoint = `approve-${level}`;

  const response = await api.put(`/scan-entry/${id}/${endpoint}`);
  return response.data;
};

export const rejectEntry = async (id, reason) => {
  const response = await api.put(`/scan-entry/${id}/reject`, { reason });
  return response.data;
};

export const getPendingEntries = async (type) => {
  const response = await api.get(`/scan-entry/pending${type ? `?type=${type}` : ''}`);
  return response.data;
};

export default api;
