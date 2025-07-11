import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { UserPublic } from '../types/auth';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user: UserPublic;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }

    const payload = JWTUtils.verifyToken(token);
    
    if (payload.type !== 'access') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token type'
      });
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found or inactive'
      });
    }

    // Attach user to request with proper type conversion
    (req as AuthenticatedRequest).user = {
      id: user.id,
      username: user.username,
      email: user.email || undefined,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || undefined
    };
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    return res.status(401).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
};

export const requireRole = (requiredRole: 'SERVER_OWNER' | 'USER') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (requiredRole === 'SERVER_OWNER' && authReq.user.role !== 'SERVER_OWNER') {
      return res.status(403).json({
        status: 'error',
        message: 'Server owner permissions required'
      });
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return next();
    }

    const payload = JWTUtils.verifyToken(token);
    
    if (payload.type !== 'access') {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true
      }
    });

    if (user && user.isActive) {
      (req as AuthenticatedRequest).user = {
        id: user.id,
        username: user.username,
        email: user.email || undefined,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || undefined
      };
    }

    next();
  } catch (error) {
    // Silently continue without auth for optional auth
    next();
  }
};