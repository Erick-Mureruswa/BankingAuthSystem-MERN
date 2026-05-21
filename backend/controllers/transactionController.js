import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

// Atomic transfer using a MongoDB session
const executeTransfer = async (session, fromAcc, toAcc, amount, description, userId) => {
  if (fromAcc.status !== 'active') throw new Error('Source account is not active');
  if (toAcc && toAcc.status !== 'active') throw new Error('Destination account is not active');
  if (fromAcc.balance + fromAcc.overdraftLimit < amount) throw new Error('Insufficient funds');

  const tx = await Transaction.create(
    [
      {
        referenceId: uuidv4(),
        type: 'transfer',
        fromAccount: fromAcc._id,
        toAccount: toAcc?._id,
        amount,
        currency: fromAcc.currency,
        status: 'pending',
        description,
        initiatedBy: userId,
      },
    ],
    { session }
  );

  await Account.findByIdAndUpdate(fromAcc._id, { $inc: { balance: -amount } }, { session, new: true });
  if (toAcc) {
    await Account.findByIdAndUpdate(toAcc._id, { $inc: { balance: amount } }, { session, new: true });
  }

  await Transaction.findByIdAndUpdate(tx[0]._id, { status: 'completed', completedAt: new Date() }, { session });

  return tx[0];
};

// POST /api/transactions/transfer
export const transfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;

    const [fromAcc, toAcc] = await Promise.all([
      Account.findById(fromAccountId),
      Account.findById(toAccountId),
    ]);

    if (!fromAcc) return res.status(404).json({ error: 'not_found', message: 'Source account not found' });
    if (!toAcc) return res.status(404).json({ error: 'not_found', message: 'Destination account not found' });

    if (req.user.role !== 'admin' && fromAcc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'forbidden', message: 'Not your account' });
    }

    const tx = await executeTransfer(session, fromAcc, toAcc, amount, description, req.user._id);

    await session.commitTransaction();
    res.status(201).json({ message: 'Transfer successful', transaction: tx });
  } catch (err) {
    await session.abortTransaction();
    if (err.message.includes('funds') || err.message.includes('active')) {
      return res.status(400).json({ error: 'transaction_failed', message: err.message });
    }
    next(err);
  } finally {
    session.endSession();
  }
};

// POST /api/transactions/deposit
export const deposit = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { accountId, amount, description } = req.body;
    const account = await Account.findById(accountId);
    if (!account) return res.status(404).json({ error: 'not_found', message: 'Account not found' });

    if (account.status !== 'active') {
      return res.status(400).json({ error: 'transaction_failed', message: 'Account is not active' });
    }

    const [tx] = await Transaction.create(
      [
        {
          referenceId: uuidv4(),
          type: 'deposit',
          toAccount: account._id,
          amount,
          currency: account.currency,
          status: 'pending',
          description: description || 'Deposit',
          initiatedBy: req.user._id,
        },
      ],
      { session }
    );

    await Account.findByIdAndUpdate(account._id, { $inc: { balance: amount } }, { session });
    await Transaction.findByIdAndUpdate(tx._id, { status: 'completed', completedAt: new Date() }, { session });

    await session.commitTransaction();
    res.status(201).json({ message: 'Deposit successful', transaction: tx });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// POST /api/transactions/withdraw
export const withdraw = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { accountId, amount, description } = req.body;
    const account = await Account.findById(accountId);
    if (!account) return res.status(404).json({ error: 'not_found', message: 'Account not found' });

    if (req.user.role !== 'admin' && account.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'forbidden', message: 'Not your account' });
    }

    if (account.status !== 'active') {
      return res.status(400).json({ error: 'transaction_failed', message: 'Account is not active' });
    }

    if (account.balance + account.overdraftLimit < amount) {
      return res.status(400).json({ error: 'transaction_failed', message: 'Insufficient funds' });
    }

    const [tx] = await Transaction.create(
      [
        {
          referenceId: uuidv4(),
          type: 'withdrawal',
          fromAccount: account._id,
          amount,
          currency: account.currency,
          status: 'pending',
          description: description || 'Withdrawal',
          initiatedBy: req.user._id,
        },
      ],
      { session }
    );

    await Account.findByIdAndUpdate(account._id, { $inc: { balance: -amount } }, { session });
    await Transaction.findByIdAndUpdate(tx._id, { status: 'completed', completedAt: new Date() }, { session });

    await session.commitTransaction();
    res.status(201).json({ message: 'Withdrawal successful', transaction: tx });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// GET /api/transactions
export const getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Non-admin users only see their own transactions
    if (req.user.role !== 'admin') {
      const userAccounts = await Account.find({ userId: req.user._id }).select('_id');
      const ids = userAccounts.map((a) => a._id);
      filter.$or = [{ fromAccount: { $in: ids } }, { toAccount: { $in: ids } }];
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .populate('fromAccount', 'accountNumber type')
        .populate('toAccount', 'accountNumber type')
        .populate('initiatedBy', 'name email'),
      Transaction.countDocuments(filter),
    ]);

    res.json({ transactions, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/transactions/:id
export const getTransaction = async (req, res, next) => {
  try {
    const tx = await Transaction.findById(req.params.id)
      .populate('fromAccount', 'accountNumber type userId')
      .populate('toAccount', 'accountNumber type userId')
      .populate('initiatedBy', 'name email');

    if (!tx) return res.status(404).json({ error: 'not_found', message: 'Transaction not found' });

    if (req.user.role !== 'admin') {
      const owned = tx.fromAccount?.userId?.toString() === req.user._id.toString() ||
        tx.toAccount?.userId?.toString() === req.user._id.toString() ||
        tx.initiatedBy?._id?.toString() === req.user._id.toString();
      if (!owned) return res.status(403).json({ error: 'forbidden', message: 'Access denied' });
    }

    res.json(tx);
  } catch (err) {
    next(err);
  }
};
