import { Response, Request } from 'express';
import crypto from 'crypto';
import { Room } from '../models/Room';
import { Vote } from '../models/Vote';


const createVoterFingerprint = (req: Request): string => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const userId = req.user?._id?.toString() || '';

  return crypto.createHash('sha256')
    .update(`${ip}:${userAgent}:${userId}`)
    .digest('hex');
};

export const castVote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.params;
    const { option } = req.body;

    const room = await Room.findOne({ inviteCode, isActive: true });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (new Date() > room.deadline) {
      res.status(400).json({ error: 'Voting deadline has passed' });
      return;
    }

    if (!room.options.includes(option)) {
      res.status(400).json({ error: 'Invalid option' });
      return;
    }

    const voterFingerprint = createVoterFingerprint(req);

    const existingVote = await Vote.findOne({
      room: room._id,
      voterFingerprint,
    });

    if (existingVote) {
      res.status(400).json({ error: 'You have already voted in this room' });
      return;
    }

    const vote = new Vote({
      room: room._id,
      option,
      voterFingerprint,
      userId: req.user?._id,
    });

    await vote.save();

    res.status(201).json({ message: 'Vote cast successfully' });
  } catch (error: any) {
    console.error('Cast vote error:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'You have already voted in this room' });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
};
