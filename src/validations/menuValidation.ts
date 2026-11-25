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
  price: z.coerce.number().positive('Price must be greater than zero'),
  location: z.string().min(2, 'Location is required'),
  images: z
    .union([
      z.array(z.string().min(1, 'Invalid image URL')).min(1, 'At least one image is required'),
      z.string().min(1, 'Invalid image URL').transform((s) => [s]),
    ]),
});

export const updateMenuItemSchema = z.object({
  itemName: z.string().min(2, 'Item name must be at least 2 characters').optional(),
  category: z
    .enum([
      'Classic Pizzas',
      'Vegetarian Pizzas',
      'Meat Lovers',
      'Specialty / Gourmet Pizzas',
      'Sides & Appetizers',
      'Beverages & Desserts',
    ])
    .optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  price: z.coerce.number().positive('Price must be greater than zero').optional(),
  location: z.string().min(2, 'Location is required').optional(),
  images: z
    .union([
      z.array(z.string().min(1, 'Invalid image URL')).min(1, 'At least one image is required'),
      z.string().min(1, 'Invalid image URL').transform((s) => [s]),
    ])
    .optional(),
  status: z.enum(['approved', 'inactive', 'pending', 'rejected']).optional(),
});
