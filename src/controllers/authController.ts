import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User.js';
import { AuthRequest } from '../middlewares/auth.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (userId: string, role: UserRole): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.sign({ userId, role }, secret, { expiresIn: JWT_EXPIRES_IN as any });
};

// Password validation: min 6 chars, 1 uppercase, 1 lowercase
const isValidPassword = (password: string): boolean => {
  if (!password || password.length < 6) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  return hasUpper && hasLower;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, image, role, businessName } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
      return;
    }

    // Role selection must strictly be Vendor or Customer
    if (role !== 'vendor' && role !== 'customer') {
      res.status(400).json({
        success: false,
        message: 'Invalid role. Public registration only allows "customer" or "vendor". Admin accounts cannot be created publicly.',
      });
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long and contain at least one uppercase and one lowercase letter.',
      });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      image: image || '',
      role,
      businessName: role === 'vendor' ? businessName || `${name}'s Pizzeria` : '',
      subscriptionPlan: 'free',
      isBlocked: false,
    });

    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error during registration.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact support.',
      });
      return;
    }

    if (!user.password) {
      res.status(400).json({ success: false, message: 'Please sign in using Google.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error during sign in.' });
  }
};


export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        image: req.user.image,
        role: req.user.role,
        businessName: req.user.businessName,
        subscriptionPlan: req.user.subscriptionPlan,
        subscriptionExpiresAt: req.user.subscriptionExpiresAt,
        favorites: req.user.favorites || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, image, businessName } = req.body;

    // Security requirement: Users must NOT be able to change role or subscription status
    if (name) req.user.name = name.trim();
    if (image !== undefined) req.user.image = image;
    if (req.user.role === 'vendor' && businessName) {
      req.user.businessName = businessName.trim();
    }

    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        image: req.user.image,
        role: req.user.role,
        businessName: req.user.businessName,
        subscriptionPlan: req.user.subscriptionPlan,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Profile update failed.' });
  }
};
