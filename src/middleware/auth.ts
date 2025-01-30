// src/middleware/auth.ts
import { Request, Response, NextFunction } from "npm:express";
import { User } from "../models/User.ts";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers.authorization?.split(' ')[1];
    console.log(apiKey);
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: { code: '401', message: 'Missing API key' }
      });
    }
    const user = await User.findOne({ apiKey });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: '401', message: 'Invalid API key' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};