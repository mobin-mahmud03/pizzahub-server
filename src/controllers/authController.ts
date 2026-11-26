import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';

// Better Auth handles register, login, and Google OAuth.
// This controller only exposes profile endpoints that require
// the server's own role/subscription data from the database.

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

    // Security: users must NOT be able to change role or subscription fields.
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
