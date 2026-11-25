import { z } from 'zod';
import mongoose from 'mongoose';

export const createOrderSchema = z.object({
  itemId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid item ID (must be a valid ObjectId)',
  }),
  deliveryDate: z
    .union([z.string(), z.date()])
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid delivery date',
    })
    .refine(
      (val) => {
        const d = new Date(val);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTodayUTC = new Date();
        startOfTodayUTC.setUTCHours(0, 0, 0, 0);
        return d.getTime() >= Math.min(startOfToday.getTime(), startOfTodayUTC.getTime());
      },
      {
        message: 'Delivery date cannot be in the past',
      }
    ),
  deliveryAddress: z.string().min(5, 'Delivery address must be at least 5 characters'),
  message: z.string().optional(),
});
