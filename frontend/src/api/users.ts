import apiClient from './client';
import type { User } from './auth';

export interface UserFilters {
  search?: string;
  role?: string;
  department_id?: string | number;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export const usersApi = {
  list: async (params?: UserFilters) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  get: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: any): Promise<User> => {
    const response = await apiClient.post('/users', data);
    return response.data.data;
  },

  update: async (id: number, data: any): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  activate: async (id: number) => {
    const response = await apiClient.put(`/users/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: number) => {
    const response = await apiClient.put(`/users/${id}/deactivate`);
    return response.data;
  },
};
