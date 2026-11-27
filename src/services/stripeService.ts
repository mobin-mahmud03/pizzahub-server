import Stripe from 'stripe';

let stripeClient: Stripe | undefined;

export const getStripeClient = (): Stripe => {
  if (stripeClient) return stripeClient;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (
    !stripeSecretKey ||
    !/^(sk|rk)_(test|live)_\S+$/.test(stripeSecretKey) ||
    /placeholder/i.test(stripeSecretKey)
  ) {
    throw new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY to a valid Stripe test or live secret key on the server.'
    );
  }

  stripeClient = new Stripe(stripeSecretKey);
  return stripeClient;
};

export const verifyWebhookSignature = (
  payload: Buffer | string,
  signature: string,
  secret: string
): Stripe.Event => {
  return getStripeClient().webhooks.constructEvent(payload, signature, secret);
};
