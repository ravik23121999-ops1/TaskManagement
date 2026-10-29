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

export interface DepartmentMember {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'sub_admin' | 'employee';
  gender?: 'male' | 'female';
  avatar_url?: string;
  is_active: boolean;
  active_tasks_count: number;
  completed_tasks_count: number;
  created_at?: string;
}

export interface DepartmentMembersResponse {
  department: {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    members_count: number;
    tasks_count: number;
  };
  members: DepartmentMember[];
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

  getMembers: async (id: number): Promise<DepartmentMembersResponse> => {
    const response = await apiClient.get(`/departments/${id}/members`);
    return response.data;
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
