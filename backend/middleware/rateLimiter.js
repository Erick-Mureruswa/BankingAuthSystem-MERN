import rateLimit from 'express-rate-limit';

const buildLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });

// Strict limiter for auth endpoints (brute-force protection)
export const authLimiter = buildLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  'Too many authentication attempts. Please try again in 15 minutes.'
);

// General API limiter
export const apiLimiter = buildLimiter(
  60 * 1000, // 1 minute
  100,
  'Too many requests. Please slow down.'
);

// Tight limiter for financial transactions
export const transactionLimiter = buildLimiter(
  60 * 1000, // 1 minute
  20,
  'Transaction rate limit exceeded. Maximum 20 transactions per minute.'
);

// Admin endpoints
export const adminLimiter = buildLimiter(
  60 * 1000,
  50,
  'Admin API rate limit exceeded.'
);
