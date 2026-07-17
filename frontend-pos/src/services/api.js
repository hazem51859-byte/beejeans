import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        useAuthStore.getState().setAuth(
          useAuthStore.getState().user,
          accessToken,
          newRefreshToken
        );

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Product API
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  search: (query) => api.get('/products/search', { params: { q: query } }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Sale API
export const saleAPI = {
  create: (data) => api.post('/sales', data),
  getById: (id) => api.get(`/sales/${id}`),
  getByInvoice: (invoiceNumber) => api.get(`/sales/invoice/${invoiceNumber}`),
  getByBranch: (branchId, params) => api.get(`/sales/branch/${branchId}`, { params }),
  getByShift: (shiftId) => api.get(`/sales/shift/${shiftId}`),
  refund: (id, data) => api.put(`/sales/${id}/refund`, data),
};

// Shift API
export const shiftAPI = {
  open: (data) => api.post('/shifts/open', data),
  close: (id, data) => api.post(`/shifts/${id}/close`, data),
  getCurrent: () => api.get('/shifts/current'),
  getById: (id) => api.get(`/shifts/${id}`),
  getByBranch: (branchId, params) => api.get(`/shifts/branch/${branchId}`, { params }),
};

// Inventory API
export const inventoryAPI = {
  getByBranch: (branchId, params) => api.get(`/inventory/branch/${branchId}`, { params }),
  getByProduct: (productId) => api.get(`/inventory/product/${productId}`),
  getLowStock: (branchId) => api.get(`/inventory/low-stock/${branchId}`),
  adjust: (id, data) => api.put(`/inventory/${id}/adjust`, data),
};

// Report API
export const reportAPI = {
  getDaily: (branchId, params) => api.get(`/reports/daily/${branchId}`, { params }),
  getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
  getCashierPerformance: (cashierId, params) => 
    api.get(`/reports/cashier-performance/${cashierId}`, { params }),
  getTopProducts: (branchId, params) => 
    api.get(`/reports/top-products/${branchId}`, { params }),
  getInventoryStatus: (branchId) => api.get(`/reports/inventory-status/${branchId}`),
};

// Branch API
export const branchAPI = {
  getAll: () => api.get('/branches'),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

// User API
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export default api;
