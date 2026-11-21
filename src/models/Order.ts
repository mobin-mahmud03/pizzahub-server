import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface IStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface IOrder extends Document {
  itemId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  deliveryDate: Date;
  deliveryAddress: string;
  message?: string;
  status: OrderStatus;
  statusHistory: IStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deliveryDate: { type: Date, required: true },
    deliveryAddress: { type: String, required: true, trim: true },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      required: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected', 'cancelled'],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

// Prevent duplicate active orders for the same item and delivery date by same customer
OrderSchema.index({ customerId: 1, itemId: 1, deliveryDate: 1, status: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
