# 🍕 PizzaHub — Server

REST API backend for **PizzaHub**, a full-stack pizza marketplace where customers browse and order, vendors manage menus and subscriptions, and admins moderate the platform.

Built with **Express 5**, **TypeScript**, **Mongoose**, and **Stripe** — running as an ES-module project with no transpile step in development (via `tsx`).

---

## ✨ Features

| Area | What it does |
|---|---|
| **Auth** | JWT verification via Better Auth JWKS; `register`, `login`, profile endpoints |
| **Role guards** | `verifyToken` → `requireRole(['vendor'])` middleware chain; 401 / 403 on failure |
| **Menu** | CRUD for menu items; advanced search, category & location filtering, multi-column sort, pagination |
| **Orders** | Customers place orders; vendors update status; admin views all |
| **Reviews** | Customers leave reviews after ordering; average rating auto-updated |
| **Stripe payments** | Recurring monthly Checkout subscriptions; webhook-verified Premium activation and renewal |
| **Admin panel** | User management (block/unblock), item moderation (approve/reject), transaction history |
| **Image uploads** | Server-side proxy to ImgBB; keeps API key off the client |
| **Rate limiting** | In-memory sliding-window limiter on auth routes (10 req / 60 s per IP) |
| **Validation** | Zod schemas on all mutating endpoints; ObjectId sanitisation |
| **Subscription enforcement** | Free vendors capped at 3 active items; premium auto-expires with downgrade |
| **Offline fallback** | Menu endpoint returns seed data instantly when MongoDB is unreachable |
| **Health check** | `GET /api/health` for uptime monitoring |

---

## 🛠 Technology Stack

### Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.3.0 | HTTP server framework (ES modules, async error propagation) |
| `mongoose` | ^9.12.3 | MongoDB ODM — models, queries, population |
| `cors` | ^2.8.6 | Cross-origin resource sharing for the Next.js client |
| `dotenv` | ^18.0.10 | Loads `.env` into `process.env` |
| `stripe` | ^23.2.0 | Checkout session creation and webhook verification |
| `zod` | ^4.6.7 | Runtime request-body validation and type inference |
| `multer` | ^2.5.0 | Multipart/form-data parsing for image uploads |
| `axios` | ^1.21.1 | Server-to-server HTTP calls (ImgBB proxy) |
| `bcryptjs` | ^3.0.3 | Password hashing (legacy auth routes) |
| `jsonwebtoken` | ^9.0.3 | JWT signing/verification (legacy; to be replaced by JWKS) |

### Dev dependencies

| Package | Purpose |
|---|---|
| `tsx` | On-the-fly TypeScript execution for `dev`, `seed`, `create-admin` scripts |
| `typescript` | Static typing and compilation to `dist/` |
| `@types/*` | Type definitions for Express, CORS, Multer, bcryptjs, jsonwebtoken, Node |

---

## 📁 Project Structure

```
src/
├── config/
│   └── db.ts                  # Mongoose connection
├── controllers/
│   ├── authController.ts      # register, login, getMe, updateProfile
│   ├── menuController.ts      # CRUD + advanced search/sort
│   ├── orderController.ts     # Order lifecycle
│   ├── reviewController.ts    # Reviews + rating aggregation
│   ├── stripeController.ts    # Checkout session + webhook handler
│   ├── uploadController.ts    # ImgBB proxy
│   ├── userController.ts      # Favourites, user queries
│   └── adminController.ts     # Moderation endpoints
├── middlewares/
│   ├── auth.ts                # verifyToken, requireRole
│   ├── rateLimiter.ts         # In-memory sliding window
│   └── errorHandler.ts        # 404 + global error handler
├── models/
│   ├── User.ts
│   ├── MenuItem.ts
│   ├── Order.ts
│   ├── Review.ts
│   └── Transaction.ts
├── routes/                    # One file per resource
├── services/
│   ├── stripeService.ts
│   └── emailService.ts
├── utils/
│   ├── escapeRegex.ts         # Sanitises user input before $regex
│   └── logger.ts
├── validations/               # Zod schemas
├── seed.ts                    # Demo data seeder
├── createAdmin.ts             # Promote existing user to admin
└── index.ts                   # App entry point
```

---

## 🚀 Installation

### Prerequisites

- Node.js 20+
- npm 10+
- A running MongoDB instance (local or Atlas)
- A Stripe account (test mode is fine)

### Steps

