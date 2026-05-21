import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAccounts,
  getAccount,
  createAccount,
  getBalance,
  updateAccountStatus,
  getAccountTransactions,
} from '../controllers/accountController.js';
import { protect, authorize, requireScope } from '../middleware/auth.js';
import { apiLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { auditLog } from '../middleware/auditLogger.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(protect, apiLimiter);

router.get('/', requireScope('accounts:read'), auditLog('LIST_ACCOUNTS', 'Account'), getAccounts);

router.post(
  '/',
  requireScope('accounts:write'),
  [
    body('type').isIn(['checking', 'savings', 'loan', 'fixed_deposit']).withMessage('Invalid account type'),
    body('initialDeposit').optional().isFloat({ min: 0 }),
  ],
  validate,
  auditLog('CREATE_ACCOUNT', 'Account'),
  createAccount
);

router.get('/:id', requireScope('accounts:read'), auditLog('VIEW_ACCOUNT', 'Account'), getAccount);
router.get('/:id/balance', requireScope('accounts:read'), auditLog('VIEW_BALANCE', 'Account'), getBalance);
router.get('/:id/transactions', requireScope('transactions:read'), auditLog('LIST_ACCOUNT_TRANSACTIONS', 'Account'), getAccountTransactions);

router.patch(
  '/:id/status',
  authorize('admin', 'teller'),
  adminLimiter,
  [body('status').isIn(['active', 'frozen', 'closed']).withMessage('Invalid status')],
  validate,
  auditLog('UPDATE_ACCOUNT_STATUS', 'Account'),
  updateAccountStatus
);

export default router;
