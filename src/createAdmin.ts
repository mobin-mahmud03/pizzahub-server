import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME;

    if (!email || !password || !name) {
      console.error('Error: ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME are required in environment.');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pizzahub';
    await mongoose.connect(mongoUri);
    console.log('[CreateAdmin] Connected to MongoDB...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'admin',
          isBlocked: false,
          subscriptionPlan: 'free',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[CreateAdmin] Admin user (${user.email}) successfully created/updated.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('[CreateAdmin Error]', error.message);
    process.exit(1);
  }
};

createAdmin();
