import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  itemId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ itemId: 1, customerId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