```bash
# 1. Clone the repository
git clone <SERVER_REPO_URL>
cd pizzahub-server

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Edit .env and fill in all required values (see Environment Variables below)

# 4. (Optional) Seed demo menu items
npm run seed

# 5. (Optional) Promote a signed-up user to admin
ADMIN_EMAIL=you@example.com npm run create-admin
```

> [!IMPORTANT]
> The seed script creates demo **menu items only**. User accounts must already exist (created via the client app). `create-admin` will print an error and exit if the email is not found — sign up through the website first.

---

## ▶️ Running Locally

```bash
# Development (hot-reload via tsx watch)
npm run dev

# Production build
npm run build      # compiles TypeScript → dist/
npm start          # runs dist/index.js
```

The server listens on `http://localhost:5000` by default (configurable via `PORT`).

---

## 🌐 Links

| Resource | URL |
|---|---|
| **Live API** | `<LIVE_API_URL>` |
| **Client repository** | https://github.com/mobin-mahmud03/pizzahub-client |
| **Server repository** | https://github.com/mobin-mahmud03/pizzahub-server |

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in your own values. **Never commit `.env`.**

| Variable | Used for |
|---|---|
| `PORT` | Port the Express server listens on |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | Deployed client origin — used for CORS and the JWKS endpoint URL |
| `MONGODB_URI` | Full MongoDB connection string (must point to the same DB as the client) |
| `JWT_SECRET` | Signing secret for legacy JWT auth (will be removed after Better Auth migration) |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` for development) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for Stripe webhook signature verification (`whsec_…`) |
| `STRIPE_PREMIUM_PRICE_ID` | Active monthly recurring Price ID configured in Stripe |
| `IMGBB_API_KEY` | API key for the ImgBB image hosting service |
| `ADMIN_EMAIL` | Email of the user to promote when running `npm run create-admin` |
| `ADMIN_NAME` | Display name used by the create-admin script |

---

## 🔎 Challenge 1 — Advanced Search & Sorting (`GET /api/menu`)

### Endpoint

```
GET /api/menu?search=&category=&location=&sort=&page=&limit=
```

### Query parameters

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Free-text search across `itemName`, `description`, and `location` fields using a MongoDB `$regex` with special-character escaping |
| `category` | string | Exact-match filter on `category` (e.g. `Classic Pizzas`, `Vegetarian Pizzas`) |
| `location` | string | Case-insensitive partial-match filter on the `location` field |
| `sort` | `price_asc` \| `price_desc` \| `rating` | Sort order. `price_asc` → `{ price: 1 }`, `price_desc` → `{ price: -1 }`, `rating` → `{ averageRating: -1 }`. Defaults to newest-first (`{ createdAt: -1 }`) |
| `page` | number | Page number for pagination (default: `1`) |
| `limit` | number | Items per page (default: `12`) |

### Implementation flow

```
Request arrives
  │
  ├─ DB offline? → filter + sort in-memory seed array → respond immediately
  │
  └─ DB online →
       1. Build Mongoose query object: { status: 'approved' }
       2. Append category filter (exact match)
       3. Append location filter ($regex, case-insensitive)
       4. Append search filter ($or across itemName / description / location,
          user input sanitised via escapeRegex() before $regex)
       5. Resolve sort: price_asc | price_desc | rating | default newest
       6. Run countDocuments(query) for pagination metadata
       7. Run find(query).populate('vendorId', …).sort(…).skip(…).limit(…)
       8. Respond: { success, data, pagination: { total, page, pages, limit } }
