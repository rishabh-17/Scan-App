import axios from 'axios';

const api = axios.create({
  baseURL: 'http://ec2-3-25-120-212.ap-southeast-2.compute.amazonaws.com/api', // Use env var later
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

export default api;
