import { prisma } from '../utils/database';
import { CryptoUtils } from '../utils/crypto';
import { UserPublic, RegisterRequest, LoginRequest } from '../types/auth';
import { ValidationUtils } from '../utils/validation';

// Utility function to convert database user to UserPublic
const toUserPublic = (user: any): UserPublic => ({
  id: user.id,
  username: user.username,
  email: user.email || undefined,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin || undefined
});

export class UserService {
  static async createUser(data: RegisterRequest): Promise<UserPublic> {
    try {
      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: data.username }
      });

      if (existingUser) {
        throw ValidationUtils.createError('Username already exists', 409);
      }

      // Check if email already exists (if provided)
      if (data.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: data.email }
        });

        if (existingEmail) {
          throw ValidationUtils.createError('Email already exists', 409);
        }
      }

      // Hash password
      const passwordHash = await CryptoUtils.hashPassword(data.password);

      // New users are always USER role (SERVER_OWNER is set manually in seed)
      const role = 'USER';

      // Create user
      const user = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email || null,
          passwordHash,
          role,
          isActive: true
        },
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

      return toUserPublic(user);
    } catch (error) {
      console.error('UserService.createUser error:', error);
      throw error;
    }
  }

  static async authenticateUser(data: LoginRequest): Promise<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { username: data.username }
    });

    if (!user) {
      throw ValidationUtils.createError('Invalid username or password', 401);
    }

    if (!user.isActive) {
      throw ValidationUtils.createError('Account is deactivated', 401);
    }

    const isValidPassword = await CryptoUtils.comparePassword(
      data.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw ValidationUtils.createError('Invalid username or password', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return toUserPublic({
      ...user,
      lastLogin: new Date()
    });
  }

  static async getUserById(id: string): Promise<UserPublic | null> {
    const user = await prisma.user.findUnique({
      where: { id },
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

    return user ? toUserPublic(user) : null;
  }

  static async updateProfile(
    userId: string,
    data: { email?: string; armyForgeToken?: string }
  ): Promise<UserPublic> {
    // Check if email is being changed and already exists
    if (data.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId }
        }
      });

      if (existingEmail) {
        throw ValidationUtils.createError('Email already exists', 409);
      }
    }

    // Encrypt ArmyForge token if provided
    let encryptedToken: string | null | undefined;
    if (data.armyForgeToken !== undefined) {
      encryptedToken = data.armyForgeToken 
        ? CryptoUtils.encryptToken(data.armyForgeToken)
        : null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.email !== undefined && { email: data.email || null }),
        ...(encryptedToken !== undefined && { armyForgeToken: encryptedToken })
      },
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

    return toUserPublic(user);
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw ValidationUtils.createError('User not found', 404);
    }

    const isValidPassword = await CryptoUtils.comparePassword(
      currentPassword,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw ValidationUtils.createError('Current password is incorrect', 400);
    }

    const newPasswordHash = await CryptoUtils.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });
  }

  static async deactivateUser(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });
  }

  static async getUserArmyForgeToken(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { armyForgeToken: true }
    });

    if (!user?.armyForgeToken) {
      return null;
    }

    return CryptoUtils.decryptToken(user.armyForgeToken);
  }

  static async getAllUsers(includeInactive = false): Promise<UserPublic[]> {
    const users = await prisma.user.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(toUserPublic);
  }
}

export const userService = new UserService();
