import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  title: string;
  description: string;
  options: string[];
  deadline: Date;
  creator: mongoose.Types.ObjectId;
  inviteCode: string;
  createdAt: Date;
  isActive: boolean;
}

const roomSchema = new Schema<IRoom>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  options: [{
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  }],
  deadline: {
    type: Date,
    required: true,
    validate: {
      validator: function(value: Date) {
        return value > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

roomSchema.index({ deadline: 1 });
roomSchema.index({ creator: 1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema);