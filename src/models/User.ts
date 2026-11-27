import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'customer' | 'vendor' | 'admin';
export type SubscriptionPlan = 'free' | 'premium';

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  isBlocked: boolean;
  businessName?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt?: Date | null;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  favorites: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// strict: false — Better Auth stores additional fields (emailVerified, accounts,
// sessions, etc.) in the same 'users' collection. We must not strip them.
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: '' },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
      default: 'customer',
      required: true,
    },
    isBlocked: { type: Boolean, default: false },
    businessName: { type: String, default: '' },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
      required: true,
    },
    subscriptionExpiresAt: { type: Date, default: null },
    subscriptionStatus: { type: String, default: '' },
    stripeCustomerId: { type: String, default: '', index: true },
    stripeSubscriptionId: { type: String, default: '', index: true },
    favorites: [{ type: Schema.Types.ObjectId, ref: 'MenuItem', default: [] }],
  },
  // Point at the same collection Better Auth writes to.
  // strict: false lets Mongoose leave Better Auth's own fields (emailVerified,
  // updatedAt, etc.) untouched when we call .save() on a document.
  { timestamps: true, strict: false }
);

// Third argument forces the collection name to 'users' (Better Auth's default).
export const User = mongoose.model<IUser>('User', UserSchema, 'users');
