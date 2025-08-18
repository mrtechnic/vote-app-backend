import express from 'express';
import { optionalAuth } from '../middlewares/optionalAuth';
import { castVote } from '../controllers/voteController';

const router = express.Router();

router.post('/:inviteCode', optionalAuth, castVote);

export default router;