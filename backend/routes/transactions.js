import { Router } from 'express';
import { body } from 'express-validator';
import {
  transfer,
  deposit,
  withdraw,
  getTransactions,
  getTransaction,
} from '../controllers/transactionController.js';
import { protect, requireScope } from '../middleware/auth.js';
import { transactionLimiter, apiLimiter } from '../middleware/rateLimiter.js';
import { auditLog } from '../middleware/auditLogger.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(protect);

const amountValidator = body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0');

router.post(
  '/transfer',
  transactionLimiter,
  requireScope('transactions:write'),
  [
    body('fromAccountId').notEmpty().withMessage('fromAccountId required'),
    body('toAccountId').notEmpty().withMessage('toAccountId required'),
    amountValidator,
  ],
  validate,
  auditLog('TRANSFER', 'Transaction'),
  transfer
);

router.post(
  '/deposit',
  transactionLimiter,
  requireScope('transactions:write'),
  [body('accountId').notEmpty(), amountValidator],
  validate,
  auditLog('DEPOSIT', 'Transaction'),
  deposit
);

router.post(
  '/withdraw',
  transactionLimiter,
  requireScope('transactions:write'),
  [body('accountId').notEmpty(), amountValidator],
  validate,
  auditLog('WITHDRAWAL', 'Transaction'),
  withdraw
);

router.get('/', requireScope('transactions:read'), apiLimiter, auditLog('LIST_TRANSACTIONS', 'Transaction'), getTransactions);
router.get('/:id', requireScope('transactions:read'), apiLimiter, auditLog('VIEW_TRANSACTION', 'Transaction'), getTransaction);

export default router;
