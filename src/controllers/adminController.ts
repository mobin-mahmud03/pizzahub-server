import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { MenuItem } from '../models/MenuItem.js';
import { Order } from '../models/Order.js';
import { Transaction } from '../models/Transaction.js';

// Admin: Overview Dashboard Statistics
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalMenuItems = await MenuItem.countDocuments();
    const pendingMenuItems = await MenuItem.countDocuments({ status: 'pending' });
    const totalOrders = await Order.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Recent orders and recent transactions for dashboard charts
    const recentTransactions = await Transaction.find()
      .populate('vendorId', 'name businessName email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalMenuItems,
        pendingMenuItems,
        totalOrders,
        totalTransactions,
        totalRevenue,
        recentTransactions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Manage Users (Search, Filter by role)
export const getAdminUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role, page = '1', limit = '20' } = req.query;

    const query: any = {};

    if (role && role !== 'All') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
        { businessName: { $regex: search as string, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Block / Unblock User
export const toggleBlockUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    // Protect against blocking an admin
    if (user.role === 'admin') {
      res.status(403).json({ success: false, message: 'Admin accounts cannot be blocked.' });
      return;
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.`,
      data: {
        id: user._id,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Manage Menu Items (Search, Filter by status/category)
export const getAdminMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, category, page = '1', limit = '20' } = req.query;

    const query: any = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { itemName: { $regex: search as string, $options: 'i' } },
        { location: { $regex: search as string, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await MenuItem.countDocuments(query);
    const items = await MenuItem.find(query)
      .populate('vendorId', 'name businessName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Review Pending Item (Approve, Reject, or Change Status)
export const updateMenuItemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'inactive', 'pending'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value.' });
      return;
    }

    const item = await MenuItem.findById(id);
    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    item.status = status;
    await item.save();

    res.status(200).json({
      success: true,
      message: `Menu item status updated to ${status}.`,
      data: item,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Delete inappropriate menu item
export const deleteMenuItemAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findById(id);

    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    await MenuItem.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted by administrator.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: View Platform Transactions (Strictly read-only)
export const getAdminTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Transaction.countDocuments();
    const transactions = await Transaction.find()
      .populate('vendorId', 'name businessName email image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
