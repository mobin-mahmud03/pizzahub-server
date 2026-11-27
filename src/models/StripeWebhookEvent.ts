import mongoose, { Schema, Document } from 'mongoose';

export interface IStripeWebhookEvent extends Document {
  eventId: string;
  type: string;
  processedAt: Date;
}

const StripeWebhookEventSchema = new Schema<IStripeWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    processedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: 'stripe_webhook_events' }
);

export const StripeWebhookEvent = mongoose.model<IStripeWebhookEvent>(
  'StripeWebhookEvent',
  StripeWebhookEventSchema
);
