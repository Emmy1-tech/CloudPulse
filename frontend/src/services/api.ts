import axios from 'axios';
import { Endpoint, EndpointCreate, MonitoringResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const endpointsApi = {
  list: async (): Promise<Endpoint[]> => {
    const response = await api.get('/api/endpoints/');
    return response.data;
  },

  create: async (data: EndpointCreate): Promise<Endpoint> => {
    const response = await api.post('/api/endpoints/', data);
    return response.data;
  },

  get: async (id: number): Promise<Endpoint> => {
    const response = await api.get(`/api/endpoints/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<EndpointCreate>): Promise<Endpoint> => {
    const response = await api.put(`/api/endpoints/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/endpoints/${id}`);
  },

  check: async (id: number, forceStatus?: 'success' | 'failure'): Promise<MonitoringResult> => {
    const params = forceStatus ? `?force_status=${forceStatus}` : '';
    const response = await api.post(`/api/endpoints/${id}/check${params}`);
    return response.data;
  },

  getResults: async (id: number, limit: number = 50): Promise<MonitoringResult[]> => {
    const response = await api.get(`/api/endpoints/${id}/results?limit=${limit}`);
    return response.data;
  },
};

export default api;
