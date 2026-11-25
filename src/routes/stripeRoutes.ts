import { Router } from 'express';
import { createCheckoutSession } from '../controllers/stripeController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// Vendor checkout session creation
router.post('/create-checkout-session', verifyToken, requireRole(['vendor']), createCheckoutSession);

export default router;
