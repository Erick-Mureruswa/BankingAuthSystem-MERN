import { Router } from 'express';
import { getAuditLogs, getAuditStats } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(protect, authorize('admin'), adminLimiter);

router.get('/', getAuditLogs);
router.get('/stats', getAuditStats);

export default router;
