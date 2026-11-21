import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  vendorId: mongoose.Types.ObjectId;
  plan: string;
  amount: number;
  currency: string;
  stripeSessionId: string;
  stripeSubscriptionId?: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, required: true, default: 'premium' },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'usd' },
    stripeSessionId: { type: String, required: true, unique: true },
    stripeSubscriptionId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      default: 'pending',
      required: true,
    },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
