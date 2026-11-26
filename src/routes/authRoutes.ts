import { Router } from 'express';
import { getMe, updateProfile } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/auth.js';

// Better Auth handles /register, /login, and /google via its own
// Next.js API route handler at /api/auth/[...all].
// The server only exposes profile endpoints that need DB-backed role data.

const router = Router();

router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);

export default router;
