import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Gaming Group validation schemas
const createGamingGroupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    'string.empty': 'Group name is required',
    'string.min': 'Group name must be at least 3 characters',
    'string.max': 'Group name cannot exceed 50 characters',
    'any.required': 'Group name is required'
  }),
  description: Joi.string().max(500).allow('').optional().messages({
    'string.max': 'Description cannot exceed 500 characters'
  })
});

const joinGroupSchema = Joi.object({
  inviteCode: Joi.string().length(8).required().messages({
    'string.empty': 'Invite code is required',
    'string.length': 'Invite code must be exactly 8 characters',
    'any.required': 'Invite code is required'
  })
});

// Generic validation middleware factory
function validateSchema(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }
    
    next();
  };
}

// Specific validation middleware exports
export const validateCreateGamingGroup = validateSchema(createGamingGroupSchema);
export const validateJoinGroup = validateSchema(joinGroupSchema);

// Auth validation schemas
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    'string.empty': 'Username is required',
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username cannot exceed 30 characters',
    'any.required': 'Username is required'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Invalid email format'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  })
});

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': 'Username is required',
    'any.required': 'Username is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required',
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 6 characters',
    'any.required': 'New password is required'
  })
});

const updateProfileSchema = Joi.object({
  email: Joi.string().email().optional().messages({
    'string.email': 'Invalid email format'
  }),
  armyForgeToken: Joi.string().optional()
});

export const validateRegister = validateSchema(registerSchema);
export const validateLogin = validateSchema(loginSchema);
export const validateChangePassword = validateSchema(changePasswordSchema);
export const validateUpdateProfile = validateSchema(updateProfileSchema);

// Campaign validation schemas
const campaignSettingsSchema = Joi.object({
  pointsLimit: Joi.number().min(100).max(10000).required().messages({
    'number.min': 'Points limit must be at least 100',
    'number.max': 'Points limit cannot exceed 10000',
    'any.required': 'Points limit is required'
  }),
  gameSystem: Joi.string().valid('grimdark-future', 'age-of-fantasy', 'firefight', 'warfleets-ftl').required().messages({
    'any.only': 'Game system must be one of: grimdark-future, age-of-fantasy, firefight, warfleets-ftl',
    'any.required': 'Game system is required'
  }),
  experiencePerWin: Joi.number().min(0).max(100).required().messages({
    'number.min': 'Experience per win must be at least 0',
    'number.max': 'Experience per win cannot exceed 100',
    'any.required': 'Experience per win is required'
  }),
  experiencePerLoss: Joi.number().min(0).max(100).required().messages({
    'number.min': 'Experience per loss must be at least 0',
    'number.max': 'Experience per loss cannot exceed 100',
    'any.required': 'Experience per loss is required'
  }),
  experiencePerKill: Joi.number().min(0).max(10).required().messages({
    'number.min': 'Experience per kill must be at least 0',
    'number.max': 'Experience per kill cannot exceed 10',
    'any.required': 'Experience per kill is required'
  }),
  allowMultipleArmies: Joi.boolean().required(),
  requireArmyForgeIntegration: Joi.boolean().required(),
  customRules: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    title: Joi.string().min(1).max(100).required(),
    description: Joi.string().min(1).max(500).required(),
    isActive: Joi.boolean().required()
  })).default([])
});

const createCampaignSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.empty': 'Campaign name is required',
    'string.min': 'Campaign name must be at least 3 characters',
    'string.max': 'Campaign name cannot exceed 100 characters',
    'any.required': 'Campaign name is required'
  }),
  description: Joi.string().max(1000).allow('').optional().messages({
    'string.max': 'Description cannot exceed 1000 characters'
  }),
  narrative: Joi.string().max(5000).allow('').optional().messages({
    'string.max': 'Narrative cannot exceed 5000 characters'
  }),
  settings: campaignSettingsSchema.required()
});

const updateCampaignSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Campaign name must be at least 3 characters',
    'string.max': 'Campaign name cannot exceed 100 characters'
  }),
  description: Joi.string().max(1000).allow('').optional().messages({
    'string.max': 'Description cannot exceed 1000 characters'
  }),
  narrative: Joi.string().max(5000).allow('').optional().messages({
    'string.max': 'Narrative cannot exceed 5000 characters'
  }),
  status: Joi.string().valid('PLANNING', 'ACTIVE', 'COMPLETED', 'PAUSED').optional(),
  settings: campaignSettingsSchema.optional()
});

const joinCampaignSchema = Joi.object({
  primaryArmyId: Joi.string().optional()
});

export const validateCreateCampaign = validateSchema(createCampaignSchema);
export const validateUpdateCampaign = validateSchema(updateCampaignSchema);
export const validateJoinCampaign = validateSchema(joinCampaignSchema);

// Mission validation schemas
const missionObjectiveSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(1).max(500).required(),
  points: Joi.number().min(0).max(10).required(),
  type: Joi.string().valid('CAPTURE_POINT', 'DESTROY_UNIT', 'HOLD_POSITION', 'ELIMINATE_ENEMY', 'CUSTOM').required(),
  isRequired: Joi.boolean().required()
});

const missionRuleSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(1).max(500).required(),
  phase: Joi.string().valid('DEPLOYMENT', 'MOVEMENT', 'SHOOTING', 'COMBAT', 'MORALE', 'END_TURN', 'GAME_END').required(),
  isActive: Joi.boolean().required()
});

const terrainFeatureSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(1).max(500).required(),
  size: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE', 'MASSIVE').required(),
  category: Joi.string().valid('BUILDING', 'FOREST', 'HILL', 'RUINS', 'WATER', 'INDUSTRIAL', 'OBSTACLE', 'DECORATION').required(),
  isRequired: Joi.boolean().required()
});

const createMissionSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.empty': 'Mission title is required',
    'string.min': 'Mission title must be at least 3 characters',
    'string.max': 'Mission title cannot exceed 100 characters',
    'any.required': 'Mission title is required'
  }),
  description: Joi.string().max(2000).required().messages({
    'string.max': 'Mission description cannot exceed 2000 characters',
    'any.required': 'Mission description is required'
  }),
  points: Joi.number().min(100).max(10000).required().messages({
    'number.min': 'Mission points must be at least 100',
    'number.max': 'Mission points cannot exceed 10000',
    'any.required': 'Mission points are required'
  }),
  scheduledDate: Joi.string().isoDate().optional(),
  objectives: Joi.array().items(missionObjectiveSchema).min(1).required().messages({
    'array.min': 'At least one objective is required'
  }),
  specialRules: Joi.array().items(missionRuleSchema).default([]),
  terrainSuggestions: Joi.array().items(terrainFeatureSchema).default([])
});

const updateMissionSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(2000).optional(),
  points: Joi.number().min(100).max(10000).optional(),
  status: Joi.string().valid('UPCOMING', 'ACTIVE', 'COMPLETED').optional(),
  scheduledDate: Joi.string().isoDate().allow(null).optional(),
  objectives: Joi.array().items(missionObjectiveSchema).optional(),
  specialRules: Joi.array().items(missionRuleSchema).optional(),
  terrainSuggestions: Joi.array().items(terrainFeatureSchema).optional()
});

export const validateCreateMission = validateSchema(createMissionSchema);
export const validateUpdateMission = validateSchema(updateMissionSchema);