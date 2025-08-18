import mongoose from 'mongoose';

const decisionRoomSchema = new mongoose.Schema({
  title: String,
  description: String,
  options: [
    {
      id: String,
      text: String,
      votes: { type: Number, default: 0 },
    },
  ],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deadline: Date,
  roomId: { type: String, required: true, unique: true },
  voters: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  
  // Accreditation system
  accreditedVoters: [
    {
      phoneNumber: { type: String, required: true },
      name: { type: String, required: true },
      hasVoted: { type: Boolean, default: false },
      otpVerified: { type: Boolean, default: false },
      otpCode: { type: String },
      otpExpiresAt: { type: Date }
    }
  ],
  requireAccreditation: { type: Boolean, default: false },
  maxVoters: { type: Number, default: 0 }
});

export default mongoose.model('DecisionRoom', decisionRoomSchema);
