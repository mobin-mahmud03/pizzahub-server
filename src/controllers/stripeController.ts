import { Request, Response } from 'express';
import Stripe from 'stripe';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { StripeWebhookEvent } from '../models/StripeWebhookEvent.js';
import { AuthRequest } from '../middlewares/auth.js';
import { getStripeClient } from '../services/stripeService.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const stripeObjectId = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === 'string' ? value : value?.id ?? null;

const subscriptionExpiresAt = (subscription: Stripe.Subscription): Date | null => {
  const periodEnd = Math.max(
    0,
    ...subscription.items.data.map((item) => item.current_period_end)
  );
  return periodEnd > 0 ? new Date(periodEnd * 1000) : null;
};

const saveSessionTransaction = async (
  session: Stripe.Checkout.Session,
  vendorId: string,
  subscriptionId: string,
  amount: number,
  currency: string,
  status: 'pending' | 'succeeded' | 'failed'
) => {
  await Transaction.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      $set: {
        vendorId,
        plan: 'premium',
        amount,
        currency,
        stripeSubscriptionId: subscriptionId,
        status,
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const syncSubscription = async (
  subscription: Stripe.Subscription,
  vendorIdOverride?: string,
  allowReplacingSubscription = false
): Promise<boolean> => {
  const vendorId = vendorIdOverride || subscription.metadata.vendorId;
  if (!vendorId) return false;

  const existingUser = await User.findById(vendorId);
  if (!existingUser) {
    throw new Error('Vendor account for the Stripe subscription was not found.');
  }
  if (
    !allowReplacingSubscription &&
    existingUser.stripeSubscriptionId &&
    existingUser.stripeSubscriptionId !== subscription.id
  ) {
    return false;
  }

  const customerId = stripeObjectId(subscription.customer);
  const expiresAt = subscriptionExpiresAt(subscription);
  const hasAccess =
    (subscription.status === 'active' || subscription.status === 'trialing') &&
    expiresAt !== null &&
    expiresAt > new Date();
  const update: Record<string, unknown> = {
    stripeCustomerId: customerId || '',
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  };

  if (hasAccess) {
    update.subscriptionPlan = 'premium';
    update.subscriptionExpiresAt = expiresAt;
  } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    update.subscriptionPlan = 'free';
    update.subscriptionExpiresAt = null;
  }

  const filter: Record<string, unknown> = { _id: vendorId };
  if (!allowReplacingSubscription) {
    filter.$or = [
      { stripeSubscriptionId: subscription.id },
      { stripeSubscriptionId: '' },
      { stripeSubscriptionId: { $exists: false } },
    ];
  }

  const user = await User.findOneAndUpdate(filter, { $set: update }, { new: true });
  return Boolean(user && hasAccess);
};

const activateFromCheckoutSession = async (
  session: Stripe.Checkout.Session,
  vendorIdOverride?: string
): Promise<boolean> => {
  const vendorId = vendorIdOverride || session.metadata?.vendorId || session.client_reference_id;
  if (
    !vendorId ||
    session.mode !== 'subscription' ||
    (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required')
  ) {
    return false;
  }

  const subscriptionId = stripeObjectId(session.subscription);
  if (!subscriptionId) return false;

  const stripe = getStripeClient();
  const subscription =
    typeof session.subscription === 'object' && session.subscription !== null
      ? session.subscription
      : await stripe.subscriptions.retrieve(subscriptionId);
  const activated = await syncSubscription(subscription, vendorId, true);

  if (activated) {
    await saveSessionTransaction(
      session,
      vendorId,
      subscription.id,
      (session.amount_total ?? 0) / 100,
      session.currency || subscription.currency,
      'succeeded'
    );
  }

  return activated;
};

const getInvoiceSubscriptionId = (invoice: Stripe.Invoice): string | null => {
  const details = invoice.parent?.subscription_details;
  const subscriptionId = details ? stripeObjectId(details.subscription) : null;
  const legacyInvoice = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  return subscriptionId || stripeObjectId(legacyInvoice.subscription);
};

const processStripeEvent = async (event: Stripe.Event): Promise<void> => {
  const stripe = getStripeClient();

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      await activateFromCheckoutSession(event.data.object as Stripe.Checkout.Session);
      return;
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await Transaction.updateOne({ stripeSessionId: session.id }, { $set: { status: 'failed' } });
      return;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);
      if (!subscriptionId) return;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
      return;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);
      if (subscriptionId) {
        await User.updateOne(
          { stripeSubscriptionId: subscriptionId },
          { $set: { subscriptionStatus: 'past_due' } }
        );
      }
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const eventSubscription = event.data.object as Stripe.Subscription;
      const subscription = await stripe.subscriptions.retrieve(eventSubscription.id);
      await syncSubscription(subscription);
      return;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await User.updateOne(
        { stripeSubscriptionId: subscription.id },
        {
          $set: {
            subscriptionPlan: 'free',
            subscriptionExpiresAt: null,
            subscriptionStatus: 'canceled',
          },
        }
      );
      return;
    }
    default:
      return;
  }
};

