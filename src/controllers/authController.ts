import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authCookieName } from '../utils/constants';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const register = async (req: Request, res: Response): Promise<void> => {
  console.log("register controller ran")
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password){
     res.status(400).json({error: 'All fields are required'});
      return 
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

const user = new User({
  name,
  email,
  password: hashedPassword, 
});


    await user.save();

    res.status(201).json({ 
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({error: 'All fields are required'})
    }

    const user = await User.findOne({ email });
    console.log(user)
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(isMatch)
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });

  res.cookie(authCookieName, token, {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  httpOnly: false, // prevents JavaScript access (more secure)
  secure: process.env.NODE_ENV === "production", // cookie only sent over HTTPS in production
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // prevents CSRF attacks
  path: "/", // cookie is valid for the whole site
});


    res.status(200).json({ 
      message: 'Log In successful',
      token,
      user: { id: user._id, name: user.name, email: user.email } 

    });
    return
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const fetchLoggedInUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user
    delete user.password
    res.status(200).json({ user });
    return
  } catch (error) {
    console.error('')
    res.status(500).json({ error: 'Server error' });
  }
}

export const logOutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie(authCookieName, {

    });
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
