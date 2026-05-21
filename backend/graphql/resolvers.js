import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import AuditLog from '../models/AuditLog.js';

const assertAuth = (ctx) => {
  if (!ctx.user) throw new Error('UNAUTHENTICATED: Please provide a valid access token');
};

const assertAdmin = (ctx) => {
  assertAuth(ctx);
  if (ctx.user.role !== 'admin') throw new Error('FORBIDDEN: Admins only');
};

const assertScope = (ctx, scope) => {
  const scopes = ctx.tokenRecord?.scope || [];
  if (!scopes.includes(scope)) throw new Error(`FORBIDDEN: Required scope: ${scope}`);
};

export const resolvers = {
  Query: {
    me: (_, __, ctx) => {
      assertAuth(ctx);
      return ctx.user;
    },

    accounts: async (_, __, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'accounts:read');
      const filter = ctx.user.role === 'admin' ? {} : { userId: ctx.user._id };
      const accounts = await Account.find(filter).populate('userId').sort('-createdAt');
      return { count: accounts.length, accounts };
    },

    account: async (_, { id }, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'accounts:read');
      const account = await Account.findById(id).populate('userId');
      if (!account) return null;
      if (ctx.user.role !== 'admin' && account.userId._id.toString() !== ctx.user._id.toString()) {
        throw new Error('FORBIDDEN: Access denied');
      }
      return account;
    },

    accountBalance: async (_, { id }, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'accounts:read');
      return Account.findById(id);
    },

    transactions: async (_, { page = 1, limit = 20, type, status, startDate, endDate }, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'transactions:read');

      const filter = {};
      if (type) filter.type = type;
      if (status) filter.status = status;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      if (ctx.user.role !== 'admin') {
        const userAccounts = await Account.find({ userId: ctx.user._id }).select('_id');
        const ids = userAccounts.map((a) => a._id);
        filter.$or = [{ fromAccount: { $in: ids } }, { toAccount: { $in: ids } }];
      }

      const [transactions, total] = await Promise.all([
        Transaction.find(filter)
          .sort('-createdAt')
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('fromAccount')
          .populate('toAccount')
          .populate('initiatedBy'),
        Transaction.countDocuments(filter),
      ]);

      return { transactions, total, pages: Math.ceil(total / limit) };
    },

    transaction: async (_, { id }, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'transactions:read');
      const tx = await Transaction.findById(id)
        .populate('fromAccount')
        .populate('toAccount')
        .populate('initiatedBy');
      return tx;
    },

    auditLogs: async (_, { page = 1, limit = 50, action, resource, status }, ctx) => {
      assertAdmin(ctx);
      const filter = {};
      if (action) filter.action = new RegExp(action, 'i');
      if (resource) filter.resource = resource;
      if (status) filter.status = status;
      return AuditLog.find(filter)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email role');
    },

    auditStats: async (_, __, ctx) => {
      assertAdmin(ctx);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [total24h, failures24h] = await Promise.all([
        AuditLog.countDocuments({ createdAt: { $gte: since } }),
        AuditLog.countDocuments({ createdAt: { $gte: since }, status: 'failure' }),
      ]);
      return { total24h, failures24h };
    },
  },

  Mutation: {
    createAccount: async (_, { type, currency, initialDeposit }, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'accounts:write');

      let accountNumber;
      let exists = true;
      while (exists) {
        accountNumber = Account.generateAccountNumber();
        exists = await Account.findOne({ accountNumber });
      }

      const account = await Account.create({
        accountNumber,
        userId: ctx.user._id,
        type,
        currency: currency || 'USD',
        balance: initialDeposit || 0,
      });

      await AuditLog.create({
        userId: ctx.user._id,
        action: 'CREATE_ACCOUNT',
        resource: 'Account',
        resourceId: account._id.toString(),
        method: 'GRAPHQL',
        ipAddress: ctx.ip,
        statusCode: 200,
        status: 'success',
      });

      return account;
    },

    transfer: async (_, { fromAccountId, toAccountId, amount, description }, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'transactions:write');

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const [fromAcc, toAcc] = await Promise.all([
          Account.findById(fromAccountId),
          Account.findById(toAccountId),
        ]);

        if (!fromAcc) throw new Error('Source account not found');
        if (!toAcc) throw new Error('Destination account not found');
        if (ctx.user.role !== 'admin' && fromAcc.userId.toString() !== ctx.user._id.toString()) {
          throw new Error('FORBIDDEN: Not your account');
        }
        if (fromAcc.status !== 'active') throw new Error('Source account is not active');
        if (fromAcc.balance + fromAcc.overdraftLimit < amount) throw new Error('Insufficient funds');

        const [tx] = await Transaction.create(
          [{ referenceId: uuidv4(), type: 'transfer', fromAccount: fromAcc._id, toAccount: toAcc._id, amount, currency: fromAcc.currency, status: 'pending', description, initiatedBy: ctx.user._id }],
          { session }
        );

        await Account.findByIdAndUpdate(fromAcc._id, { $inc: { balance: -amount } }, { session });
        await Account.findByIdAndUpdate(toAcc._id, { $inc: { balance: amount } }, { session });
        await Transaction.findByIdAndUpdate(tx._id, { status: 'completed', completedAt: new Date() }, { session });

        await session.commitTransaction();

        const populated = await Transaction.findById(tx._id).populate('fromAccount').populate('toAccount').populate('initiatedBy');
        return { message: 'Transfer successful', transaction: populated };
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    },

    deposit: async (_, { accountId, amount, description }, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'transactions:write');

      const account = await Account.findById(accountId);
      if (!account) throw new Error('Account not found');
      if (account.status !== 'active') throw new Error('Account is not active');

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const [tx] = await Transaction.create(
          [{ referenceId: uuidv4(), type: 'deposit', toAccount: account._id, amount, currency: account.currency, status: 'pending', description: description || 'Deposit', initiatedBy: ctx.user._id }],
          { session }
        );
        await Account.findByIdAndUpdate(account._id, { $inc: { balance: amount } }, { session });
        await Transaction.findByIdAndUpdate(tx._id, { status: 'completed', completedAt: new Date() }, { session });
        await session.commitTransaction();

        const populated = await Transaction.findById(tx._id).populate('toAccount').populate('initiatedBy');
        return { message: 'Deposit successful', transaction: populated };
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    },

    withdraw: async (_, { accountId, amount, description }, ctx) => {
      assertAuth(ctx);
      assertScope(ctx, 'transactions:write');

      const account = await Account.findById(accountId);
      if (!account) throw new Error('Account not found');
      if (ctx.user.role !== 'admin' && account.userId.toString() !== ctx.user._id.toString()) {
        throw new Error('FORBIDDEN: Not your account');
      }
      if (account.status !== 'active') throw new Error('Account is not active');
      if (account.balance + account.overdraftLimit < amount) throw new Error('Insufficient funds');

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const [tx] = await Transaction.create(
          [{ referenceId: uuidv4(), type: 'withdrawal', fromAccount: account._id, amount, currency: account.currency, status: 'pending', description: description || 'Withdrawal', initiatedBy: ctx.user._id }],
          { session }
        );
        await Account.findByIdAndUpdate(account._id, { $inc: { balance: -amount } }, { session });
        await Transaction.findByIdAndUpdate(tx._id, { status: 'completed', completedAt: new Date() }, { session });
        await session.commitTransaction();

        const populated = await Transaction.findById(tx._id).populate('fromAccount').populate('initiatedBy');
        return { message: 'Withdrawal successful', transaction: populated };
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    },

    updateAccountStatus: async (_, { id, status }, ctx) => {
      assertAdmin(ctx);
      const account = await Account.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
      if (!account) throw new Error('Account not found');
      return account;
    },
  },
};
