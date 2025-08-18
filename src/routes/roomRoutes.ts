import express from 'express';
import {
  createRoom,
  getRoomById,
  voteInRoom,
  getUserRooms,
  getResults,
  getLiveTallies,
  deleteRoom,
  requestOTP,
  verifyOTP,
  addAccreditedVoters,
  getAccreditedVoters,
} from '../controllers/roomController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

// Only authenticated users can create or view their own rooms
router.post('/', authenticateToken, createRoom);
router.get('/my-rooms', authenticateToken, getUserRooms);

// Public access to room and voting
router.get('/:roomId', getRoomById);          
router.post('/:roomId/vote', voteInRoom);     

// Only authenticated users (specifically the creator) can see results/tallies
router.get('/:roomId/results', authenticateToken, getResults);
router.get('/:roomId/tallies', authenticateToken, getLiveTallies);

// Only room creator can delete their room
router.delete('/:roomId', authenticateToken, deleteRoom);

// Accreditation system routes
router.post('/:roomId/request-otp', requestOTP);
router.post('/:roomId/verify-otp', verifyOTP);
router.post('/:roomId/add-accredited-voters', authenticateToken, addAccreditedVoters);
router.get('/:roomId/accredited-voters', authenticateToken, getAccreditedVoters);

export default router;
