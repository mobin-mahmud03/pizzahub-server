import { Router } from 'express';
import {
  createOrder,
  getCustomerOrders,
  getVendorOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderById,
} from '../controllers/orderController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// Customer creates order
router.post('/', verifyToken, createOrder);

// Customer view their orders
router.get('/my-orders', verifyToken, getCustomerOrders);

// Vendor view incoming orders
router.get('/vendor-orders', verifyToken, requireRole(['vendor']), getVendorOrders);

// Vendor accept/reject order
router.patch('/:id/status', verifyToken, requireRole(['vendor']), updateOrderStatus);

// Customer cancel pending order
router.patch('/:id/cancel', verifyToken, cancelOrder);

// Single order details with timeline
router.get('/:id', verifyToken, getOrderById);

export default router;