export const createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      res.status(403).json({ success: false, message: 'Vendor access required.' });
      return;
    }

    if (req.user.subscriptionPlan === 'premium') {
      res.status(400).json({ success: false, message: 'Your account is already on the Premium plan.' });
      return;
    }

    const stripe = getStripeClient();
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID?.trim();
    if (!priceId) {
      res.status(500).json({
        success: false,
        message: 'Stripe subscription pricing is not configured on the server.',
      });
      return;
    }

    const price = await stripe.prices.retrieve(priceId);
    if (
      !price.active ||
      price.type !== 'recurring' ||
      price.recurring?.interval !== 'month' ||
      price.recurring?.interval_count !== 1 ||
      price.unit_amount !== 2999 ||
      price.currency !== 'usd'
    ) {
      res.status(500).json({
        success: false,
        message: 'STRIPE_PREMIUM_PRICE_ID must refer to an active USD $29.99 monthly recurring price.',
      });
      return;
    }

    const vendorId = req.user._id.toString();
    const subscriptionMetadata = { vendorId, plan: 'premium' };
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: 'subscription',
      ...(req.user.stripeCustomerId
        ? { customer: req.user.stripeCustomerId }
        : { customer_email: req.user.email }),
      client_reference_id: vendorId,
      metadata: subscriptionMetadata,
      subscription_data: { metadata: subscriptionMetadata },
      success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/payment/cancel`,
    });

    await saveSessionTransaction(
      session,
      vendorId,
      '',
      (price.unit_amount ?? 0) / 100,
      price.currency,
      'pending'
    );

    res.status(200).json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCheckoutSessionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const sessionId = req.params.sessionId;
    if (typeof sessionId !== 'string' || !sessionId) {
      res.status(400).json({ success: false, message: 'Checkout Session ID is required.' });
      return;
    }

    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    const vendorId = session.metadata?.vendorId || session.client_reference_id;
    if (
      session.mode !== 'subscription' ||
      !vendorId ||
      vendorId !== req.user._id.toString()
    ) {
      res.status(404).json({ success: false, message: 'Checkout session not found.' });
      return;
    }

    if (session.status === 'expired') {
      res.status(200).json({ success: true, data: { status: 'expired' } });
      return;
    }
    if (session.status !== 'complete') {
      res.status(200).json({ success: true, data: { status: 'pending' } });
      return;
    }

    const active = await activateFromCheckoutSession(session, vendorId);
    res.status(200).json({
      success: true,
      data: { status: active ? 'active' : 'pending' },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured.');
    res.status(500).json({ success: false, message: 'Webhook is not configured.' });
    return;
  }
  if (typeof signature !== 'string') {
    res.status(400).json({ success: false, message: 'Missing Stripe signature.' });
    return;
  }

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (error: any) {
    console.error(`[Stripe Webhook] Stripe client configuration failed: ${error.message}`);
    res.status(500).json({ success: false, message: 'Stripe is not configured on the server.' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error: any) {
    console.error(`[Stripe Webhook] Signature verification failed: ${error.message}`);
    res.status(400).json({ success: false, message: 'Invalid Stripe webhook signature.' });
    return;
  }

  try {
    if (await StripeWebhookEvent.exists({ eventId: event.id })) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    await processStripeEvent(event);
    try {
      await StripeWebhookEvent.create({ eventId: event.id, type: event.type });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`[Stripe Webhook] Processing ${event.id} (${event.type}) failed: ${error.message}`);
    res.status(500).json({ success: false, message: 'Webhook event processing failed.' });
  }
};
