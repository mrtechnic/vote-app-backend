import { Request, Response } from 'express';
import DecisionRoom from '../models/DecisionRoom';
import { generateRoomId, generateOTP, isOTPExpired, validatePhoneNumber } from '../utils/helpers';


export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, options, deadline, requireAccreditation, accreditedVoters } = req.body;

    if (!title || !description || !options || !deadline) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (options.length < 2 || options.length > 5) {
      res.status(400).json({ error: 'Must have 2–5 options' });
      return;
    }

    if (new Date(deadline) <= new Date()) {
      res.status(400).json({ error: 'Deadline must be in the future' });
      return;
    }

    const roomId = generateRoomId();
    const formattedOptions = options.map((option: string, index: number) => ({
      id: `option_${index + 1}`,
      text: option.trim(),
      votes: 0
    }));

    // Process accredited voters if provided
    interface AccreditedVoterInput {
      name: string;
      phoneNumber: string;
    }

    interface ProcessedAccreditedVoter {
      name: string;
      phoneNumber: string;
      hasVoted: boolean;
      otpVerified: boolean;
    }

    const processedAccreditedVoters: ProcessedAccreditedVoter[] = requireAccreditation && accreditedVoters ?
      (accreditedVoters as AccreditedVoterInput[])
        .filter((voter: AccreditedVoterInput) => voter.name && voter.phoneNumber)
        .map((voter: AccreditedVoterInput) => ({
          name: voter.name.trim(),
          phoneNumber: voter.phoneNumber.trim(),
          hasVoted: false,
          otpVerified: false
        })) : [];

    const room = new DecisionRoom({
      title: title.trim(),
      description: description.trim(),
      options: formattedOptions,
      creator: req.user._id,
      deadline: new Date(deadline),
      roomId,
      voters: [],
      requireAccreditation: requireAccreditation || false,
      accreditedVoters: processedAccreditedVoters,
      maxVoters: processedAccreditedVoters.length
    });

    await room.save();

    res.status(201).json({
      message: 'Decision room created successfully',
      room: {
        id: room._id,
        title: room.title,
        description: room.description,
        options: room.options,
        deadline: room.deadline,
        roomId: room.roomId,
        requireAccreditation: room.requireAccreditation,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const room = await DecisionRoom.findOne({ roomId }).populate('creator', 'name');

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const isExpired = room.deadline ? new Date() > room.deadline : false;
    
    console.log('Room options from database:', room.options);
    console.log('Total votes calculated:', room.options.reduce((sum, option) => sum + option.votes, 0));

    res.json({
      room: {
        id: room._id,
        title: room.title,
        description: room.description,
        options: room.options,
        deadline: room.deadline,
        roomId: room.roomId,
        creator: room.creator,
        isExpired,
        hasVoted: false, // Will be implemented with your new voter identification method
        totalVotes: room.options.reduce((sum, option) => sum + option.votes, 0),
        voters: room.voters,
        requireAccreditation: room.requireAccreditation,
        accreditedVoters: room.accreditedVoters,
        maxVoters: room.maxVoters,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const voteInRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { optionId, phoneNumber } = req.body;

    if (!optionId) {
      res.status(400).json({ error: 'Option ID is required' });
      return;
    }

    const room = await DecisionRoom.findOne({ roomId });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (!room.deadline || new Date() > room.deadline) {
      res.status(400).json({ error: 'Voting has ended' });
      return;
    }

    // Check if room requires accreditation
    if (room.requireAccreditation) {
      if (!phoneNumber) {
        res.status(400).json({ error: 'Phone number is required for accredited voting' });
        return;
      }

      const accreditedVoter = room.accreditedVoters.find(
        voter => voter.phoneNumber === phoneNumber
      );

      if (!accreditedVoter) {
        res.status(404).json({ error: 'Phone number not found in accredited voters list' });
        return;
      }

      if (accreditedVoter.hasVoted) {
        res.status(400).json({ error: 'You have already voted in this room' });
        return;
      }

      if (!accreditedVoter.otpVerified) {
        res.status(400).json({ error: 'OTP verification required before voting' });
        return;
      }

      // Mark as voted
      accreditedVoter.hasVoted = true;
    } else {
      // For non-accredited rooms, use the old system (temporary)
      // TODO: Implement your new voter identification method here
    }

    const optionIndex = room.options.findIndex((option) => option.id === optionId);
    if (optionIndex === -1) {
      res.status(400).json({ error: 'Invalid option' });
      return;
    }

    console.log('Before vote - Option votes:', room.options[optionIndex].votes);
    room.options[optionIndex].votes += 1;
    console.log('After vote - Option votes:', room.options[optionIndex].votes);

    await room.save();
    console.log('Room saved successfully');

    // Emit real-time update to all clients in the room
    const io = req.app.get('io');
    if (io) {
      const tallies = room.options.map((option) => option.votes || 0);
      const totalVotes = room.options.reduce((sum, option) => sum + option.votes, 0);
      
      io.to(roomId).emit('vote-updated', {
        roomId,
        tallies,
        totalVotes,
        optionId,
        voterCount: room.voters.length,
        uniqueVoters: room.voters.length
      });

       io.to('admin-dashboard-stream').emit('vote-updated', {
        roomId,
        tallies,
        totalVotes,
        optionId,
        voterCount: room.voters.length,
        uniqueVoters: room.voters.length
      });
    }

    res.json({
      message: 'Vote cast successfully',
      totalVotes: room.options.reduce((sum, option) => sum + option.votes, 0),
      uniqueVoters: room.voters.length
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUserRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await DecisionRoom.find({ creator: req.user._id }).sort({ createdAt: -1 });

    const roomsWithStats = rooms.map(room => ({
      id: room._id,
      title: room.title,
      description: room.description,
      options: room.options,
      deadline: room.deadline,
      roomId: room.roomId,
      isExpired: room.deadline ? new Date() > room.deadline : false,
      totalVotes: room.options.reduce((sum, option) => sum + option.votes, 0),
      createdAt: room.createdAt
    }));

    res.json({ rooms: roomsWithStats });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const room = await DecisionRoom.findOne({ roomId , creator: req.user._id});

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }


    const totalVotes = room.options.reduce((sum, option) => sum + option.votes, 0);
    const resultsWithPercentages = room.options.map(option => ({
      ...option.toObject(),
      percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
    }));

    res.json({
      results: {
        options: resultsWithPercentages,
        totalVotes,
        isExpired: room.deadline ? new Date() > room.deadline : false,
        deadline: room.deadline
      }
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getLiveTallies = async (req: Request, res: Response): Promise<void> => {
  const { roomId } = req.params;

  try {
    const room = await DecisionRoom.findOne({ roomId }).populate('creator', 'email');

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return 
    }

    const isExpired = room.deadline ? new Date() > room.deadline : false;

    // Only allow creator to see live tallies before deadline
    if (!isExpired && (room.creator as any).email !== req.user.email) {
      res.status(403).json({ message: "Only creator can view live tallies" });
      return 
    }

    const tallies = room.options.map((option) => option.votes || 0);
    res.json({ tallies });
    return 
  } catch (err) {
    console.error("Error fetching tallies:", err);
    res.status(500).json({ message: "Server error" });
    return 
  }
};

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    
    const room = await DecisionRoom.findOne({ roomId, creator: req.user._id });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    await room.deleteOne();

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Accreditation system functions
export const requestOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      res.status(400).json({ error: 'Invalid phone number format' });
      return;
    }

    const room = await DecisionRoom.findOne({ roomId });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (!room.requireAccreditation) {
      res.status(400).json({ error: 'This room does not require accreditation' });
      return;
    }

    // Find accredited voter
    const accreditedVoter = room.accreditedVoters.find(
      voter => voter.phoneNumber === phoneNumber
    );

    if (!accreditedVoter) {
      res.status(404).json({ error: 'Phone number not found in accredited voters list' });
      return;
    }

    if (accreditedVoter.hasVoted) {
      res.status(400).json({ error: 'You have already voted in this room' });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update accredited voter with OTP
    accreditedVoter.otpCode = otp;
    accreditedVoter.otpExpiresAt = otpExpiresAt;
    accreditedVoter.otpVerified = false;

    await room.save();

    // Log OTP to console (for development)
    console.log(`OTP code for ${phoneNumber}: ${otp}`);

    res.json({ 
      message: 'OTP sent successfully',
      phoneNumber: phoneNumber,
      expiresIn: '10 minutes'
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      res.status(400).json({ error: 'Phone number and OTP are required' });
      return;
    }

    const room = await DecisionRoom.findOne({ roomId });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const accreditedVoter = room.accreditedVoters.find(
      voter => voter.phoneNumber === phoneNumber
    );

    if (!accreditedVoter) {
      res.status(404).json({ error: 'Phone number not found' });
      return;
    }

    if (accreditedVoter.hasVoted) {
      res.status(400).json({ error: 'You have already voted in this room' });
      return;
    }

    if (!accreditedVoter.otpCode || accreditedVoter.otpCode !== otp) {
      res.status(400).json({ error: 'Invalid OTP' });
      return;
    }

    if (accreditedVoter.otpExpiresAt && isOTPExpired(accreditedVoter.otpExpiresAt)) {
      res.status(400).json({ error: 'OTP has expired' });
      return;
    }

    // Mark OTP as verified
    accreditedVoter.otpVerified = true;
    accreditedVoter.otpCode = undefined;
    accreditedVoter.otpExpiresAt = undefined;

    await room.save();

    res.json({ 
      message: 'OTP verified successfully',
      voterName: accreditedVoter.name,
      phoneNumber: phoneNumber
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addAccreditedVoters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { voters } = req.body;

    if (!voters || !Array.isArray(voters)) {
      res.status(400).json({ error: 'Voters array is required' });
      return;
    }

    const room = await DecisionRoom.findOne({ roomId, creator: req.user._id });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }


    // Validate and add voters
    const newVoters = [];
    for (const voter of voters) {
      if (!voter.phoneNumber || !voter.name) {
        continue;
      }

      if (!validatePhoneNumber(voter.phoneNumber)) {
        continue;
      }

      // Check if voter already exists
      const existingVoter = room.accreditedVoters.find(
        v => v.phoneNumber === voter.phoneNumber
      );

      if (!existingVoter) {
        newVoters.push({
          phoneNumber: voter.phoneNumber,
          name: voter.name,
          hasVoted: false,
          otpVerified: false
        });
      }
    }

    room.accreditedVoters.push(...newVoters);
    room.requireAccreditation = true;
    room.maxVoters = room.accreditedVoters.length;

    await room.save();

    res.json({
      message: 'Accredited voters added successfully',
      addedCount: newVoters.length,
      totalVoters: room.accreditedVoters.length
    });
  } catch (error) {
    console.error('Add accredited voters error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAccreditedVoters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = await DecisionRoom.findOne({ roomId, creator: req.user._id });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }



    const voters = room.accreditedVoters.map(voter => ({
      name: voter.name,
      phoneNumber: voter.phoneNumber,
      hasVoted: voter.hasVoted,
      otpVerified: voter.otpVerified
    }));

    res.json({ voters });
  } catch (error) {
    console.error('Get accredited voters error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

