import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['transfer', 'deposit', 'withdrawal', 'payment', 'fee', 'interest'],
      required: true,
    },
    fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'pending',
    },
    description: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: Date,
    failureReason: String,
  },
  { timestamps: true }
);

transactionSchema.index({ fromAccount: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });
transactionSchema.index({ initiatedBy: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
