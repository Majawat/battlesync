import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { JWTUtils } from '../utils/jwt';
import { ValidationUtils, authSchemas } from '../utils/validation';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  LoginResponse
} from '../types/auth';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const data = ValidationUtils.validateAndThrow<RegisterRequest>(
        authSchemas.register,
        req.body
      );

      const user = await UserService.createUser(data);

      // Generate JWT tokens
      const { accessToken, refreshToken } = JWTUtils.generateTokenPair({
        userId: user.id,
        username: user.username,
        role: user.role
      });

      const response: LoginResponse = {
        user,
        accessToken,
        refreshToken
      };

      logger.info(`User registered: ${user.username} (${user.role})`);

      res.status(201).json({
        status: 'success',
        data: response,
        message: 'User registered successfully'
      });
    } catch (error) {
      logger.error('Registration error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Registration failed';
      const validationErrors = (error as any).validationErrors;

      res.status(statusCode).json({
        status: 'error',
        message,
        ...(validationErrors && { errors: validationErrors })
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = ValidationUtils.validateAndThrow<LoginRequest>(
        authSchemas.login,
        req.body
      );

      const user = await UserService.authenticateUser(data);

      // Generate JWT tokens
      const { accessToken, refreshToken } = JWTUtils.generateTokenPair({
        userId: user.id,
        username: user.username,
        role: user.role
      });

      const response: LoginResponse = {
        user,
        accessToken,
        refreshToken
      };

      logger.info(`User logged in: ${user.username}`);

      res.json({
        status: 'success',
        data: response,
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Login error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Login failed';
      const validationErrors = (error as any).validationErrors;

      res.status(statusCode).json({
        status: 'error',
        message,
        ...(validationErrors && { errors: validationErrors })
      });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const data = ValidationUtils.validateAndThrow<RefreshTokenRequest>(
        authSchemas.refreshToken,
        req.body
      );

      const payload = JWTUtils.verifyToken(data.refreshToken);

      if (payload.type !== 'refresh') {
        throw ValidationUtils.createError('Invalid refresh token', 401);
      }

      // Verify user still exists and is active
      const user = await UserService.getUserById(payload.userId);
      if (!user || !user.isActive) {
        throw ValidationUtils.createError('User not found or inactive', 401);
      }

      // Generate new access token
      const accessToken = JWTUtils.generateAccessToken({
        userId: user.id,
        username: user.username,
        role: user.role
      });

      res.json({
        status: 'success',
        data: { accessToken },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      logger.error('Token refresh error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Token refresh failed';

      res.status(statusCode).json({
        status: 'error',
        message
      });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      res.json({
        status: 'success',
        data: user
      });
    } catch (error) {
      logger.error('Get profile error:', error);

      res.status(500).json({
        status: 'error',
        message: 'Failed to get profile'
      });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const data = ValidationUtils.validateAndThrow<UpdateProfileRequest>(
        authSchemas.updateProfile,
        req.body
      );

      const user = await UserService.updateProfile(authReq.user.id, data);

      logger.info(`Profile updated: ${user.username}`);

      res.json({
        status: 'success',
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Update profile error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Profile update failed';
      const validationErrors = (error as any).validationErrors;

      res.status(statusCode).json({
        status: 'error',
        message,
        ...(validationErrors && { errors: validationErrors })
      });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const data = ValidationUtils.validateAndThrow<ChangePasswordRequest>(
        authSchemas.changePassword,
        req.body
      );

      await UserService.changePassword(
        authReq.user.id,
        data.currentPassword,
        data.newPassword
      );

      logger.info(`Password changed: ${authReq.user.username}`);

      res.json({
        status: 'success',
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Password change failed';
      const validationErrors = (error as any).validationErrors;

      res.status(statusCode).json({
        status: 'error',
        message,
        ...(validationErrors && { errors: validationErrors })
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      // For JWT, logout is handled client-side by removing tokens
      // In a more complex system, you might maintain a token blacklist
      
      const authReq = req as AuthenticatedRequest;
      logger.info(`User logged out: ${authReq.user.username}`);

      res.json({
        status: 'success',
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);

      res.status(500).json({
        status: 'error',
        message: 'Logout failed'
      });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;

      // Prevent server owner from deleting their account if they're the only one
      if (authReq.user.role === 'SERVER_OWNER') {
        const serverOwners = await UserService.getAllUsers();
        const activeOwners = serverOwners.filter(u => u.role === 'SERVER_OWNER');
        
        if (activeOwners.length === 1) {
          throw ValidationUtils.createError(
            'Cannot delete the only server owner account',
            400
          );
        }
      }

      await UserService.deactivateUser(authReq.user.id);

      logger.info(`Account deactivated: ${authReq.user.username}`);

      res.json({
        status: 'success',
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      logger.error('Delete account error:', error);

      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Account deletion failed';

      res.status(statusCode).json({
        status: 'error',
        message
      });
    }
  }
}