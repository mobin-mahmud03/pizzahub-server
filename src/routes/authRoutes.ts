import { Router } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/register', rateLimiter(10, 60000), register);
router.post('/login', rateLimiter(10, 60000), login);
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);

export default router;
