import { Router } from 'express';
import { toggleFavorite, getFavorites } from '../controllers/userController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

router.use(verifyToken);
router.post('/favorites/toggle', toggleFavorite);
router.get('/favorites', getFavorites);

export default router;
