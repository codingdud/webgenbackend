// src/middleware/auth.ts
import { Request, Response, NextFunction } from "npm:express";
import jwt from "npm:jsonwebtoken";
import { User } from "../models/User.ts";
import { logger } from "../utils/logger.ts";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Authentication failed: Missing token');
      return res.status(401).json({
        success: false,
        error: { code: '401', message: 'Missing Token key' }
      });
    }

    jwt.verify(token, Deno.env.get("JWT_SECRET") as string, async (err: jwt.VerifyErrors | null, decoded: { id: string; email: string; }) => {
      if (err) {
        logger.warn('Authentication failed: Invalid token', { error: err.message });
        return res.status(401).json({
          success: false,
          error: { code: '401', message: 'Invalid Token key' }
        });
      }

      const user = await User.findOne({ _id: decoded.id });
      if (!user) {
        logger.warn(`User not found: ${decoded.id}`);
        return res.status(401).json({
          success: false,
          error: { code: '402', message: 'User Not Found' }
        });
      }

      logger.debug(`User authenticated: ${user.email}`);
      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
};

export const refreshToken = (req: Request, res: Response) => {
  try {
    console.log(req.body)
    const refreshToken = req.cookies?.jwt||req.body?.refreshToken;
    logger.debug('Processing refresh token request');

    if (!refreshToken) {
      logger.warn('Refresh token missing');
      return res.sendStatus(401);
    }

    jwt.verify(
      refreshToken,
      Deno.env.get("JWT_REFRESH_SECRET") as string,
      (err: jwt.VerifyErrors | null, decoded: { id: string; email: string; }) => {
        if (err) {
          logger.warn('Invalid refresh token', { error: err.message });
          return res.sendStatus(403);
        }

        const token = jwt.sign(
          { id: decoded.id, email: decoded.email },
          Deno.env.get("JWT_SECRET") as string,
          { expiresIn: '1d' }
        );

        logger.info(`Token refreshed for user: ${decoded.email} ${token}`);
        return res.json({ token });
      }
    );
  } catch (error) {
    logger.error('Token refresh failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
};