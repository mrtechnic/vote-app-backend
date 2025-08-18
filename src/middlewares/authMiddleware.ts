import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import dotenv from 'dotenv';
import { authCookieName } from '../utils/constants';

dotenv.config();



const JWT_SECRET = process.env.JWT_SECRET as string;

export const authenticateToken = async (
  req: Request, 
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies[authCookieName]

  if (!token) {
    res.status(401).json({ error: 'Token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};
