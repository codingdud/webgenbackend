// src/controllers/authController.ts
import { Request, Response } from "npm:express";
import { User } from "../models/User.ts";
import bcrypt from "npm:bcryptjs";
import { v4 as uuidv4 } from "npm:uuid";

export const signUp = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: '400', message: 'Email and password are required' }
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
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
    } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Sign up failed', 
        details: error.message 
      }
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: '400', message: 'Email and password are required' }
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: '401', message: 'User Dont Exist in System' }
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: '401', message: 'Invalid credentials' }
      });
    }

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
  } catch (error:any) {
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Sign in failed', 
        details: error.message 
      }
    });
  }
};

export const resetApiKey = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    // Generate new API key
    const newApiKey = uuidv4();

    // Update user
    await User.findByIdAndUpdate(user._id, { apiKey: newApiKey });

    res.json({
      success: true,
      data: { 
        apiKey: newApiKey,
        message: 'API key reset successfully' 
      }
    });
  } catch (error:any) {
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'API key reset failed', 
        details: error.message 
      }
    });
  }
};
