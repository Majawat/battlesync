import { PrismaClient } from '@prisma/client';
import { ValidationUtils } from '../utils/validation';

const prisma = new PrismaClient();

export interface InviteGroupMemberRequest {
  username: string;
  role?: 'ADMIN' | 'MEMBER';
}

export interface UpdateGroupMemberRequest {
  role?: 'ADMIN' | 'MEMBER';
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface GroupMemberDetailed {
  id: string;
  userId: string;
  username: string;
  email: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REMOVED';
  joinedAt: Date;
  invitedBy?: string;
  invitedAt?: Date;
  campaignCount: number;
  totalBattles: number;
}

export class GroupMembershipService {
  
  /**
   * Get detailed group members list
   */
  static async getGroupMembers(groupId: string, requesterId: string): Promise<GroupMemberDetailed[]> {
    // Verify requester has access to group
    await this.validateGroupAccess(groupId, requesterId);

    const memberships = await prisma.groupMembership.findMany({
      where: { 
        groupId,
        status: { in: ['PENDING', 'ACTIVE', 'INACTIVE'] }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        campaignParticipations: {
          select: {
            id: true,
            campaign: {
              select: {
                id: true
              }
            }
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: 'asc' }
      ]
    });

    return memberships.map(membership => ({
      id: membership.id,
      userId: membership.userId,
      username: membership.user.username,
      email: membership.user.email,
      role: membership.role as 'OWNER' | 'ADMIN' | 'MEMBER',
      status: membership.status as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REMOVED',
      joinedAt: membership.joinedAt,
      invitedBy: membership.invitedBy || undefined,
      invitedAt: membership.invitedAt || undefined,
      campaignCount: new Set(membership.campaignParticipations.map(p => p.campaign.id)).size,
      totalBattles: 0 // TODO: Calculate from battle participations
    }));
  }

  /**
   * Invite a user to group by username
   */
  static async inviteMemberToGroup(
    groupId: string, 
    requesterId: string, 
    data: InviteGroupMemberRequest
  ): Promise<GroupMemberDetailed> {
    // Verify requester can manage group
    await this.validateGroupManageAccess(groupId, requesterId);

    // Find user to invite
    const userToInvite = await prisma.user.findUnique({
      where: { username: data.username },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true
      }
    });

    if (!userToInvite) {
      throw ValidationUtils.createError(`User '${data.username}' not found`, 404);
    }

    if (!userToInvite.isActive) {
      throw ValidationUtils.createError('Cannot invite inactive user', 400);
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        userId: userToInvite.id,
        status: { in: ['PENDING', 'ACTIVE', 'INACTIVE'] }
      }
    });

    if (existingMembership) {
      throw ValidationUtils.createError('User is already a member or has a pending invitation', 409);
    }

    // Create membership with PENDING status
    const membership = await prisma.groupMembership.create({
      data: {
        userId: userToInvite.id,
        groupId,
        role: data.role || 'MEMBER',
        status: 'PENDING',
        invitedBy: requesterId,
        invitedAt: new Date()
      }
    });

