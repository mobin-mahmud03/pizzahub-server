import { Response } from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { MenuItem } from '../models/MenuItem.js';
import { AuthRequest } from '../middlewares/auth.js';

// Add review for menu item (Customer only)
export const addReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      res.status(403).json({ success: false, message: 'Only customers can leave reviews.' });
      return;
    }

    const { itemId, rating, comment } = req.body;

    if (!itemId || !rating || !comment) {
      res.status(400).json({ success: false, message: 'Item ID, rating (1-5), and comment are required.' });
      return;
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
      return;
    }

    const item = await MenuItem.findById(itemId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    // Check if customer already reviewed this item
    const existing = await Review.findOne({ itemId, customerId: req.user._id });
    if (existing) {
      existing.rating = numRating;
      existing.comment = comment.trim();
      await existing.save();
    } else {
      await Review.create({
        itemId,
        customerId: req.user._id,
        rating: numRating,
        comment: comment.trim(),
      });
    }

    // Recalculate average rating
    const allReviews = await Review.find({ itemId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    item.averageRating = Number(avg.toFixed(1));
    item.numReviews = allReviews.length;
    await item.save();

    res.status(200).json({
      success: true,
      message: 'Review saved successfully!',
      data: {
        averageRating: item.averageRating,
        numReviews: item.numReviews,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reviews for an item
export const getItemReviews = async (req: any, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;

    const reviews = await Review.find({ itemId })
      .populate('customerId', 'name image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
