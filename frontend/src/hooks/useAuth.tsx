import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthState, LoginRequest, RegisterRequest } from '../types/auth';
import { apiClient } from '../services/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    isAuthenticated: false,
    isLoading: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await apiClient.getProfile();
          const user = response.data.data || null;
          setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
          }));
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setState(prev => ({
            ...prev,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      setError(null);
      
      const response = await apiClient.login(credentials);
      const { user, accessToken, refreshToken } = response.data.data!;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setState({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      setError(null);
      
      const response = await apiClient.register(data);
      const { user, accessToken, refreshToken } = response.data.data!;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setState({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    // Call logout endpoint in background
    apiClient.logout().catch(() => {
      // Ignore errors on logout
    });
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};