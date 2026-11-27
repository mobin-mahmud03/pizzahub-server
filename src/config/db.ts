import mongoose from 'mongoose';

import dns from 'node:dns';

if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('[Database] MONGODB_URI is not set. Check that server/.env exists and the server was restarted.');
    return;
  }
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('[Database] MongoDB connected successfully');
  } catch (error) {
    console.error('[Database] Connection failed:', (error as Error).message);
  }
};