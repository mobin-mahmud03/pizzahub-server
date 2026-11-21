import { Router } from 'express';
import {
  createCheckoutSession,
  verifyTestPayment,
} from '../controllers/stripeController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// Vendor checkout session creation
router.post('/create-checkout-session', verifyToken, requireRole(['vendor']), createCheckoutSession);

// Fallback verification endpoint for development testing
router.post('/verify-test-payment', verifyToken, requireRole(['vendor']), verifyTestPayment);

export default router;
