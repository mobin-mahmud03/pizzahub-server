import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { handleWebhook } from './controllers/stripeController.js';
import { StripeWebhookEvent } from './models/StripeWebhookEvent.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import stripeRoutes from './routes/stripeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

if (!process.env.CLIENT_URL) {
  throw new Error('CLIENT_URL is required (used for JWKS endpoint and CORS)');
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// CORS configuration (supports production and local frontend)
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

// Stripe Webhook route requires raw body for signature verification
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Body parsers for all standard JSON routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to PizzaHub API Server',
    health: '/api/health',
    endpoints: {
      menu: '/api/menu',
      orders: '/api/orders',
      auth: '/api/auth/me',
      stripe: '/api/stripe',
    },
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'PizzaHub API Server',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Connect DB before processing requests (critical for serverless like Vercel)
connectDB().catch(console.error);

// Start Server for persistent environments (Node / local / Render)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const startServer = async () => {
    await connectDB();
    await StripeWebhookEvent.createIndexes();
    app.listen(PORT, () => {
      console.log(`[PizzaHub Server] Running on http://localhost:${PORT}`);
    });
  };
  startServer();
}

export default app;
