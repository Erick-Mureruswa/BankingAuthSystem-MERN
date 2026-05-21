import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import OAuthToken from '../models/OAuthToken.js';
import AuditLog from '../models/AuditLog.js';

const VALID_CLIENTS = {
  [process.env.OAUTH_CLIENT_ID]: {
    secret: process.env.OAUTH_CLIENT_SECRET,
    grants: ['password', 'refresh_token', 'client_credentials'],
    scopes: ['accounts:read', 'accounts:write', 'transactions:read', 'transactions:write', 'admin'],
  },
};

const VALID_SCOPES = ['accounts:read', 'accounts:write', 'transactions:read', 'transactions:write', 'admin'];

function issueTokens(userId, clientId, scope) {
  const accessToken = jwt.sign(
    { sub: userId, client: clientId, scope },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = uuidv4();
  const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt };
}

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ error: 'conflict', message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, phone });

    await AuditLog.create({
      userId: user._id,
      action: 'USER_REGISTER',
      resource: 'User',
      resourceId: user._id.toString(),
      method: 'POST',
      endpoint: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: 201,
      status: 'success',
    });

    res.status(201).json({
      message: 'Registration successful',
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/oauth/token — OAuth2 Token Endpoint
// Supported grant_types: password, refresh_token, client_credentials
export const oauthToken = async (req, res, next) => {
  try {
    const { grant_type, username, password, refresh_token, scope, client_id, client_secret } = req.body;

    // Client authentication
    const clientId = client_id || req.headers['x-client-id'];
    const clientSecret = client_secret || req.headers['x-client-secret'];
    const client = VALID_CLIENTS[clientId];

    if (!client || client.secret !== clientSecret) {
      return res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials' });
    }

    if (!client.grants.includes(grant_type)) {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    // Validate requested scopes
    const requestedScopes = scope ? scope.split(' ') : ['accounts:read'];
    const invalidScopes = requestedScopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalidScopes.length) {
      return res.status(400).json({ error: 'invalid_scope', error_description: `Unknown scopes: ${invalidScopes.join(', ')}` });
    }

    // ── Resource Owner Password Credentials ──
    if (grant_type === 'password') {
      if (!username || !password) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'username and password required' });
      }

      const user = await User.findOne({ email: username }).select('+password');
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'invalid_grant', error_description: 'Invalid credentials' });
      }

      if (user.isLocked()) {
        return res.status(401).json({ error: 'invalid_grant', error_description: 'Account locked. Try again later.' });
      }

      const valid = await user.comparePassword(password);
      if (!valid) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        }
        await user.save();
        return res.status(401).json({ error: 'invalid_grant', error_description: 'Invalid credentials' });
      }

      // Reset failed attempts on success
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      user.lastLogin = new Date();
      await user.save();

      // Admin scope only for admin users
      const finalScopes = requestedScopes.filter(
        (s) => s !== 'admin' || user.role === 'admin'
      );

      const tokens = issueTokens(user._id, clientId, finalScopes);
      await OAuthToken.create({ ...tokens, userId: user._id, clientId, scope: finalScopes });

      await AuditLog.create({
        userId: user._id,
        action: 'OAUTH_TOKEN_ISSUED',
        resource: 'OAuthToken',
        method: 'POST',
        endpoint: req.originalUrl,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        statusCode: 200,
        status: 'success',
        details: { grant_type, scopes: finalScopes },
      });

      return res.json({
        access_token: tokens.accessToken,
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: tokens.refreshToken,
        scope: finalScopes.join(' '),
      });
    }

    // ── Refresh Token ──
    if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token required' });
      }

      const stored = await OAuthToken.findOne({ refreshToken: refresh_token, revoked: false });
      if (!stored || stored.refreshTokenExpiresAt < new Date()) {
        return res.status(401).json({ error: 'invalid_grant', error_description: 'Refresh token expired or invalid' });
      }

      // Revoke old token (rotation)
      stored.revoked = true;
      await stored.save();

      const user = await User.findById(stored.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'invalid_grant', error_description: 'User inactive' });
      }

      const tokens = issueTokens(stored.userId, clientId, stored.scope);
      await OAuthToken.create({ ...tokens, userId: stored.userId, clientId, scope: stored.scope });

      return res.json({
        access_token: tokens.accessToken,
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: tokens.refreshToken,
        scope: stored.scope.join(' '),
      });
    }

    // ── Client Credentials ──
    if (grant_type === 'client_credentials') {
      const serviceToken = jwt.sign(
        { sub: `client:${clientId}`, client: clientId, scope: requestedScopes },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return res.json({
        access_token: serviceToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: requestedScopes.join(' '),
      });
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/revoke
export const revokeToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    await OAuthToken.updateMany(
      { $or: [{ accessToken: token }, { refreshToken: token }] },
      { revoked: true }
    );
    res.json({ message: 'Token revoked' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  const user = req.user;
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  });
};
