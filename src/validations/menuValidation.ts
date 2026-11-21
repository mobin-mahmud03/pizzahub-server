import { z } from 'zod';

export const createMenuItemSchema = z.object({
  itemName: z.string().min(2, 'Item name must be at least 2 characters'),
  category: z.enum([
    'Classic Pizzas',
    'Vegetarian Pizzas',
    'Meat Lovers',
    'Specialty / Gourmet Pizzas',
    'Sides & Appetizers',
    'Beverages & Desserts',
  ]),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be greater than zero'),
  location: z.string().min(2, 'Location is required'),
  images: z.array(z.string().url('Invalid image URL')).min(1, 'At least one image is required'),
});
