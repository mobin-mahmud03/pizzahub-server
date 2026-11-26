import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User.js';

dotenv.config();

// ---------------------------------------------------------------------------
// createAdmin.ts — promotes an existing Better Auth user to the 'admin' role.
//
// Better Auth manages user creation (sign-up, password, OAuth).
// This script only sets role='admin' on a user who has already signed up
// through the PizzaHub website.
//
// Usage:
//   ADMIN_EMAIL=you@example.com npm run create-admin
//   (or set ADMIN_EMAIL in your .env file)
// ---------------------------------------------------------------------------

const createAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;

    if (!email) {
      console.error('[CreateAdmin] Error: ADMIN_EMAIL is required in environment.');
      console.error('  Set it in your .env file or prefix the command:');
      console.error('  ADMIN_EMAIL=you@example.com npm run create-admin');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pizzahub';
    await mongoose.connect(mongoUri);
    console.log('[CreateAdmin] Connected to MongoDB...');

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`\n[CreateAdmin] Error: No user found with email "${email}".`);
      console.error('\nTo create an admin account:');
      console.error('  1. Go to the PizzaHub website and sign up with this email address.');
      console.error('  2. Then run this script again to promote that account to admin.\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    if (user.role === 'admin') {
      console.log(`[CreateAdmin] User "${email}" is already an admin. Nothing to do.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    user.role = 'admin';
    await user.save();

    console.log(`[CreateAdmin] ✅ Successfully promoted "${email}" (${user.name}) to admin role.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('[CreateAdmin Error]', error.message);
    process.exit(1);
  }
};

createAdmin();
