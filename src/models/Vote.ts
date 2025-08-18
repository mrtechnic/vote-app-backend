import mongoose, { Document, Schema } from 'mongoose';

export interface IVote extends Document {
  room: mongoose.Types.ObjectId;
  option: string;
  voterFingerprint: string; // Combination of IP + User Agent hash for anonymity
  userId?: mongoose.Types.ObjectId; // Optional for registered users
  createdAt: Date;
}

const voteSchema = new Schema<IVote>({
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  option: {
    type: String,
    required: true,
    trim: true
  },
  voterFingerprint: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one vote per user per room
voteSchema.index({ room: 1, voterFingerprint: 1 }, { unique: true });

export const Vote = mongoose.model<IVote>('Vote', voteSchema);
