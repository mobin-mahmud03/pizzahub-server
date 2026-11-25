import { Request, Response } from 'express';
import Stripe from 'stripe';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { AuthRequest } from '../middlewares/auth.js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key';
const stripe = new Stripe(stripeSecretKey);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Create Stripe Checkout Session for Vendor Premium Upgrade ($29.99/mo or one-time premium lifetime)
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

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'PizzaHub Vendor Premium Plan',
              description: 'Unlimited active menu items, Premium vendor badge, and featured placement on homepage.',
              images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'],
            },
            unit_amount: 2999, // $29.99
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: req.user.email,
      client_reference_id: req.user._id.toString(),
      metadata: {
        vendorId: req.user._id.toString(),
        plan: 'premium',
      },
      success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/payment/cancel`,
    });

    // Record initial pending transaction
    await Transaction.create({
      vendorId: req.user._id,
      plan: 'premium',
      amount: 29.99,
      currency: 'usd',
      stripeSessionId: session.id,
      status: 'pending',
    });

    res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Webhook Handler: Activates premium ONLY after verified Stripe webhook event
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      res.status(400).send('Webhook not configured');
      return;
    }
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook Error] ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle expired checkout session
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    await Transaction.findOneAndUpdate(
      { stripeSessionId: session.id },
      { status: 'failed' }
    );
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === 'paid') {
      const existingTransaction = await Transaction.findOne({ stripeSessionId: session.id });
      if (existingTransaction && existingTransaction.status === 'succeeded') {
        res.status(200).json({ received: true });
        return;
      }

      const vendorId = session.metadata?.vendorId || session.client_reference_id;

      if (vendorId) {
        try {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month access

          await User.findByIdAndUpdate(vendorId, {
            subscriptionPlan: 'premium',
            subscriptionExpiresAt: expiresAt,
          });

          await Transaction.findOneAndUpdate(
            { stripeSessionId: session.id },
            {
              status: 'succeeded',
              amount: (session.amount_total || 2999) / 100,
              currency: session.currency || 'usd',
            },
            { upsert: true }
          );

          console.log(`[Stripe] Successfully upgraded vendor ${vendorId} to Premium!`);
        } catch (err) {
          console.error('[Stripe Webhook] Error updating user:', err);
        }
      }
    }
  }

  res.status(200).json({ received: true });
};