    return {
      id: membership.id,
      userId: userToInvite.id,
      username: userToInvite.username,
      email: userToInvite.email,
      role: membership.role as 'OWNER' | 'ADMIN' | 'MEMBER',
      status: 'PENDING',
      joinedAt: membership.joinedAt,
      invitedBy: requesterId,
      invitedAt: membership.invitedAt || undefined,
      campaignCount: 0,
      totalBattles: 0
    };
  }

  /**
   * Accept group invitation
   */
  static async acceptGroupInvitation(groupId: string, userId: string): Promise<void> {
    const membership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        userId,
        status: 'PENDING'
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('No pending invitation found', 404);
    }

    await prisma.groupMembership.update({
      where: { id: membership.id },
      data: {
        status: 'ACTIVE',
        joinedAt: new Date() // Update join date to acceptance time
      }
    });
  }

  /**
   * Update member role or status
   */
  static async updateGroupMember(
    groupId: string,
    membershipId: string,
    requesterId: string,
    data: UpdateGroupMemberRequest
  ): Promise<GroupMemberDetailed> {
    // Verify requester can manage group
    await this.validateGroupManageAccess(groupId, requesterId);

    const membership = await prisma.groupMembership.findFirst({
      where: {
        id: membershipId,
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('Member not found', 404);
    }

    // Cannot change owner role
    if (membership.role === 'OWNER') {
      throw ValidationUtils.createError('Cannot modify group owner', 403);
    }

    // Update membership
    const updatedMembership = await prisma.groupMembership.update({
      where: { id: membershipId },
      data: {
        ...(data.role && { role: data.role }),
        ...(data.status && { status: data.status })
      }
    });

    return {
      id: updatedMembership.id,
      userId: membership.user.id,
      username: membership.user.username,
      email: membership.user.email,
      role: updatedMembership.role as 'OWNER' | 'ADMIN' | 'MEMBER',
      status: updatedMembership.status as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REMOVED',
      joinedAt: updatedMembership.joinedAt,
      invitedBy: updatedMembership.invitedBy || undefined,
      invitedAt: updatedMembership.invitedAt || undefined,
      campaignCount: 0, // TODO: Calculate
      totalBattles: 0 // TODO: Calculate
    };
  }

  /**
   * Remove member from group
   */
  static async removeGroupMember(
    groupId: string,
    membershipId: string,
    requesterId: string
  ): Promise<void> {
    // Verify requester can manage group
    await this.validateGroupManageAccess(groupId, requesterId);

    const membership = await prisma.groupMembership.findFirst({
      where: {
        id: membershipId,
        groupId
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('Member not found', 404);
    }

    // Cannot remove owner
    if (membership.role === 'OWNER') {
      throw ValidationUtils.createError('Cannot remove group owner', 403);
    }

    // Mark as removed instead of deleting to preserve history
    await prisma.groupMembership.update({
      where: { id: membershipId },
      data: { status: 'REMOVED' }
    });
  }

  /**
   * Get available group members for campaign participation
   */
  static async getAvailableGroupMembers(groupId: string, requesterId: string): Promise<Array<{
    groupMembershipId: string;
    userId: string;
    username: string;
    email: string | null;
    role: string;
  }>> {
    // Verify requester has access to group
    await this.validateGroupAccess(groupId, requesterId);

    const activeMembers = await prisma.groupMembership.findMany({
      where: {
        groupId,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { user: { username: 'asc' } }
    });

    return activeMembers.map(membership => ({
      groupMembershipId: membership.id,
      userId: membership.user.id,
      username: membership.user.username,
      email: membership.user.email,
      role: membership.role
    }));
  }

  // ============= HELPER METHODS =============

  /**
   * Validate user has access to group (is a member)
   */
  private static async validateGroupAccess(groupId: string, userId: string): Promise<void> {
    const membership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        userId,
        status: { in: ['ACTIVE', 'INACTIVE'] }
      }
    });

    const isOwner = await prisma.gamingGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      }
    });

    if (!membership && !isOwner) {
      throw ValidationUtils.createError('Access denied to group', 403);
    }
  }

  /**
   * Validate user can manage group (is owner or admin)
   */
  /**
   * Get pending group invitations for a user
   */
  static async getPendingInvitations(userId: string): Promise<Array<{
    id: string;
    groupId: string;
    groupName: string;
    invitedBy: string;
    invitedByUsername: string;
    invitedAt: Date;
  }>> {
    const invitations = await prisma.groupMembership.findMany({
      where: {
        userId,
        status: 'PENDING'
      },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return invitations.map(invitation => ({
      id: invitation.id,
      groupId: invitation.groupId,
      groupName: invitation.group.name,
      invitedBy: invitation.invitedBy || '',
      invitedByUsername: '', // We'll need to fetch this separately if needed
      invitedAt: invitation.invitedAt || invitation.joinedAt
    }));
  }

  /**
   * Decline a group invitation
   */
  static async declineGroupInvitation(groupId: string, userId: string): Promise<void> {
    const membership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        userId,
        status: 'PENDING'
      }
    });

    if (!membership) {
      throw ValidationUtils.createError('No pending invitation found', 404);
    }

    await prisma.groupMembership.update({
      where: { id: membership.id },
      data: { status: 'REMOVED' }
    });
  }

  private static async validateGroupManageAccess(groupId: string, userId: string): Promise<void> {
    const membership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        status: 'ACTIVE'
      }
    });

    const isOwner = await prisma.gamingGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      }
    });

    if (!membership && !isOwner) {
      throw ValidationUtils.createError('Insufficient permissions to manage group', 403);
    }
  }
}

export const groupMembershipService = new GroupMembershipService();