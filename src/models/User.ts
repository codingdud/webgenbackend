// src/models/User.ts
import mongoose from "npm:mongoose";
import bcrypt from "npm:bcryptjs";
import jwt from "npm:jsonwebtoken";

// Define interfaces for the subscription
interface ISubscription {
  tier: 'free' | 'pro' | 'enterprise';
  creditsRemaining: number;
  rateLimits: {
    dailyLimit: number;
    concurrentRequests: number;
  };
  startDate: Date;
  renewalDate?: Date;
  isActive: boolean;
}

// Define interface for user document
interface IUser {
  email: string;
  password: string;
  subscription: ISubscription;
  apiKey?: string;
  createdAt: Date;
}

// Define interface for user methods
interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
  generateApiKey(day?: string): string;
  generateRefreshToken(): string;
}

// Create the type for UserModel
type UserModel = mongoose.Model<IUser, {}, IUserMethods>;

// Define schemas
const subscriptionSchema = new mongoose.Schema<ISubscription>({
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

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>({
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

// Add methods
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

userSchema.methods.generateApiKey = function(day: string = "1d") {
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

// Export both the model and interfaces
export const User = mongoose.model<IUser, UserModel>('User', userSchema);
export type { IUser, IUserMethods, UserModel };