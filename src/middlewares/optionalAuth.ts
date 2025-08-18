import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';


export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // No token, continue without user
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = user; // Attach user to request
    }
  } catch (err) {
    // Token is invalid or expired, do nothing
  }

  next(); 
};
