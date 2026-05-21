import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import connectDB from './config/db.js';
import logger from './config/logger.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { requestLogger } from './middleware/auditLogger.js';

import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import transactionRoutes from './routes/transactions.js';
import auditRoutes from './routes/audit.js';

import jwt from 'jsonwebtoken';
import User from './models/User.js';
import OAuthToken from './models/OAuthToken.js';

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  })
);

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);

// REST routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Apollo Server (GraphQL)
const apolloServer = new ApolloServer({ typeDefs, resolvers });

const startServer = async () => {
  await connectDB();
  await apolloServer.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        // Extract Bearer token for GraphQL context
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return { user: null, tokenRecord: null, ip: req.ip };

        const token = auth.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const [user, tokenRecord] = await Promise.all([
            User.findById(decoded.sub),
            OAuthToken.findOne({ accessToken: token, revoked: false }),
          ]);
          return { user: user?.isActive ? user : null, tokenRecord, ip: req.ip };
        } catch {
          return { user: null, tokenRecord: null, ip: req.ip };
        }
      },
    })
  );

  // Global error handler
  app.use((err, req, res, _next) => {
    logger.error('Unhandled error', { err: err.message, stack: err.stack, url: req.originalUrl });
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: 'internal_error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    });
  });

  // 404 handler
  app.use((req, res) => res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} not found` }));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info(`Banking API Gateway running on port ${PORT}`);
    logger.info(`REST API:    http://localhost:${PORT}/api`);
    logger.info(`GraphQL:     http://localhost:${PORT}/graphql`);
    logger.info(`Health:      http://localhost:${PORT}/health`);
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server', { err: err.message });
  process.exit(1);
});
