// src/controllers/authController.ts
import { Request, Response } from "npm:express";
import { User } from "../models/User.ts";
import bcrypt from "npm:bcryptjs";
import { v4 as uuidv4 } from "npm:uuid";
import { logger } from "../utils/logger.ts";

export const signUp = async (req: Request, res: Response) => {
  try {
    logger.debug('Processing signup request');
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      logger.warn('Signup attempt with missing credentials');
      return res.status(400).json({
        success: false,
        error: { code: '400', message: 'Email and password are required' }
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.info(`Signup attempt with existing email: ${email}`);
      return res.status(409).json({
        success: false,
        error: { code: '409', message: 'User already exists' }
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate API key
    const apiKey = uuidv4();

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      apiKey
    });

    await user.save();
    logger.info(`New user registered: ${email}`);

    // Generate JWT token
    const token = user.generateToken();
    const rtoken = user.generateRefreshToken();
    res.cookie('jwt',rtoken,{ httpOnly: true, 
      sameSite: 'None', secure: true, 
      maxAge: 24 * 60 * 60 * 1000 })

    res.status(201).json({
      success: true,
      data: {
      userId: user._id,
      email: user.email,
      apiKey: user.apiKey,
      tier: user.subscription.tier,
      token,
      rtoken
      }
    });
    } catch (error: unknown) {
    logger.error('Signup failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Sign up failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    logger.debug('Processing signin request');
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn('Signin attempt with missing credentials');
      return res.status(400).json({
        success: false,
        error: { code: '400', message: 'Email and password are required' }
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.info(`Failed signin attempt for non-existent user: ${email}`);
      return res.status(401).json({
        success: false,
        error: { code: '401', message: 'User Dont Exist in System' }
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Failed signin attempt for user: ${email}`);
      return res.status(401).json({
        success: false,
        error: { code: '401', message: 'Invalid credentials' }
      });
    }

    logger.info(`Successful signin: ${email}`);
    // Generate JWT token
    const token = user.generateToken();
    const rtoken = user.generateRefreshToken();
    res.cookie('jwt',rtoken,{ httpOnly: true, 
      sameSite: 'None', secure: true, 
      maxAge: 24 * 60 * 60 * 1000 })
    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        apiKey: user.apiKey,
        tier: user.subscription.tier,
        token,
        rtoken
      }
    });
  } catch (error: unknown) {
    logger.error('Signin failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Sign in failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export const resetApiKey = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    logger.debug(`Processing API key reset for user: ${user.email}`);

    const newApiKey = uuidv4();
    await User.findByIdAndUpdate(user._id, { apiKey: newApiKey });
    
    logger.info(`API key reset successful for user: ${user.email}`);
    res.json({
      success: true,
      data: { 
        apiKey: newApiKey,
        message: 'API key reset successfully' 
      }
    });
  } catch (error: unknown) {
    logger.error('API key reset failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'API key reset failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};
