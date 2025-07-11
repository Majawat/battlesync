import Joi from 'joi';
import { ValidationError } from '../types/api';

export class ValidationUtils {
  static validateAndThrow<T>(schema: Joi.ObjectSchema, data: any): T {
    const { error, value } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      const validationError = new Error('Validation failed');
      (validationError as any).validationErrors = validationErrors;
      (validationError as any).statusCode = 400;
      throw validationError;
    }
    
    return value;
  }

  static createError(message: string, statusCode: number = 400): Error {
    const error = new Error(message);
    (error as any).statusCode = statusCode;
    return error;
  }
}

// Authentication validation schemas
export const authSchemas = {
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 30 characters'
      }),
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 128 characters'
      })
  }),

  login: Joi.object({
    username: Joi.string()
      .required()
      .messages({
        'any.required': 'Username is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required'
      })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    newPassword: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'New password must be at least 6 characters long',
        'string.max': 'New password must not exceed 128 characters',
        'any.required': 'New password is required'
      })
  }),

  updateProfile: Joi.object({
    email: Joi.string()
      .email()
      .optional()
      .allow('')
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    armyForgeToken: Joi.string()
      .optional()
      .allow('')
      .max(500)
      .messages({
        'string.max': 'ArmyForge token is too long'
      })
  })
};