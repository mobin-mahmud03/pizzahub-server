import { Router } from 'express';
import {
  getMenuItems,
  getFeaturedItems,
  getMenuItemById,
  getVendorItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menuController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/', getMenuItems);
router.get('/featured', getFeaturedItems);
router.get('/:id', getMenuItemById);

// Vendor-protected routes
router.get('/vendor/my-items', verifyToken, requireRole(['vendor']), getVendorItems);
router.post('/', verifyToken, requireRole(['vendor']), createMenuItem);
router.put('/:id', verifyToken, requireRole(['vendor']), updateMenuItem);
router.delete('/:id', verifyToken, requireRole(['vendor']), deleteMenuItem);

export default router;
