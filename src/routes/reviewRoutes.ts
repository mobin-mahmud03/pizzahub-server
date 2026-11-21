import { Router } from 'express';
import { addReview, getItemReviews } from '../controllers/reviewController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

router.get('/:itemId', getItemReviews);
router.post('/', verifyToken, addReview);

export default router;
