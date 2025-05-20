// src/models/User.ts
import mongoose from "npm:mongoose";
import bcrypt from "npm:bcryptjs";
import jwt from "npm:jsonwebtoken";

// Define interfaces for the subscription
interface ISubscription {
  tier: 'free' | 'pro' | 'enterprise' | 'basic' | 'premium' | 'family';
  creditsRemaining: number;
  totalImgGenrated:number,
  rateLimits: {
    dailyLimit: number;
    concurrentRequests: number;
  };
  validUntil:Date;
  startDate: Date;
  renewalDate?: Date;
  isActive: boolean;
}

// Define interface for user document
interface IUser {
  name?: string;
  email: string;
  password: string;
  subscription: ISubscription;
  apiKey?: string;
  createdAt: Date;
  profileImage?: string;
  organization?: string;
  role?: 'developer' | 'backend-eniner' | 'frontend-eniner' | 'student';
  stripeCustomerId:string;
}

// Define interface for user methods
interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
  generateApiKey(day?: string): string;
  generateRefreshToken(): string;
}

// Create the type for UserModel
type UserModel = mongoose.Model<IUser, Record<string | number | symbol, never>, IUserMethods>;

// Define schemas
const subscriptionSchema = new mongoose.Schema<ISubscription>({
  tier: {
    type: String,
    enum: ['free','pro','enterprise','basic','premium','family'],
    default: 'free'
  },
  totalImgGenrated:{type:Number,default:0},
  creditsRemaining: { type: Number, default: 100 },
  rateLimits: {
    dailyLimit: { type: Number, default: 100 },
    concurrentRequests: { type: Number, default: 5 }
  },
  validUntil:{type:Date, default: () => new Date(Date.now() + (6 * 30 * 24 * 60 * 60 * 1000))},
  startDate: { type: Date, default:Date.now },
  renewalDate: { type: Date },
  isActive: { type: Boolean, default: true }
});

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>({
  profileImage: {
    type: String,
    default: 'https://res.cloudinary.com/dkon1kh9h/image/upload/v1743530356/6794be25f9eeb88fc50858f8/67ba1972a51ede1ae26f7fdc/nsbkaifjtvhz9u0gohpv.jpg',
    required: false
  },
  name: { 
    type: String, 
    required: false,
    default: function(this: IUser) {
      return this.email ? this.email.split('@')[0] : undefined;
    }
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  organization: {
    type: String,
    default: 'Personal'
  },
  role: {
    type: String,
    enum: ['developer', 'backend eniner', 'frontend eniner', 'student'],
    default: 'developer'
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
  },
  stripeCustomerId:{
    type:String,
    default:null
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
    { expiresIn: '1m' }
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
    { expiresIn: '1d' }
  );
};

// Export both the model and interfaces
export const User = mongoose.model<IUser, UserModel>('User', userSchema);
export type { IUser, IUserMethods, UserModel };