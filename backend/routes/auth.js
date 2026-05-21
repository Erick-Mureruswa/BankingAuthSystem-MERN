import { Router } from 'express';
import { body } from 'express-validator';
import { register, oauthToken, revokeToken, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  register
);

// OAuth2 token endpoint — supports password, refresh_token, client_credentials
router.post(
  '/oauth/token',
  authLimiter,
  [
    body('grant_type').notEmpty().withMessage('grant_type is required'),
    body('client_id').notEmpty().withMessage('client_id is required'),
    body('client_secret').notEmpty().withMessage('client_secret is required'),
  ],
  validate,
  oauthToken
);

router.post('/revoke', protect, revokeToken);
router.get('/me', protect, getMe);

export default router;
