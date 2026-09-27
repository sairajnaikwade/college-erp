import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';
import type { User, UserRole, ApiResponse, LoginResponseData } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, role?: UserRole) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('erp_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser) as User;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('erp_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to enrich user profile with role-scoped endpoints (/api/students/me or /api/staff/me)
  const enrichProfile = async (baseUser: User): Promise<User> => {
    try {
      if (baseUser.role === 'STUDENT') {
        const studentRes = await apiClient.get<ApiResponse<any>>('/students/me');
        if (studentRes.data?.data) {
          return {
            ...baseUser,
            ...studentRes.data.data,
          };
        }
      } else if (baseUser.role === 'STAFF') {
        const staffRes = await apiClient.get<ApiResponse<any>>('/staff/me');
        if (staffRes.data?.data) {
          return {
            ...baseUser,
            ...staffRes.data.data,
          };
        }
      }
    } catch (_err) {
      // If scoped endpoint is temporarily unavailable, gracefully retain baseUser
    }
    return baseUser;
  };

  // Sync user profile on mount if token exists
  const refreshUser = async () => {
    const storedToken = sessionStorage.getItem('erp_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (response.data && response.data.data) {
        const enriched = await enrichProfile(response.data.data);
        setUser(enriched);
        sessionStorage.setItem('erp_user', JSON.stringify(enriched));
      }
    } catch (_error) {
      // Invalid token or session expired
      setUser(null);
      setToken(null);
      sessionStorage.removeItem('erp_token');
      sessionStorage.removeItem('erp_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, password: string, role?: UserRole): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', {
        identifier,
        password,
        role,
      });

      const { token: receivedToken, user: receivedUser } = response.data.data;

      // Set token in sessionStorage and state so enrichProfile request succeeds
      sessionStorage.setItem('erp_token', receivedToken);
      setToken(receivedToken);

      const enriched = await enrichProfile(receivedUser);

      setUser(enriched);
      sessionStorage.setItem('erp_user', JSON.stringify(enriched));

      return enriched;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (_err) {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      sessionStorage.removeItem('erp_token');
      sessionStorage.removeItem('erp_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
