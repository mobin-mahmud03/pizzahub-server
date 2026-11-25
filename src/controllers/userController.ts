import { Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AuthRequest } from '../middlewares/auth.js';

// Toggle favorite menu item
export const toggleFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { itemId } = req.body;
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      res.status(400).json({ success: false, message: 'Invalid or missing item ID (must be a valid ObjectId).' });
      return;
    }

    const index = req.user.favorites.indexOf(itemId);
    let isFavorited = false;

    if (index > -1) {
      req.user.favorites.splice(index, 1);
      isFavorited = false;
    } else {
      req.user.favorites.push(itemId);
      isFavorited = true;
    }

    await req.user.save();

    res.status(200).json({
      success: true,
      message: isFavorited ? 'Added to favorites' : 'Removed from favorites',
      isFavorited,
      favorites: req.user.favorites,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user favorites
export const getFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const userWithFavs = await User.findById(req.user._id).populate({
      path: 'favorites',
      populate: { path: 'vendorId', select: 'name businessName image' },
    });

    res.status(200).json({
      success: true,
      data: userWithFavs?.favorites || [],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
