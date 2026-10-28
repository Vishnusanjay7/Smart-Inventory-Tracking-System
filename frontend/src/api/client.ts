import axios from 'axios';
import {
  User,
  Category,
  Rack,
  Product,
  RFIDTag,
  InventoryItem,
  InventoryTransaction,
  RFIDEvent,
  Device,
  Alert,
  AnalyticsSummary,
  TransactionType
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('smartrack_token');
      localStorage.removeItem('smartrack_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  // Products
  getProducts: async (params?: { search?: string; category_id?: number; rack_id?: number; stock_status?: string }): Promise<Product[]> => {
    const res = await apiClient.get('/products', { params });
    return res.data;
  },
  getProduct: async (id: number): Promise<Product> => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  },
  createProduct: async (data: Partial<Product> & { rfid_uid?: string; initial_quantity?: number; rack_code?: string }): Promise<Product> => {
    const res = await apiClient.post('/products', data);
    return res.data;
  },
  updateProduct: async (id: number, data: Partial<Product>): Promise<Product> => {
    const res = await apiClient.put(`/products/${id}`, data);
    return res.data;
  },
  assignRfid: async (productId: number, rfidUid: string): Promise<RFIDTag> => {
    const res = await apiClient.post(`/products/${productId}/assign-rfid`, { rfid_uid: rfidUid });
    return res.data;
  },
  reassignRfid: async (productId: number, rfidUid: string): Promise<RFIDTag> => {
    const res = await apiClient.post(`/products/${productId}/reassign-rfid`, { rfid_uid: rfidUid, confirm: true });
    return res.data;
  },
  unassignRfid: async (productId: number): Promise<void> => {
    await apiClient.post(`/products/${productId}/unassign-rfid`);
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const res = await apiClient.get('/categories');
    return res.data;
  },
  createCategory: async (data: { name: string; description?: string }): Promise<Category> => {
    const res = await apiClient.post('/categories', data);
    return res.data;
  },

  // Racks
  getRacks: async (): Promise<Rack[]> => {
    const res = await apiClient.get('/racks');
    return res.data;
  },
  getRackDetails: async (rackCode: string) => {
    const res = await apiClient.get(`/racks/${rackCode}/details`);
    return res.data;
  },

  // Inventory
  getInventory: async (params?: { search?: string; category_id?: number; rack_id?: number; stock_status?: string }): Promise<InventoryItem[]> => {
    const res = await apiClient.get('/inventory', { params });
    return res.data;
  },
  performOperation: async (productId: number, data: { type: TransactionType; quantity: number; reason?: string; rack_code?: string; idempotency_key?: string }): Promise<InventoryTransaction> => {
    const res = await apiClient.post(`/inventory/${productId}/operation`, data);
    return res.data;
  },

  // Transactions
  getTransactions: async (params?: { product_id?: number; rack_id?: number; type?: string; user_id?: number }): Promise<InventoryTransaction[]> => {
    const res = await apiClient.get('/transactions', { params });
    return res.data;
  },

  // RFID
  getTags: async (): Promise<RFIDTag[]> => {
    const res = await apiClient.get('/rfid/tags');
    return res.data;
  },
  getTagByUid: async (uid: string): Promise<RFIDTag> => {
    const res = await apiClient.get(`/rfid/tags/${uid}`);
    return res.data;
  },
  getEvents: async (params?: { uid?: string; device_id?: string }): Promise<RFIDEvent[]> => {
    const res = await apiClient.get('/rfid/events', { params });
    return res.data;
  },

  // Devices
  getDevices: async (): Promise<Device[]> => {
    const res = await apiClient.get('/devices');
    return res.data;
  },

  // Alerts
  getAlerts: async (params?: { status?: string; severity?: string }): Promise<Alert[]> => {
    const res = await apiClient.get('/alerts', { params });
    return res.data;
  },
  resolveAlert: async (id: number, reason?: string): Promise<Alert> => {
    const res = await apiClient.post(`/alerts/${id}/resolve`, { reason });
    return res.data;
  },

  // Analytics
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const res = await apiClient.get('/analytics/summary');
    return res.data;
  },

  // Simulator
  simulateScan: async (data: { rfid_uid: string; device_id?: string; reader_id?: string; rack_code?: string }) => {
    const res = await apiClient.post('/simulator/scan', data);
    return res.data;
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await apiClient.get('/users');
    return res.data;
  },
  createUser: async (data: any): Promise<User> => {
    const res = await apiClient.post('/users', data);
    return res.data;
  },
  updateUser: async (id: number, data: any): Promise<User> => {
    const res = await apiClient.put(`/users/${id}`, data);
    return res.data;
  },
  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
