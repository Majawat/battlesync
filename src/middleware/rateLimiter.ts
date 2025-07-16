import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({
  points: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in dev
  duration: 60, // Per 60 seconds
});

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting in development mode
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  try {
    await limiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes) {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.'
    });
  }
};