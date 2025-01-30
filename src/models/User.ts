// src/models/User.ts
import mongoose from "npm:mongoose";
import bcrypt from "npm:bcryptjs";
import jwt from "npm:jsonwebtoken";

const subscriptionSchema = new mongoose.Schema({
  tier: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  creditsRemaining: { type: Number, default: 100 },
  rateLimits: {
    dailyLimit: { type: Number, default: 100 },
    concurrentRequests: { type: Number, default: 5 }
  },
  startDate: { type: Date, default: Date.now },
  renewalDate: { type: Date },
  isActive: { type: Boolean, default: true }
});

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  subscription: {
    type: subscriptionSchema,
    default: () => ({})
  },
  apiKey: { 
    type: String, 
    unique: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Add to existing user schema
userSchema.methods.comparePassword = async function(candidatePassword: string) {
    return await bcrypt.compare(candidatePassword, this.password);
  };
  
  userSchema.methods.generateToken = function() {
    return jwt.sign(
      { id: this._id, email: this.email }, 
      Deno.env.get('JWT_SECRET') || '', 
      { expiresIn: '1d' }
    );
  };
  userSchema.methods.generateApiKey = function(day:string="1d") {
    return jwt.sign(
      { id: this._id, email: this.email }, 
      Deno.env.get('JWT_API_KEY') || '', 
      { expiresIn: day }
    );
  };
  userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
      { id: this._id, email: this.email }, 
      Deno.env.get('JWT_REFRESH_SECRET') || '', 
      { expiresIn: '30d' }
    );
  };

export const User = mongoose.model('User', userSchema);