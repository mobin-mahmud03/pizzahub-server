import { Response } from 'express';
import mongoose from 'mongoose';
import { Order, IOrder, OrderStatus } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { AuthRequest } from '../middlewares/auth.js';

// Customer: Create a new pizza order
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required to place an order.' });
      return;
    }

    // Role check: Admins cannot place customer orders
    if (req.user.role === 'admin') {
      res.status(403).json({ success: false, message: 'Admins cannot place food orders.' });
      return;
    }

    const { itemId, deliveryDate, deliveryAddress, message } = req.body;

    if (!itemId || !deliveryDate || !deliveryAddress) {
      res.status(400).json({
        success: false,
        message: 'Menu item, delivery date, and delivery address are required.',
      });
      return;
    }

    const item = await MenuItem.findById(itemId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found.' });
      return;
    }

    // Only approved and active items can be ordered
    if (item.status !== 'approved') {
      res.status(400).json({
        success: false,
        message: 'This menu item is currently unavailable for ordering.',
      });
      return;
    }

    // Rule: Vendors cannot order their own items
    if (item.vendorId.toString() === req.user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot place an order for your own menu item.',
      });
      return;
    }

    const parsedDeliveryDate = new Date(deliveryDate);

    // Rule: Prevent duplicate active orders for the same item and delivery date
    const startOfDay = new Date(parsedDeliveryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDeliveryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const duplicateOrder = await Order.findOne({
      customerId: req.user._id,
      itemId: item._id,
      deliveryDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'accepted'] },
    });

    if (duplicateOrder) {
      res.status(400).json({
        success: false,
        message: 'You already have an active order for this item on the selected delivery date.',
      });
      return;
    }

    const newOrder = await Order.create({
      itemId: item._id,
      vendorId: item.vendorId,
      customerId: req.user._id,
      deliveryDate: parsedDeliveryDate,
      deliveryAddress: deliveryAddress.trim(),
      message: message ? message.trim() : '',
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Order submitted by customer. Awaiting restaurant acceptance.',
        },
      ],
    });

    const populatedOrder = await Order.findById(newOrder._id)
      .populate('itemId', 'itemName price images category')
      .populate('vendorId', 'name businessName image')
      .populate('customerId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Pizza order placed successfully!',
      data: populatedOrder,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Customer: Get my orders
export const getCustomerOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const orders = await Order.find({ customerId: req.user._id })
      .populate('itemId', 'itemName price images category')
      .populate('vendorId', 'name businessName image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Vendor: Get incoming customer orders
export const getVendorOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      res.status(403).json({ success: false, message: 'Vendor access required.' });
      return;
    }

    const orders = await Order.find({ vendorId: req.user._id })
      .populate('itemId', 'itemName price images category')
      .populate('customerId', 'name email image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Vendor: Accept or reject customer order
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      res.status(403).json({ success: false, message: 'Vendor access required.' });
      return;
    }

    const { id } = req.params;
    const { status, note } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, message: 'Order status can only be updated to accepted or rejected.' });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Rule: Vendors cannot modify orders that belong to other vendors
    if (order.vendorId.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot modify orders for another restaurant.' });
      return;
    }

    // Rule: Only pending orders can be accepted or rejected, and only once
    if (order.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Order has already been ${order.status} and cannot be modified again.`,
      });
      return;
    }

    order.status = status as OrderStatus;
    order.statusHistory.push({
      status: status as OrderStatus,
      timestamp: new Date(),
      note: note || (status === 'accepted' ? 'Order accepted by restaurant and is in preparation.' : 'Order rejected by restaurant.'),
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order successfully ${status}.`,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Customer: Cancel pending order
export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Rule: Customers cannot change or cancel another customer's order
    if (order.customerId.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot cancel another customer’s order.' });
      return;
    }

    // Rule: Cannot cancel an order that is already accepted, rejected, or cancelled
    if (order.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel an order that is already ${order.status}.`,
      });
      return;
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: 'Order cancelled by customer.',
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Single order details with timeline
export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('itemId')
      .populate('vendorId', 'name businessName image email')
      .populate('customerId', 'name email image');

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Check authorization: customer, vendor of this order, or admin
    const isCustomer = order.customerId._id.toString() === req.user._id.toString();
    const isVendor = order.vendorId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isVendor && !isAdmin) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
