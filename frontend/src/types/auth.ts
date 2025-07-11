export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'SERVER_OWNER' | 'USER';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}