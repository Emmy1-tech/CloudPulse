import axios from 'axios';
import { demoApi } from './demoApi';
import { Endpoint, EndpointCreate, EndpointStats, EndpointUpdate, Incident, MonitoringResult } from '../types';

// Same-origin /api requests are proxied by Vite in local/Compose development.
// Set VITE_API_URL only when the API is intentionally hosted separately.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const backendEndpointsApi = {
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

  update: async (id: number, data: EndpointUpdate): Promise<Endpoint> => {
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

  getIncidents: async (id: number): Promise<Incident[]> => {
    const response = await api.get(`/api/endpoints/${id}/incidents`);
    return response.data;
  },

  updateIncident: async (id: number, status: 'acknowledged' | 'resolved'): Promise<Incident> => {
    const response = await api.put(`/api/endpoints/incidents/${id}`, { status });
    return response.data;
  },

  getStats: async (id: number): Promise<EndpointStats> => {
    const response = await api.get(`/api/endpoints/${id}/stats`);
    return response.data;
  },
};


export const endpointsApi = import.meta.env.VITE_DEMO_MODE === 'true' ? demoApi : backendEndpointsApi

export default api;
