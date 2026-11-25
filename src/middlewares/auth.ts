import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    if (!decoded || !decoded.userId) {
      res.status(401).json({ success: false, message: 'Invalid or expired token.' });
      return;
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      res.status(401).json({ success: false, message: 'User account not found.' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        success: false,
        message: 'Your account has been blocked. You cannot access protected features.',
      });
      return;
    }

    if (user.subscriptionPlan === 'premium' && user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
      user.subscriptionPlan = 'free';
      await user.save();
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
      return;
    }
    res.status(401).json({ success: false, message: 'Authentication failed. Invalid token.' });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] role(s).`,
      });
      return;
    }

    next();
  };
};
