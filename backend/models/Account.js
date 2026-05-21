import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['checking', 'savings', 'loan', 'fixed_deposit'], required: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    status: { type: String, enum: ['active', 'frozen', 'closed'], default: 'active' },
    interestRate: { type: Number, default: 0 },
    overdraftLimit: { type: Number, default: 0 },
    dailyTransactionLimit: { type: Number, default: 10000 },
  },
  { timestamps: true }
);

// Generate a unique 12-digit account number
accountSchema.statics.generateAccountNumber = function () {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

export default mongoose.model('Account', accountSchema);
