import express from 'express';
import { fetchLoggedInUser, login, logOutUser, register } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.get('/getLoggedInUser', authenticateToken, fetchLoggedInUser);
router.get('/logOut', logOutUser);


export default router;
