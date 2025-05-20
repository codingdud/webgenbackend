// src/models/Project.ts
import mongoose from "npm:mongoose";


const projectSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  images: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Image' 
  }],
  tags: [{ type: String }],
  status: {
    type: String,
    enum: ['draft', 'in-progress', 'completed'],
    default: 'draft'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  publish:{
    type: Boolean,
    default: false
  }
});

export const Project = mongoose.model('Project', projectSchema);