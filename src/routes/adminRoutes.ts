import { Router } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  toggleBlockUser,
  getAdminMenuItems,
  updateMenuItemStatus,
  deleteMenuItemAdmin,
  getAdminTransactions,
} from '../controllers/adminController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// All routes require Admin role
router.use(verifyToken, requireRole(['admin']));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.patch('/users/:id/block', toggleBlockUser);
router.get('/menu-items', getAdminMenuItems);
router.patch('/menu-items/:id/status', updateMenuItemStatus);
router.delete('/menu-items/:id', deleteMenuItemAdmin);
router.get('/transactions', getAdminTransactions);

export default router;
