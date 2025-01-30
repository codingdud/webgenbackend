// src/middleware/auth.ts
import { Request, Response, NextFunction } from "npm:express";
import jwt from "npm:jsonwebtoken";
import { User } from "../models/User.ts";

export const authenticate =  (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: '401', message: 'Missing Token key' }
      });
    }
    jwt.verify(token, Deno.env.get("JWT_SECRET") as string, async (err: jwt.VerifyErrors | null, decoded: { id: string;email:string; }) => {
        if (err) {
            return res.status(401).json({
            success: false,
            error: { code: '401', message: 'Invalid Token key' }
            });
        }
        const user = await User.findOne({ _id: decoded.id });
        if (!user) {
            return res.status(401).json({
            success: false,
            error: { code: '402', message: 'User Not Found'}
            });
        }
        req.user = user;
        next();
        });
    } catch (error) {
        next(error);
    }   
};

export const refreshToken=(req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.jwt;
    //console.log(req.body)
    //console.log(req.cookies?.jwt)

    if (refreshToken === null) return res.sendStatus(401);

    jwt.verify(refreshToken, Deno.env.get("JWT_REFRESH_SECRET"), (err:jwt.VerifyErrors , decoded: { id: string;email:string; }) => {
      if (err) return res.sendStatus(403);
      const token = jwt.sign({id: decoded.id, email: decoded.email}, Deno.env.get("JWT_SECRET"), {
        expiresIn: '1d', // Short-lived token
      });

      return res.json({ token });
    });
  } catch (error:jwt.VerifyErrors) {
    res.status(500).json({ message: error.message });
  }
}