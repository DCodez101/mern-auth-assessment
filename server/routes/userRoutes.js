import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getCurrentUser } from '../controllers/userController.js';

const router = Router();

router.get('/me', authMiddleware, getCurrentUser);

export default router;
