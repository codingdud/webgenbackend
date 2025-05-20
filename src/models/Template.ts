import mongoose from "npm:mongoose";

const templateSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  dislikes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtuals for like/dislike counts
templateSchema.virtual('likeCount').get(function () {
  return this.likes.length;
});
templateSchema.virtual('dislikeCount').get(function () {
  return this.dislikes.length;
});

templateSchema.set('toJSON', { virtuals: true });
templateSchema.set('toObject', { virtuals: true });

export const Template = mongoose.model('Template', templateSchema);