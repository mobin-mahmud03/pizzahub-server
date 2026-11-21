import { z } from 'zod';

export const createOrderSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  deliveryDate: z.string().or(z.date()),
  deliveryAddress: z.string().min(5, 'Delivery address must be at least 5 characters'),
  message: z.string().optional(),
});
