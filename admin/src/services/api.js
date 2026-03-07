import axios from 'axios';

const api = axios.create({
  baseURL: 'http://3.25.120.212:5001/api', // 3.25.120.212 for local dev
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

// Scan Entry API
export const approveEntry = async (id, level) => {
  // If no level provided, use generic approval endpoint
  if (!level) {
    const response = await api.put(`/scan-entry/${id}/approve`);
    return response.data;
  }

  // Legacy: level: 'supervisor' (verify), 'center', 'project', 'finance'
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

export const getStats = async () => {
  const response = await api.get('/scan-entry/stats');
  return response.data;
};

// Bulk Upload APIs
export const validateBulkUpload = async (rows) => {
  const response = await api.post('/scan-entry/bulk-validate', { rows });
  return response.data;
};

export const bulkCreateScanEntries = async (rows) => {
  const response = await api.post('/scan-entry/bulk-create', { rows });
  return response.data;
};

export const getBulkUploadHistory = async () => {
  const response = await api.get('/scan-entry/bulk-history');
  return response.data;
};

// --- User Management (Staff) ---
export const getUsers = async (params) => {
  const response = await api.get('/staff', { params });
  return response.data;
};

export const createUser = async (userData) => {
  const isFormData = userData instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
  const response = await api.post('/staff', userData, config);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const isFormData = userData instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
  const response = await api.put(`/staff/${id}`, userData, config);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/staff/${id}`);
  return response.data;
};

// --- Project Management ---
export const getProjects = async () => {
  const response = await api.get('/projects');
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await api.post('/projects', projectData);
  return response.data;
};

export const updateProject = async (id, projectData) => {
  const response = await api.put(`/projects/${id}`, projectData);
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

// --- Center Management ---
export const getCenters = async () => {
  const response = await api.get('/centers');
  return response.data;
};

export const createCenter = async (centerData) => {
  const response = await api.post('/centers', centerData);
  return response.data;
};

export const updateCenter = async (id, centerData) => {
  const response = await api.put(`/centers/${id}`, centerData);
  return response.data;
};

export const deleteCenter = async (id) => {
  const response = await api.delete(`/centers/${id}`);
  return response.data;
};

export default api;
