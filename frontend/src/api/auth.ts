import apiClient from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'sub_admin' | 'employee';
  department_id: number | null;
  department?: {
    id: number;
    name: string;
  };
  is_active: boolean;
  gender?: 'male' | 'female';
  avatar_type?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/profile');
    return response.data.data;
  },

  updateProfile: async (data: { name: string; department_id?: number | null }): Promise<User> => {
    const response = await apiClient.put('/profile', data);
    return response.data.data;
  },

  updatePassword: async (data: { current_password: string; password: string; password_confirmation: string }): Promise<void> => {
    await apiClient.put('/profile/password', data);
  },

  updateAvatar: async (data: { gender?: 'male' | 'female'; photo?: File }): Promise<User> => {
    if (data.photo) {
      const formData = new FormData();
      formData.append('photo', data.photo);
      const res = await apiClient.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    } else {
      const res = await apiClient.post('/profile/avatar', { gender: data.gender });
      return res.data.data;
    }
  },
};

export type { User as UserType };
