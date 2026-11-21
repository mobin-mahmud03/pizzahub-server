import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MenuItem, IMenuItem } from '../models/MenuItem.js';
import { AuthRequest } from '../middlewares/auth.js';

// Public: Get menu items with search, filter, and sorting
export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, location, sort, page = '1', limit = '12' } = req.query;

    const query: any = {
      status: 'approved', // Only approved items shown publicly
    };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (location && location !== 'All') {
      query.location = { $regex: location as string, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { itemName: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
        { location: { $regex: search as string, $options: 'i' } },
      ];
    }

    // Challenge 1: Advanced sorting
    let sortOptions: any = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'rating') {
      sortOptions = { averageRating: -1 };
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await MenuItem.countDocuments(query);
    const items = await MenuItem.find(query)
      .populate('vendorId', 'name businessName image subscriptionPlan')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: Get featured items (at least 6 approved items)
export const getFeaturedItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await MenuItem.find({ status: 'approved' })
      .populate('vendorId', 'name businessName image subscriptionPlan')
      .sort({ averageRating: -1, createdAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public/Private: Get single item by ID
export const getMenuItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Invalid menu item ID.' });
      return;
    }

    const item = await MenuItem.findById(id).populate(
      'vendorId',
      'name businessName image email subscriptionPlan'
    );

    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Vendor: Get vendor's own items
export const getVendorItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      res.status(403).json({ success: false, message: 'Vendor access required.' });
      return;
    }

    const items = await MenuItem.find({ vendorId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Vendor: Add menu item
export const createMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      res.status(403).json({ success: false, message: 'Vendor access required.' });
      return;
    }

    const { itemName, category, description, price, location, images } = req.body;

    if (!itemName || !category || !description || price === undefined || !location || !images || !images.length) {
      res.status(400).json({
        success: false,
        message: 'All fields (Item Name, Category, Description, Price, Location, Image) are required.',
      });
      return;
    }

    // Subscription Limit Check: Free plan max 3 active items. Premium: unlimited.
    if (req.user.subscriptionPlan !== 'premium') {
      const activeCount = await MenuItem.countDocuments({
        vendorId: req.user._id,
        status: { $in: ['approved', 'pending'] },
      });

      if (activeCount >= 3) {
        res.status(403).json({
          success: false,
          code: 'UPGRADE_REQUIRED',
          message: 'Free plan limit reached! You can publish up to 3 active menu items. Please upgrade to Premium for unlimited items.',
        });
        return;
      }
    }

    const newItem = await MenuItem.create({
      vendorId: req.user._id,
      itemName: itemName.trim(),
      category,
      description: description.trim(),
      price: Number(price),
      location: location.trim(),
      images: Array.isArray(images) ? images : [images],
      status: 'pending', // Default status pending until admin approves
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created and submitted for Admin approval.',
      data: newItem,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Vendor: Update own item
export const updateMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      res.status(403).json({ success: false, message: 'Vendor access required.' });
      return;
    }

    const { id } = req.params;
    const item = await MenuItem.findById(id);

    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    // Verify ownership
    if (item.vendorId.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'You can only edit your own menu items.' });
      return;
    }

    const { itemName, category, description, price, location, images, status } = req.body;

    if (itemName) item.itemName = itemName.trim();
    if (category) item.category = category;
    if (description) item.description = description.trim();
    if (price !== undefined) item.price = Number(price);
    if (location) item.location = location.trim();
    if (images && images.length) item.images = Array.isArray(images) ? images : [images];

    // Vendor can toggle active/inactive availability, but not approve themselves
    if (status && (status === 'inactive' || status === 'approved')) {
      // If item was already approved, vendor can toggle between approved and inactive
      if (item.status === 'approved' && status === 'inactive') {
        item.status = 'inactive';
      } else if (item.status === 'inactive' && status === 'approved') {
        item.status = 'approved';
      }
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully.',
      data: item,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Vendor: Delete own item
export const deleteMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      res.status(403).json({ success: false, message: 'Vendor access required.' });
      return;
    }

    const { id } = req.params;
    const item = await MenuItem.findById(id);

    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    if (item.vendorId.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'You can only delete your own menu items.' });
      return;
    }

    await MenuItem.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
