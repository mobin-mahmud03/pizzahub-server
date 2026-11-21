import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'customer' | 'vendor' | 'admin';
export type SubscriptionPlan = 'free' | 'premium';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: UserRole;
  isBlocked: boolean;
  businessName?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt?: Date | null;
  favorites: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
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
    favorites: [{ type: Schema.Types.ObjectId, ref: 'MenuItem', default: [] }],
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
