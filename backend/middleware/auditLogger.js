import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';

// Express middleware — wraps res.json to capture status and auto-logs after response
export const auditLog = (action, resource) => {
  return (req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      const duration = Date.now() - start;
      const status = res.statusCode < 400 ? 'success' : 'failure';

      AuditLog.create({
        userId: req.user?._id,
        action,
        resource,
        resourceId: req.params?.id,
        method: req.method,
        endpoint: req.originalUrl,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        status,
        duration,
        details: {
          query: req.query,
          body: sanitizeBody(req.body),
        },
        errorMessage: status === 'failure' ? body?.message : undefined,
      }).catch((err) => logger.error('Audit log write failed', { err: err.message }));

      return originalJson(body);
    };

    next();
  };
};

// Strips sensitive fields before logging request bodies
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const copy = { ...body };
  ['password', 'confirmPassword', 'currentPassword', 'pin', 'cvv', 'cardNumber'].forEach(
    (f) => delete copy[f]
  );
  return copy;
}

// Lightweight request logger for non-sensitive routes (uses winston)
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
    });
  });
  next();
};
