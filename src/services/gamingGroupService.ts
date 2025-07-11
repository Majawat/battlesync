import { PrismaClient } from '@prisma/client';
import { CryptoUtils } from '../utils/crypto';
import { ValidationUtils } from '../utils/validation';
import { GamingGroupData, CreateGamingGroupRequest, JoinGroupRequest } from '../types/gamingGroup';
import { NotificationService } from './notificationService';

const prisma = new PrismaClient();

export class GamingGroupService {
  static async createGroup(ownerId: string, data: CreateGamingGroupRequest): Promise<GamingGroupData> {
    // Validate input
    if (!data.name) {
      throw ValidationUtils.createError('Group name is required', 400);
    }
    if (data.name.length < 3 || data.name.length > 50) {
      throw ValidationUtils.createError('Group name must be between 3 and 50 characters', 400);
    }
    
    if (data.description && data.description.length > 500) {
      throw ValidationUtils.createError('Description must be less than 500 characters', 400);
    }

    // Generate unique invite code
    const inviteCode = CryptoUtils.generateInviteCode();

    try {
      const group = await prisma.gamingGroup.create({
        data: {
          name: data.name,
          description: data.description,
          ownerId,
          inviteCode,
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              campaigns: true,
              memberships: true,
            },
          },
        },
      });

      const groupData = this.toGamingGroupData(group);
      
      // Send notification about new group creation (optional, as it's only one user initially)
      await NotificationService.notifySuccess(ownerId, 'Group Created', `Gaming group "${groupData.name}" created successfully`);
      
      return groupData;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw ValidationUtils.createError('A group with this name already exists', 409);
      }
      throw error;
    }
  }

  static async joinGroup(userId: string, data: JoinGroupRequest): Promise<GamingGroupData> {
    if (!data.inviteCode) {
      throw ValidationUtils.createError('Invite code is required', 400);
    }
    if (data.inviteCode.length !== 8) {
      throw ValidationUtils.createError('Invalid invite code format', 400);
    }

    // Find the group by invite code
    const group = await prisma.gamingGroup.findUnique({
      where: { inviteCode: data.inviteCode },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            campaigns: true,
            memberships: true,
          },
        },
      },
    });

    if (!group) {
      throw ValidationUtils.createError('Invalid invite code', 404);
    }

    if (!group.isActive) {
      throw ValidationUtils.createError('This gaming group is no longer active', 403);
    }

    // Check if user is already a member
    const existingMembership = group.memberships.find(m => m.userId === userId);
    if (existingMembership) {
      throw ValidationUtils.createError('You are already a member of this group', 409);
    }

    // Check if user is the owner
    if (group.ownerId === userId) {
      throw ValidationUtils.createError('You cannot join your own group', 409);
    }

    // Note: No member limit enforced - groups can grow organically

    try {
      // Add user to the group
      await prisma.groupMembership.create({
        data: {
          userId,
          groupId: group.id,
          role: 'MEMBER',
        },
      });

      // Fetch updated group data
      const updatedGroup = await prisma.gamingGroup.findUnique({
        where: { id: group.id },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              campaigns: true,
              memberships: true,
            },
          },
        },
      });

      const groupData = this.toGamingGroupData(updatedGroup!);
      
      // Get username for notification
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      
      // Notify group members about new member
      if (user) {
        await NotificationService.notifyUserJoinedGroup(group.id, user.username);
      }
      
      return groupData;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw ValidationUtils.createError('You are already a member of this group', 409);
      }
      throw error;
    }
  }

  static async getUserGroups(userId: string): Promise<GamingGroupData[]> {
    const groups = await prisma.gamingGroup.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { memberships: { some: { userId } } },
        ],
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            campaigns: true,
            memberships: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return groups.map(group => this.toGamingGroupData(group));
  }

  static async getGroupById(groupId: string, userId: string): Promise<GamingGroupData> {
    const group = await prisma.gamingGroup.findFirst({
      where: {
        id: groupId,
        OR: [
          { ownerId: userId },
          { memberships: { some: { userId } } },
        ],
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            campaigns: true,
            memberships: true,
          },
        },
      },
    });

    if (!group) {
      throw ValidationUtils.createError('Gaming group not found', 404);
    }

    return this.toGamingGroupData(group);
  }

  static async updateGroup(groupId: string, userId: string, data: Partial<CreateGamingGroupRequest>): Promise<GamingGroupData> {
    // Verify user is the owner
    const group = await prisma.gamingGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId,
        isActive: true,
      },
    });

    if (!group) {
      throw ValidationUtils.createError('Gaming group not found or you do not have permission to update it', 404);
    }

    // Validate input
    if (data.name && (data.name.length < 3 || data.name.length > 50)) {
      throw ValidationUtils.createError('Group name must be between 3 and 50 characters', 400);
    }
    
    if (data.description && data.description.length > 500) {
      throw ValidationUtils.createError('Description must be less than 500 characters', 400);
    }

    const updatedGroup = await prisma.gamingGroup.update({
      where: { id: groupId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            campaigns: true,
            memberships: true,
          },
        },
      },
    });

    return this.toGamingGroupData(updatedGroup);
  }

  static async leaveGroup(groupId: string, userId: string): Promise<void> {
    // Check if user is the owner
    const group = await prisma.gamingGroup.findUnique({
      where: { id: groupId },
      include: {
        memberships: true,
      },
    });

    if (!group) {
      throw ValidationUtils.createError('Gaming group not found', 404);
    }

    if (group.ownerId === userId) {
      throw ValidationUtils.createError('Group owners cannot leave their own group. Transfer ownership or delete the group instead.', 403);
    }

    // Remove membership
    const membership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    if (!membership) {
      throw ValidationUtils.createError('You are not a member of this group', 404);
    }

    await prisma.groupMembership.delete({
      where: { id: membership.id },
    });
  }

  static async deleteGroup(groupId: string, userId: string): Promise<void> {
    // Verify user is the owner
    const group = await prisma.gamingGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId,
        isActive: true,
      },
    });

    if (!group) {
      throw ValidationUtils.createError('Gaming group not found or you do not have permission to delete it', 404);
    }

    // Soft delete the group
    await prisma.gamingGroup.update({
      where: { id: groupId },
      data: { isActive: false },
    });
  }

  static async regenerateInviteCode(groupId: string, userId: string): Promise<string> {
    // Verify user is the owner
    const group = await prisma.gamingGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId,
        isActive: true,
      },
    });

    if (!group) {
      throw ValidationUtils.createError('Gaming group not found or you do not have permission to regenerate invite code', 404);
    }

    const newInviteCode = CryptoUtils.generateInviteCode();

    await prisma.gamingGroup.update({
      where: { id: groupId },
      data: { inviteCode: newInviteCode },
    });

    return newInviteCode;
  }

  private static toGamingGroupData(group: any): GamingGroupData {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      owner: {
        id: group.owner.id,
        username: group.owner.username,
        email: group.owner.email,
      },
      inviteCode: group.inviteCode,
      members: group.memberships.map((membership: any) => ({
        id: membership.user.id,
        username: membership.user.username,
        email: membership.user.email,
        role: membership.role,
        joinedAt: membership.joinedAt,
      })),
      campaignCount: group._count.campaigns,
      memberCount: group._count.memberships,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }
}