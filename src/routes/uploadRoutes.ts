import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/uploadController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

const router = Router();

router.post(
  '/',
  verifyToken,
  requireRole(['vendor']),
  upload.single('image'),
  uploadImage
);

export default router;
