export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  user: UserPublic;
  accessToken: string;
  refreshToken: string;
}

export interface UserPublic {
  id: string;
  username: string;
  email?: string;
  role: 'SERVER_OWNER' | 'USER';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: 'SERVER_OWNER' | 'USER';
  type: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  user: UserPublic;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  email?: string;
  armyForgeToken?: string;
}