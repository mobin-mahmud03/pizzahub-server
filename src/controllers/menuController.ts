import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MenuItem, IMenuItem } from '../models/MenuItem.js';
import { AuthRequest } from '../middlewares/auth.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { createMenuItemSchema, updateMenuItemSchema } from '../validations/menuValidation.js';

const SEED_PIZZAS = [
  {
    _id: '67401a011000000000000001',
    itemName: 'Margherita Classica',
    category: 'Classic Pizzas',
    description: 'San Marzano tomato sauce, fresh buffalo mozzarella, fragrant sweet basil, extra virgin olive oil.',
    price: 14.99,
    location: 'Downtown Brooklyn, NY',
    images: ['https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800'],
    status: 'approved',
    averageRating: 4.9,
    numReviews: 24,
    vendorId: {
      _id: 'v1',
      name: 'Mario Rossi',
      businessName: "Mario's Authentic Pizzeria",
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
      subscriptionPlan: 'premium',
    },
  },
  {
    _id: '67401a011000000000000002',
    itemName: 'Pepperoni Inferno',
    category: 'Classic Pizzas',
    description: 'Loaded with hand-cut spicy pepperoni cups, mozzarella blend, crushed red pepper, and honey drizzle.',
    price: 17.5,
    location: 'Downtown Brooklyn, NY',
    images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800'],
    status: 'approved',
    averageRating: 4.8,
    numReviews: 31,
    vendorId: {
      _id: 'v1',
      name: 'Mario Rossi',
      businessName: "Mario's Authentic Pizzeria",
      subscriptionPlan: 'premium',
    },
  },
  {
    _id: '67401a011000000000000003',
    itemName: 'Garden Veggie Supreme',
    category: 'Vegetarian Pizzas',
    description: 'Roasted bell peppers, caramelized red onions, baby spinach, kalamata olives, button mushrooms, and fontina.',
    price: 16.0,
    location: 'Greenwich Village, NY',
    images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'],
    status: 'approved',
    averageRating: 4.7,
    numReviews: 18,
    vendorId: {
      _id: 'v2',
      name: 'Luigi Moretti',
      businessName: "Luigi's Wood-Fired Slice",
      subscriptionPlan: 'free',
    },
  },
  {
    _id: '67401a011000000000000004',
    itemName: 'Quattro Formaggi Bianca',
    category: 'Vegetarian Pizzas',
    description: 'White garlic base, aged provolone, fior di latte, gorgonzola dolce, and freshly grated pecorino romano.',
    price: 18.25,
    location: 'Greenwich Village, NY',
    images: ['https://images.unsplash.com/photo-1573821663912-569905455b1c?w=800'],
    status: 'approved',
    averageRating: 4.9,
    numReviews: 15,
    vendorId: {
      _id: 'v2',
      name: 'Luigi Moretti',
      businessName: "Luigi's Wood-Fired Slice",
      subscriptionPlan: 'free',
    },
  },
  {
    _id: '67401a011000000000000005',
    itemName: 'Carnivore Meat Feast',
    category: 'Meat Lovers',
    description: 'Smoky bacon lardons, Italian spicy sausage, smoked ham, seasoned ground beef, and signature BBQ glaze.',
    price: 19.99,
    location: 'Downtown Brooklyn, NY',
    images: ['https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=800'],
    status: 'approved',
    averageRating: 4.9,
    numReviews: 42,
    vendorId: {
      _id: 'v1',
      name: 'Mario Rossi',
      businessName: "Mario's Authentic Pizzeria",
      subscriptionPlan: 'premium',
    },
  },
  {
    _id: '67401a011000000000000006',
    itemName: 'Truffle Mushroom Gourmet',
    category: 'Specialty / Gourmet Pizzas',
    description: 'Wild forest chanterelles, porcini cream, white truffle oil, shaved parmigiano, and organic thyme.',
    price: 22.5,
    location: 'Downtown Brooklyn, NY',
    images: ['https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800'],
    status: 'approved',
    averageRating: 5.0,
    numReviews: 29,
    vendorId: {
      _id: 'v1',
      name: 'Mario Rossi',
      businessName: "Mario's Authentic Pizzeria",
      subscriptionPlan: 'premium',
    },
  },
];

// Public: Get menu items with search, filter, and sorting
export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, location, sort, page = '1', limit = '12' } = req.query;

    // Fast response if DB is offline
    if (mongoose.connection.readyState !== 1) {
      let filtered = [...SEED_PIZZAS];
      if (category && category !== 'All') filtered = filtered.filter((i) => i.category === category);
      if (location && location !== 'All') filtered = filtered.filter((i) => i.location.includes(location as string));
      if (search) filtered = filtered.filter((i) => i.itemName.toLowerCase().includes((search as string).toLowerCase()));
      if (sort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
      if (sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);

      res.status(200).json({
        success: true,
        data: filtered,
        pagination: { total: filtered.length, page: 1, pages: 1, limit: 12 },
      });
      return;
    }

    const query: any = {
      status: 'approved', // Only approved items shown publicly
    };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (location && location !== 'All') {
      query.location = { $regex: escapeRegex(location as string), $options: 'i' };
    }

    if (search) {
      const escapedSearch = escapeRegex(search as string);
      query.$or = [
        { itemName: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { location: { $regex: escapedSearch, $options: 'i' } },
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
      .limit(30);

    const sortedItems = [...items].sort((a, b) => {
      const aPremium = (a.vendorId as any)?.subscriptionPlan === 'premium' ? 1 : 0;
      const bPremium = (b.vendorId as any)?.subscriptionPlan === 'premium' ? 1 : 0;
      return bPremium - aPremium;
    });

    res.status(200).json({
      success: true,
      data: sortedItems.slice(0, 6),
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
      'name businessName image subscriptionPlan'
    );

    if (!item || item.status !== 'approved') {
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

    const validation = createMenuItemSchema.safeParse(req.body);
    if (!validation.success) {
      const message = validation.error.issues.map((i) => i.message).join('. ');
      res.status(400).json({ success: false, message });
      return;
    }

    const { itemName, category, description, price, location, images } = validation.data;

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

    const validation = updateMenuItemSchema.safeParse(req.body);
    if (!validation.success) {
      const message = validation.error.issues.map((i) => i.message).join('. ');
      res.status(400).json({ success: false, message });
      return;
    }

    const { itemName, category, description, price, location, images, status } = validation.data;

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
        if (req.user.subscriptionPlan !== 'premium') {
          const activeCount = await MenuItem.countDocuments({
            vendorId: req.user._id,
            status: { $in: ['approved', 'pending'] },
            _id: { $ne: item._id },
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
