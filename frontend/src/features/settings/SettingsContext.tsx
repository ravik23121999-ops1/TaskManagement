import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../../api/settings';
import type { SystemSettings } from '../../api/settings';
import { useAuth } from '../auth/AuthContext';

interface SettingsContextType {
  settings: SystemSettings | null;
  enableWorkMessages: boolean;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<SystemSettings>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(() => {
    try {
      const cached = localStorage.getItem('system_settings');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await settingsApi.getSystemSettings();
      if (data?.settings) {
        setSettings(data.settings);
        localStorage.setItem('system_settings', JSON.stringify(data.settings));
      }
    } catch (err) {
      console.error('Failed to load system settings', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    } else {
      setSettings(null);
      localStorage.removeItem('system_settings');
    }
  }, [isAuthenticated, fetchSettings]);

  const updateSettings = async (newSettings: Partial<SystemSettings>): Promise<SystemSettings> => {
    setLoading(true);
    try {
      const res = await settingsApi.updateSystemSettings(newSettings);
      const updated = res.settings;
      setSettings(updated);
      localStorage.setItem('system_settings', JSON.stringify(updated));
      return updated;
    } finally {
      setLoading(false);
    }
  };

  // Defaults to true so messages are available unless explicitly disabled by admin (false)
  const enableWorkMessages = settings?.enable_work_messages !== false;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        enableWorkMessages,
        loading,
        refreshSettings: fetchSettings,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
