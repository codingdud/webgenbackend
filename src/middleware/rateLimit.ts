// src/middleware/rateLimit.ts
import { Request, Response, NextFunction } from "npm:express";
import { Image } from "../models/Image.ts";

export const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    // Check daily usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyUsage = await Image.countDocuments({
      user: user._id,
      generatedAt: { $gte: today }
    });

    if (dailyUsage >= user.subscription.rateLimits.dailyLimit) {
      return res.status(429).json({
        success: false,
        error: { code: '429', message: 'Daily rate limit exceeded' }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
