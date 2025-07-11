import { PrismaClient } from '@prisma/client';
import { 
  Army, 
  ArmyImportRequest, 
  ArmyImportResponse,
  ArmySyncRequest,
  ArmySyncResult,
  UpdateArmyCustomizationsRequest,
  GetArmiesQuery,
  ArmySummary,
  ArmyValidationResult,
  ArmyStatistics,
  ArmyFilterOptions,
  ArmyChange,
  ArmyConflict,
  ArmyForgeData,
  BattleHonor,
  VeteranUpgrade
} from '../types/army';
import { armyForgeClient } from './armyForgeClient';
import { userService } from './userService';
import { notificationService } from './notificationService';
import { ApiError } from '../utils/apiError';
import { validateArmyData } from '../utils/armyValidation';

const prisma = new PrismaClient();

class ArmyService {
  /**
   * Import army from ArmyForge
   */
  async importArmyFromArmyForge(
    userId: string, 
    request: ArmyImportRequest
  ): Promise<ArmyImportResponse> {
    try {
      // Get user's ArmyForge token
      const armyForgeToken = await userService.getUserArmyForgeToken(userId);
      if (!armyForgeToken) {
        throw new ApiError(400, 'ArmyForge token not configured. Please link your ArmyForge account.');
      }

      // Validate token
      const tokenValidation = await armyForgeClient.validateToken(armyForgeToken);
      if (!tokenValidation.valid) {
        throw new ApiError(401, 'ArmyForge token is invalid or expired. Please re-link your account.');
      }

      // Fetch army data from ArmyForge
      const armyForgeData = await armyForgeClient.getArmy(armyForgeToken, request.armyForgeId);
      
      // Validate army data
      const validation = await validateArmyData(armyForgeData);
      const warnings: string[] = [];
      const errors: string[] = [];

      if (!validation.isValid) {
        errors.push(...validation.errors.filter(e => e.severity === 'ERROR').map(e => e.message));
        warnings.push(...validation.errors.filter(e => e.severity === 'WARNING').map(e => e.message));
      }

      if (errors.length > 0) {
        throw new ApiError(400, `Army validation failed: ${errors.join(', ')}`);
      }

      // Check if army already exists
      const existingArmy = await prisma.army.findFirst({
        where: {
          userId,
          armyForgeId: request.armyForgeId,
        },
      });

      if (existingArmy) {
        throw new ApiError(409, 'Army already imported. Use sync instead to update it.');
      }

      // Verify campaign access if specified
      if (request.campaignId) {
        const campaignMember = await prisma.campaignMembership.findFirst({
          where: {
            userId,
            campaignId: request.campaignId,
          },
        });

        if (!campaignMember) {
          throw new ApiError(403, 'You are not a member of this campaign');
        }
      }

      // Create army record
      const army = await prisma.army.create({
        data: {
          userId,
          campaignId: request.campaignId || null,
          armyForgeId: request.armyForgeId,
          name: request.customName || armyForgeData.name,
          faction: armyForgeData.faction,
          points: armyForgeData.points,
          armyData: armyForgeData as any,
          customizations: {
            name: request.customName,
            notes: '',
            battleHonors: [],
            experience: {
              totalBattles: 0,
              victories: 0,
              defeats: 0,
              experiencePoints: 0,
              veteranUpgrades: [],
            },
            customRules: [],
            tags: [],
          },
          lastSyncedAt: new Date(),
        },
      });

      // Send notification
      await notificationService.sendNotification(userId, {
        type: 'ARMY_IMPORTED',
        title: 'Army Imported',
        message: `Successfully imported "${army.name}" from ArmyForge`,
        data: { armyId: army.id },
      });

      return {
        army: this.transformPrismaArmy(army),
        warnings,
        errors: [],
      };

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to import army: ${error.message}`);
    }
  }

  /**
   * Sync army with ArmyForge
   */
  async syncArmyWithArmyForge(
    armyId: string, 
    userId: string, 
    request: ArmySyncRequest = {}
  ): Promise<ArmySyncResult> {
    try {
      // Get army
      const army = await this.getArmyById(armyId, userId);
      if (!army.armyForgeId) {
        throw new ApiError(400, 'Army is not linked to ArmyForge');
      }

      // Get user's ArmyForge token
      const armyForgeToken = await userService.getUserArmyForgeToken(userId);
      if (!armyForgeToken) {
        throw new ApiError(400, 'ArmyForge token not configured');
      }

      // Check if army has been updated on ArmyForge
      if (!request.forceSync && army.lastSyncedAt) {
        const hasUpdates = await armyForgeClient.checkArmyUpdated(
          armyForgeToken, 
          army.armyForgeId, 
          army.lastSyncedAt
        );
        
        if (!hasUpdates) {
          return {
            success: true,
            changes: [],
            conflicts: [],
            lastSyncedAt: army.lastSyncedAt,
          };
        }
      }

      // Fetch updated army data
      const newArmyForgeData = await armyForgeClient.getArmy(armyForgeToken, army.armyForgeId);
      
      // Compare with existing data
      const changes = this.compareArmyData(army.armyData, newArmyForgeData);
      const conflicts = this.detectConflicts(army.customizations, newArmyForgeData);

      // Update army data
      const updatedArmy = await prisma.army.update({
        where: { id: armyId },
        data: {
          name: request.preserveCustomizations && army.customizations.name 
            ? army.customizations.name 
            : newArmyForgeData.name,
          faction: newArmyForgeData.faction,
          points: newArmyForgeData.points,
          armyData: newArmyForgeData as any,
          lastSyncedAt: new Date(),
        },
      });

      // Send notification if there were significant changes
      if (changes.length > 0) {
        await notificationService.sendNotification(userId, {
          type: 'ARMY_SYNCED',
          title: 'Army Synced',
          message: `"${army.name}" has been updated with ${changes.length} changes from ArmyForge`,
          data: { armyId: army.id, changeCount: changes.length },
        });
      }

      return {
        success: true,
        changes,
        conflicts,
        lastSyncedAt: updatedArmy.lastSyncedAt!,
      };

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to sync army: ${error.message}`);
    }
  }

  /**
   * Get user's armies
   */
  async getUserArmies(userId: string, query: GetArmiesQuery = {}): Promise<ArmySummary[]> {
    try {
      const where: any = { userId };

      if (query.campaignId) {
        where.campaignId = query.campaignId;
      }

      if (query.faction) {
        where.faction = query.faction;
      }

      const armies = await prisma.army.findMany({
        where,
        orderBy: {
          [query.sortBy || 'name']: query.sortOrder || 'asc',
        },
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          name: true,
          faction: true,
          points: true,
          lastSyncedAt: true,
          campaignId: true,
          customizations: true,
          createdAt: true,
        },
      });

      return armies.map(army => ({
        id: army.id,
        name: army.name,
        faction: army.faction,
        points: army.points,
        unitCount: 0, // TODO: Calculate from armyData
        lastSyncedAt: army.lastSyncedAt,
        hasCustomizations: this.hasCustomizations(army.customizations as any),
        campaignId: army.campaignId,
        experiencePoints: (army.customizations as any)?.experience?.experiencePoints || 0,
        battlesPlayed: (army.customizations as any)?.experience?.totalBattles || 0,
      }));

    } catch (error) {
      throw new ApiError(500, `Failed to get armies: ${error.message}`);
    }
  }

  /**
   * Get army by ID
   */
  async getArmyById(armyId: string, userId: string): Promise<Army> {
    try {
      const army = await prisma.army.findFirst({
        where: {
          id: armyId,
          userId,
        },
      });

      if (!army) {
        throw new ApiError(404, 'Army not found');
      }

      return this.transformPrismaArmy(army);

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to get army: ${error.message}`);
    }
  }

  /**
   * Update army customizations
   */
  async updateArmyCustomizations(
    armyId: string, 
    userId: string, 
    request: UpdateArmyCustomizationsRequest
  ): Promise<Army> {
    try {
      const army = await this.getArmyById(armyId, userId);
      
      const updatedCustomizations = {
        ...army.customizations,
        ...request,
      };

      const updatedArmy = await prisma.army.update({
        where: { id: armyId },
        data: {
          customizations: updatedCustomizations as any,
          name: request.name || army.name,
        },
      });

      return this.transformPrismaArmy(updatedArmy);

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to update army customizations: ${error.message}`);
    }
  }

  /**
   * Delete army
   */
  async deleteArmy(armyId: string, userId: string): Promise<void> {
    try {
      const army = await this.getArmyById(armyId, userId);

      // Check if army is used in any battles
      const battleParticipants = await prisma.battleParticipant.count({
        where: { armyId },
      });

      if (battleParticipants > 0) {
        throw new ApiError(400, 'Cannot delete army that has participated in battles');
      }

      await prisma.army.delete({
        where: { id: armyId },
      });

      // Send notification
      await notificationService.sendNotification(userId, {
        type: 'ARMY_DELETED',
        title: 'Army Deleted',
        message: `"${army.name}" has been deleted`,
        data: { armyName: army.name },
      });

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to delete army: ${error.message}`);
    }
  }

  /**
   * Add battle honor to army
   */
  async addBattleHonor(
    armyId: string, 
    userId: string, 
    battleHonor: Omit<BattleHonor, 'id' | 'dateEarned'>
  ): Promise<Army> {
    try {
      const army = await this.getArmyById(armyId, userId);

      const newBattleHonor: BattleHonor = {
        ...battleHonor,
        id: `bh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dateEarned: new Date(),
      };

      const updatedCustomizations = {
        ...army.customizations,
        battleHonors: [...army.customizations.battleHonors, newBattleHonor],
      };

      const updatedArmy = await prisma.army.update({
        where: { id: armyId },
        data: {
          customizations: updatedCustomizations as any,
        },
      });

      return this.transformPrismaArmy(updatedArmy);

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to add battle honor: ${error.message}`);
    }
  }

  /**
   * Add veteran upgrade to army
   */
  async addVeteranUpgrade(
    armyId: string, 
    userId: string, 
    veteranUpgrade: Omit<VeteranUpgrade, 'id' | 'dateAcquired'>
  ): Promise<Army> {
    try {
      const army = await this.getArmyById(armyId, userId);

      const newVeteranUpgrade: VeteranUpgrade = {
        ...veteranUpgrade,
        id: `vu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dateAcquired: new Date(),
      };

      const updatedCustomizations = {
        ...army.customizations,
        experience: {
          ...army.customizations.experience,
          veteranUpgrades: [...army.customizations.experience.veteranUpgrades, newVeteranUpgrade],
        },
      };

      const updatedArmy = await prisma.army.update({
        where: { id: armyId },
        data: {
          customizations: updatedCustomizations as any,
        },
      });

      return this.transformPrismaArmy(updatedArmy);

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to add veteran upgrade: ${error.message}`);
    }
  }

  /**
   * Get army statistics
   */
  async getArmyStatistics(userId: string): Promise<ArmyStatistics> {
    try {
      const armies = await prisma.army.findMany({
        where: { userId },
        select: {
          campaignId: true,
          faction: true,
          points: true,
          armyData: true,
          customizations: true,
        },
      });

      const stats: ArmyStatistics = {
        totalArmies: armies.length,
        armiesByCampaign: {},
        armiesByFaction: {},
        armiesByGameSystem: {},
        averagePoints: 0,
        totalBattles: 0,
        syncedArmies: 0,
        customArmies: 0,
      };

      let totalPoints = 0;

      for (const army of armies) {
        // Campaign stats
        const campaignKey = army.campaignId || 'uncategorized';
        stats.armiesByCampaign[campaignKey] = (stats.armiesByCampaign[campaignKey] || 0) + 1;

        // Faction stats
        stats.armiesByFaction[army.faction] = (stats.armiesByFaction[army.faction] || 0) + 1;

        // Game system stats
        const gameSystem = (army.armyData as any)?.gameSystem || 'unknown';
        stats.armiesByGameSystem[gameSystem] = (stats.armiesByGameSystem[gameSystem] || 0) + 1;

        // Points
        totalPoints += army.points;

        // Battle stats
        const experience = (army.customizations as any)?.experience;
        if (experience) {
          stats.totalBattles += experience.totalBattles || 0;
        }

        // Sync stats
        if (army.armyData) {
          stats.syncedArmies++;
        } else {
          stats.customArmies++;
        }
      }

      stats.averagePoints = armies.length > 0 ? Math.round(totalPoints / armies.length) : 0;

      return stats;

    } catch (error) {
      throw new ApiError(500, `Failed to get army statistics: ${error.message}`);
    }
  }

  // Private helper methods

  private transformPrismaArmy(prismaArmy: any): Army {
    return {
      id: prismaArmy.id,
      userId: prismaArmy.userId,
      campaignId: prismaArmy.campaignId,
      armyForgeId: prismaArmy.armyForgeId,
      name: prismaArmy.name,
      faction: prismaArmy.faction,
      points: prismaArmy.points,
      armyData: prismaArmy.armyData as ArmyForgeData | null,
      customizations: prismaArmy.customizations as any,
      lastSyncedAt: prismaArmy.lastSyncedAt,
      createdAt: prismaArmy.createdAt,
      updatedAt: prismaArmy.updatedAt,
    };
  }

  private compareArmyData(oldData: ArmyForgeData | null, newData: ArmyForgeData): ArmyChange[] {
    const changes: ArmyChange[] = [];

    if (!oldData) {
      return [{
        type: 'ADDED',
        category: 'METADATA',
        itemId: 'army',
        itemName: 'Army Data',
        newValue: newData,
        description: 'Initial army data imported',
      }];
    }

    // Compare basic properties
    if (oldData.name !== newData.name) {
      changes.push({
        type: 'MODIFIED',
        category: 'METADATA',
        itemId: 'name',
        itemName: 'Army Name',
        oldValue: oldData.name,
        newValue: newData.name,
        description: `Army name changed from "${oldData.name}" to "${newData.name}"`,
      });
    }

    if (oldData.points !== newData.points) {
      changes.push({
        type: 'MODIFIED',
        category: 'METADATA',
        itemId: 'points',
        itemName: 'Points Total',
        oldValue: oldData.points,
        newValue: newData.points,
        description: `Points changed from ${oldData.points} to ${newData.points}`,
      });
    }

    // TODO: Add detailed unit, weapon, and rule comparison

    return changes;
  }

  private detectConflicts(customizations: any, newData: ArmyForgeData): ArmyConflict[] {
    const conflicts: ArmyConflict[] = [];

    // Check for customization conflicts
    if (customizations.name && customizations.name !== newData.name) {
      conflicts.push({
        type: 'CUSTOMIZATION_CONFLICT',
        description: 'Custom army name differs from ArmyForge name',
        itemId: 'name',
        itemName: 'Army Name',
        suggestedResolution: 'Keep custom name or update to match ArmyForge',
      });
    }

    // TODO: Add more conflict detection logic

    return conflicts;
  }

  private hasCustomizations(customizations: any): boolean {
    if (!customizations) return false;
    
    return (
      (customizations.name && customizations.name.length > 0) ||
      (customizations.notes && customizations.notes.length > 0) ||
      (customizations.battleHonors && customizations.battleHonors.length > 0) ||
      (customizations.customRules && customizations.customRules.length > 0) ||
      (customizations.tags && customizations.tags.length > 0) ||
      (customizations.experience?.veteranUpgrades && customizations.experience.veteranUpgrades.length > 0)
    );
  }
}

export const armyService = new ArmyService();