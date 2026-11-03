import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../../api/auth';
import type { User } from '../../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  impersonator: User | null;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  impersonateUser: (userId: number) => Promise<void>;
  stopImpersonating: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [impersonator, setImpersonator] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('impersonator_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Zero-flicker: if token & user are already in localStorage, don't flash a full-page loading screen
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cachedToken = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');
    return !(cachedToken && cachedUser);
  });

  useEffect(() => {
    if (token) {
      authApi.me()
        .then((userData) => {
          setUser((prev) => {
            // Keep identical reference if user data hasn't changed to prevent unnecessary downstream re-renders
            if (prev && JSON.stringify(prev) === JSON.stringify(userData)) {
              return prev;
            }
            return userData;
          });
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    authApi.logout().catch(console.error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('impersonator_token');
    localStorage.removeItem('impersonator_user');
    setToken(null);
    setUser(null);
    setImpersonator(null);
  };

  const impersonateUser = async (userId: number) => {
    const currentToken = localStorage.getItem('token') || token;
    const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : user;

    const res = await authApi.impersonate(userId);

    if (!localStorage.getItem('impersonator_token')) {
      if (currentToken) localStorage.setItem('impersonator_token', currentToken);
      if (currentUser) localStorage.setItem('impersonator_user', JSON.stringify(currentUser));
      setImpersonator(currentUser);
    }

    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const stopImpersonating = () => {
    const origToken = localStorage.getItem('impersonator_token');
    const origUser = localStorage.getItem('impersonator_user');

    if (origToken && origUser) {
      localStorage.setItem('token', origToken);
      localStorage.setItem('user', origUser);
      localStorage.removeItem('impersonator_token');
      localStorage.removeItem('impersonator_user');

      setToken(origToken);
      try {
        setUser(JSON.parse(origUser));
      } catch {
        setUser(null);
      }
      setImpersonator(null);
    }
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem('user', JSON.stringify(merged));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        impersonator,
        isImpersonating: !!impersonator,
        login,
        logout,
        impersonateUser,
        stopImpersonating,
        updateUser,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
