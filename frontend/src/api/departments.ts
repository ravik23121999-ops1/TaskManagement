import apiClient from './client';

export interface Department {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  members_count: number;
  tasks_count: number;
  created_at: string;
}

export interface DepartmentFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export const departmentsApi = {
  list: async (params?: DepartmentFilters) => {
    const response = await apiClient.get('/departments', { params });
    return response.data;
  },

  get: async (id: number): Promise<Department> => {
    const response = await apiClient.get(`/departments/${id}`);
    return response.data.data;
  },

  create: async (data: { name: string; description?: string }): Promise<Department> => {
    const response = await apiClient.post('/departments', data);
    return response.data.data;
  },

  update: async (id: number, data: { name?: string; description?: string }): Promise<Department> => {
    const response = await apiClient.put(`/departments/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/departments/${id}`);
    return response.data;
  },

  activate: async (id: number) => {
    const response = await apiClient.put(`/departments/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: number) => {
    const response = await apiClient.put(`/departments/${id}/deactivate`);
    return response.data;
  },
};
