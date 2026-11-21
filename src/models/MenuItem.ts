import mongoose, { Schema, Document } from 'mongoose';

export type MenuItemStatus = 'pending' | 'approved' | 'rejected' | 'inactive';

export interface IMenuItem extends Document {
  vendorId: mongoose.Types.ObjectId;
  itemName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  status: MenuItemStatus;
  averageRating: number;
  numReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    itemName: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'Classic Pizzas',
        'Vegetarian Pizzas',
        'Meat Lovers',
        'Specialty / Gourmet Pizzas',
        'Sides & Appetizers',
        'Beverages & Desserts',
      ],
    },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, trim: true },
    images: { type: [String], required: true, default: [] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'inactive'],
      default: 'pending',
      required: true,
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Indexing for search, filtering, and performance
MenuItemSchema.index({ itemName: 'text', description: 'text', location: 'text' });
MenuItemSchema.index({ status: 1, category: 1, price: 1 });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
