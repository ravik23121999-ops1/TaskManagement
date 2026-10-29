import apiClient from './client';

export interface SystemSettings {
  allow_subadmin_delete_records: boolean;
  allow_subadmin_cancel_tasks: boolean;
}

export interface UserCapabilities {
  role: string;
  can_delete_records: boolean;
  can_cancel_tasks: boolean;
}

export interface SystemSettingsResponse {
  settings: SystemSettings;
  user_capabilities: UserCapabilities;
}

export const settingsApi = {
  getSystemSettings: async (): Promise<SystemSettingsResponse> => {
    const response = await apiClient.get('/settings/system');
    return response.data;
  },

  updateSystemSettings: async (
    settings: Partial<SystemSettings>
  ): Promise<{ message: string; settings: SystemSettings }> => {
    const response = await apiClient.put('/settings/system', settings);
    return response.data;
  },
};
