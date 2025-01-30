// src/models/Image.ts
import mongoose from "npm:mongoose";
const imageSchema = new mongoose.Schema({
    url: { 
      type: String, 
      required: true 
    },
    publicId: { 
      type: String, 
      required: true 
    },
    metadata: {
      type: {
        type: String,
        enum: ['header', 'card', 'profile', 'custom'],
        required: true
      },
      prompt: { 
        type: String, 
        required: true 
      },
      style: { 
        type: String 
      },
      colorScheme: [{ 
        type: String 
      }],
      aspectRatio: { 
        type: String 
      },
    },
    generatedAt: { 
      type: Date, 
      default: Date.now 
    },
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }
  });
  
  export const Image = mongoose.model('Image', imageSchema);