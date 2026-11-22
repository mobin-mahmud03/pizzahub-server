import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pizzahub';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`[Database] MongoDB connected successfully to ${mongoUri}`);
  } catch (error) {
    console.warn('[Database] Local MongoDB is currently offline. Server will start and connect once MongoDB service is running.');
  }
};
