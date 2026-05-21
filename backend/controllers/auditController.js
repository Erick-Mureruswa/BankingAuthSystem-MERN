import AuditLog from '../models/AuditLog.js';

// GET /api/audit-logs  (admin only)
export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, action, resource, status, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = new RegExp(action, 'i');
    if (resource) filter.resource = resource;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'name email role'),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/audit-logs/stats  (admin only)
export const getAuditStats = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total24h, failures24h, topActions, topResources] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: since } }),
      AuditLog.countDocuments({ createdAt: { $gte: since }, status: 'failure' }),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ total24h, failures24h, topActions, topResources });
  } catch (err) {
    next(err);
  }
};