```

> [!NOTE]
> `escapeRegex()` escapes all regex special characters in user-supplied strings before they are passed to MongoDB `$regex`, preventing regex-injection attacks.

> [!TIP]
> The featured-items endpoint (`GET /api/menu/featured`) applies an extra in-memory stable sort that promotes items from **premium vendors** to the top of the results, without affecting the overall ranking by rating.

### Example

```
GET /api/menu?search=truffle&category=Specialty+%2F+Gourmet+Pizzas&sort=price_desc&page=1&limit=6
```

---

## 🔑 Challenge 2 — JWT Verification Middleware

Authentication is handled by a two-layer middleware: `verifyToken` authenticates the caller, and `requireRole` enforces the minimum permission level.

### Middleware chain

```
Incoming request with  Authorization: Bearer <token>
              │
  ┌───────────▼────────────────────────────────────┐
  │             verifyToken                         │
  │                                                 │
  │  1. Extract token from Authorization header     │
  │     → 401 if missing or malformed               │
  │                                                 │
  │  2. Verify token signature                      │
  │     Current:  jsonwebtoken.verify(token,        │
  │               process.env.JWT_SECRET)           │
  │     Planned:  jwtVerify(token,                  │
  │               createRemoteJWKSet(               │
  │                 CLIENT_URL + /api/auth/jwks))   │
  │     → 401 on invalid or expired token           │
  │                                                 │
  │  3. Extract user id from payload (sub / id)     │
  │                                                 │
  │  4. Load User from MongoDB by id                │
  │     → 401 if user not found                     │
  │     Role is taken from the DATABASE RECORD,     │
  │     never trusted from the token payload        │
  │                                                 │
  │  5. Check isBlocked                             │
  │     → 403 if true                               │
  │                                                 │
  │  6. Check subscription expiry                   │
  │     If premium plan has expired → downgrade     │
  │     user.subscriptionPlan to 'free' and save    │
  │                                                 │
  │  7. Attach user to req.user, call next()        │
  └───────────┬────────────────────────────────────┘
              │
  ┌───────────▼────────────────────────────────────┐
  │          requireRole(['vendor'])  (optional)    │
  │                                                 │
  │  Checks req.user.role against allowed list      │
  │  → 403 if role not permitted                    │
  │  → next() if allowed                            │
  └───────────┬────────────────────────────────────┘
              │
        Controller logic
```

### Response codes

| Status | Condition |
|---|---|
| `401` | No `Authorization` header, malformed header, invalid/expired token, or user not found in DB |
| `403` | Valid token but user is blocked (`isBlocked: true`), or user's role is not in the allowed list |
| `200` | Authenticated and authorised; `req.user` populated from DB |

### Better Auth JWKS migration (planned)

When the client migrates to Better Auth (which issues JWKS-verifiable JWTs via the `jwt()` plugin), the server verification step changes from a shared secret to a remote JWKS lookup:

```ts
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

// In verifyToken:
const { payload } = await jwtVerify(token, JWKS);
const userId = payload.sub ?? payload.id;
```

The rest of the middleware (DB load, role check, block check, expiry check) stays identical. `JWT_SECRET` and `JWT_EXPIRES_IN` are removed from the environment.

---

## 💳 Stripe Webhook Setup

Subscription state is activated from verified Stripe data only. The success page sends its Checkout Session ID to the authenticated backend, which retrieves the session and subscription from Stripe before updating the vendor.

### Local development (Stripe CLI)

```bash
# 1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli

# 2. Log in
stripe login

# 3. Forward webhook events to the local server
stripe listen --forward-to http://localhost:5000/api/stripe/webhook

# 4. Copy the displayed signing secret and set it in .env:
#    STRIPE_WEBHOOK_SECRET=whsec_...

# 5. Complete a test subscription checkout in the client.
#    Stripe CLI forwards the resulting webhook events to the local server.
```

### Production (Stripe Dashboard)

1. Go to **Stripe Dashboard → Developers → Webhooks → Add endpoint**.
2. Set the endpoint URL to `https://<your-server-domain>/api/stripe/webhook`.
3. Select the events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. After saving, copy the **Signing secret** (`whsec_…`) and set it as `STRIPE_WEBHOOK_SECRET` in your server environment.

> [!CAUTION]
> The webhook route (`POST /api/stripe/webhook`) must receive the **raw request body** for Stripe's signature verification. It is registered **before** `express.json()` in `index.ts` using `express.raw({ type: 'application/json' })`. Never move it after the JSON middleware or webhook verification will always fail.

> [!NOTE]
> Processed Stripe event IDs are stored uniquely. Repeated deliveries are acknowledged without applying the same event twice; failed processing returns a server error so Stripe can retry.

### Webhook event handling

| Stripe event | Server action |
|---|---|
| `checkout.session.completed` (paid) | Verify the subscription is active, save the Stripe customer/subscription IDs, and activate Premium through the current billing period |
| `invoice.paid` | Extend Premium through the paid subscription period |
| `invoice.payment_failed` | Mark the subscription `past_due`; keep already-paid access through its expiration |
| `customer.subscription.updated` | Synchronize status and paid-through period |
| `customer.subscription.deleted` | Downgrade the vendor and clear the Premium expiration |
| `checkout.session.expired`, `checkout.session.async_payment_failed` | Mark the pending transaction `failed` |

---

## 🛠 Utility Scripts

```bash
# Seed demo menu items into the database
npm run seed

# Promote an existing user (must have signed up via the client) to admin role
npm run create-admin
# Set ADMIN_EMAIL in .env, or prefix the command:
# ADMIN_EMAIL=you@example.com npm run create-admin
```
