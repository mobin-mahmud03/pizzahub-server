# PizzaHub Backend API Server 🍕

PizzaHub is an enterprise-grade pizza ordering and delivery platform connecting artisanal neighborhood pizzerias with food lovers. Built with Express.js, TypeScript, MongoDB, JWT authentication, and Stripe payments.

## 🚀 Live Links & Repositories
- **Server GitHub Repository**: `https://github.com/your-username/pizzahub-server`
- **Client GitHub Repository**: `https://github.com/your-username/pizzahub-client`
- **Live API Endpoint**: `https://pizzahub-server.onrender.com`

---

## 🛠 Technology Stack & Dependencies
- **Runtime & Language**: Node.js, TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens), bcryptjs
- **Payment Processing**: Stripe Checkout with verified Webhook signatures
- **Validation**: Zod schema validation
- **Image Upload Support**: ImgBB API
- **Dev Utilities**: `tsx` (zero-overhead execution), `dotenv`, `cors`, `@types/*`

---

## 🔐 Environment Variables
Create a `.env` file in the root directory (never commit `.env` to GitHub):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/pizzahub

# Security & JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...

# ImgBB
IMGBB_API_KEY=your_imgbb_key
```

---

## 🎯 Challenge Requirements Implementation
### 1. Advanced Search and Sorting
- Implemented in `src/controllers/menuController.ts` via endpoint `GET /api/menu`:
  - `search`: Case-insensitive regex matching `itemName`, `description`, and `location`.
  - `category`: Exact match filter for all 6 pizza categories.
  - `location`: Area/City filter.
  - `sort`: Supports `price_asc` (price low-to-high), `price_desc` (price high-to-low), and `rating`.
  - Query example: `GET /api/menu?category=Classic+Pizzas&sort=price_asc&search=pepperoni`

### 2. JWT & Token Verification Middleware Flow
- Implemented in `src/middlewares/auth.ts`:
  - `verifyToken`: Extracts Bearer token from `Authorization` header, verifies validity & expiration using `jwt.verify()`, checks user account existence and checks `isBlocked`. Returns `401` for unauthorized/expired and `403` if blocked.
  - `requireRole(roles)`: Enforces role-based permissions for `admin`, `vendor`, and `customer`.

---

## 🏃 Local Setup & Installation
```bash
# 1. Install dependencies
npm install

# 2. Seed initial data (Admin, vendors, 12+ pizzas, sample orders)
npm run seed

# 3. Start development server
npm run dev
```
