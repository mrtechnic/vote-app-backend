import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export const authenticateToken = async (
  req: Request, 
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  // Only check the Authorization header
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts[0] === "Bearer" && parts[1]) {
      token = parts[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: "Token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log("Decoded token:", decoded);

    const user = await User.findById(decoded.userId);
    console.log("Found user:", user);

    if (!user) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
