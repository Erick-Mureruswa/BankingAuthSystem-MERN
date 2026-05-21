import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OAuthToken from '../models/OAuthToken.js';

// Verify Bearer JWT access token (issued by our OAuth2 /token endpoint)
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'unauthorized', message: 'No access token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
      return res.status(401).json({ error: 'unauthorized', message: msg });
    }

    // Check token is not revoked in DB
    const storedToken = await OAuthToken.findOne({ accessToken: token, revoked: false });
    if (!storedToken) {
      return res.status(401).json({ error: 'unauthorized', message: 'Token has been revoked' });
    }

    const user = await User.findById(decoded.sub).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'unauthorized', message: 'User not found or inactive' });
    }

    req.user = user;
    req.tokenRecord = storedToken;
    next();
  } catch (err) {
    next(err);
  }
};

// Role-based access control guard
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Role '${req.user.role}' is not allowed to access this resource`,
      });
    }
    next();
  };
};

// Scope-based guard (OAuth2 scopes)
export const requireScope = (...requiredScopes) => {
  return (req, res, next) => {
    const tokenScopes = req.tokenRecord?.scope || [];
    const hasScope = requiredScopes.every((s) => tokenScopes.includes(s));
    if (!hasScope) {
      return res.status(403).json({
        error: 'insufficient_scope',
        message: `Required scopes: ${requiredScopes.join(', ')}`,
      });
    }
    next();
  };
};
