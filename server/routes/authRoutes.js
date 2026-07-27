import { Router } from 'express';
import { body } from 'express-validator';
import { signup, login, refresh, logout } from '../controllers/authController.js';

const router = Router();

router.post(
  '/signup',
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  signup
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
