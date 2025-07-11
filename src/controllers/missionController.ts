import { Request, Response } from 'express';
import { MissionService } from '../services/missionService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class MissionController {
  // Create a new mission in a campaign
  static async createMission(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      const missionData = await MissionService.createMission(campaignId, userId, req.body);
      
      logger.info('Mission created', { missionId: missionData.id, campaignId, userId });
      
      res.status(201).json({
        status: 'success',
        data: missionData,
        message: 'Mission created successfully'
      });
    } catch (error: any) {
      logger.error('Mission creation failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to create mission'
      });
    }
  }

  // Get all missions for a campaign
  static async getCampaignMissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const campaignId = req.params.campaignId;
      
      const missions = await MissionService.getCampaignMissions(campaignId, userId);
      
      res.json({
        status: 'success',
        data: missions
      });
    } catch (error: any) {
      logger.error('Get campaign missions failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch missions'
      });
    }
  }

  // Get a specific mission by ID
  static async getMissionById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const missionId = req.params.missionId;
      
      const mission = await MissionService.getMissionById(missionId, userId);
      
      res.json({
        status: 'success',
        data: mission
      });
    } catch (error: any) {
      logger.error('Get mission by ID failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to fetch mission'
      });
    }
  }

  // Update a mission
  static async updateMission(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const missionId = req.params.missionId;
      
      const updatedMission = await MissionService.updateMission(missionId, userId, req.body);
      
      logger.info('Mission updated', { missionId, userId });
      
      res.json({
        status: 'success',
        data: updatedMission,
        message: 'Mission updated successfully'
      });
    } catch (error: any) {
      logger.error('Update mission failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to update mission'
      });
    }
  }

  // Delete a mission
  static async deleteMission(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const missionId = req.params.missionId;
      
      await MissionService.deleteMission(missionId, userId);
      
      logger.info('Mission deleted', { missionId, userId });
      
      res.json({
        status: 'success',
        message: 'Mission deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete mission failed', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
      
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Failed to delete mission'
      });
    }
  }

  // Get mission templates
  static async getMissionTemplates(req: Request, res: Response): Promise<void> {
    try {
      const gameSystem = req.query.gameSystem as string;
      
      const templates = await MissionService.getMissionTemplates(gameSystem);
      
      res.json({
        status: 'success',
        data: templates
      });
    } catch (error: any) {
      logger.error('Get mission templates failed', { error: error.message });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch mission templates'
      });
    }
  }
}