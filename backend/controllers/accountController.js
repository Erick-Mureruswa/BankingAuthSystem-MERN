import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

// GET /api/accounts — list accounts for the logged-in user (admin sees all)
export const getAccounts = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const accounts = await Account.find(filter).populate('userId', 'name email').sort('-createdAt');
    res.json({ count: accounts.length, accounts });
  } catch (err) {
    next(err);
  }
};

// GET /api/accounts/:id
export const getAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id).populate('userId', 'name email');
    if (!account) return res.status(404).json({ error: 'not_found', message: 'Account not found' });

    if (req.user.role !== 'admin' && account.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'forbidden', message: 'Access denied' });
    }

    res.json(account);
  } catch (err) {
    next(err);
  }
};

// POST /api/accounts
export const createAccount = async (req, res, next) => {
  try {
    const { type, currency, initialDeposit } = req.body;

    let accountNumber;
    let exists = true;
    while (exists) {
      accountNumber = Account.generateAccountNumber();
      exists = await Account.findOne({ accountNumber });
    }

    const account = await Account.create({
      accountNumber,
      userId: req.user._id,
      type,
      currency: currency || 'USD',
      balance: initialDeposit || 0,
    });

    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
};

// GET /api/accounts/:id/balance
export const getBalance = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found', message: 'Account not found' });

    if (req.user.role !== 'admin' && account.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'forbidden', message: 'Access denied' });
    }

    res.json({
      accountNumber: account.accountNumber,
      balance: account.balance,
      currency: account.currency,
      status: account.status,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/accounts/:id/status  (admin only)
export const updateAccountStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const account = await Account.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!account) return res.status(404).json({ error: 'not_found', message: 'Account not found' });
    res.json(account);
  } catch (err) {
    next(err);
  }
};

// GET /api/accounts/:id/transactions
export const getAccountTransactions = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found', message: 'Account not found' });

    if (req.user.role !== 'admin' && account.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'forbidden', message: 'Access denied' });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({
      $or: [{ fromAccount: account._id }, { toAccount: account._id }],
    })
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('fromAccount', 'accountNumber')
      .populate('toAccount', 'accountNumber');

    const total = await Transaction.countDocuments({
      $or: [{ fromAccount: account._id }, { toAccount: account._id }],
    });

    res.json({ transactions, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};
