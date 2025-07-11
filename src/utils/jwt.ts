import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-development-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class JWTUtils {
  static generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );
  }

  static generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN } as SignOptions
    );
  }

  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  static generateTokenPair(payload: Omit<JwtPayload, 'type'>) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
}