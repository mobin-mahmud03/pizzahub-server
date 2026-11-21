import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key';
export const stripe = new Stripe(stripeSecretKey);

export const verifyWebhookSignature = (
  payload: Buffer | string,
  signature: string,
  secret: string
): Stripe.Event => {
  return stripe.webhooks.constructEvent(payload, signature, secret);
};
