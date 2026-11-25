if (process.env.NODE_ENV === 'production') {
  console.error('Cannot run seed script in production!');
  process.exit(1);
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User.js';
import { MenuItem } from './models/MenuItem.js';
import { Order } from './models/Order.js';
import { Transaction } from './models/Transaction.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pizzahub';

const seedDatabase = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('[Seeder] Connected to MongoDB...');

    // Clear existing collections
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Order.deleteMany({});
    await Transaction.deleteMany({});
    console.log('[Seeder] Cleared previous records...');

    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@123456', salt);
    const vendorPassword = await bcrypt.hash('Vendor@123456', salt);
    const customerPassword = await bcrypt.hash('Customer@123456', salt);

    // 1. Create Admin
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@pizzahub.com',
      password: adminPassword,
      role: 'admin',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      isBlocked: false,
      subscriptionPlan: 'free',
    });

    // 2. Create Vendors
    const vendor1 = await User.create({
      name: "Mario Rossi",
      email: 'mario@pizzahub.com',
      password: vendorPassword,
      role: 'vendor',
      businessName: "Mario's Authentic Pizzeria",
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
      isBlocked: false,
      subscriptionPlan: 'premium',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const vendor2 = await User.create({
      name: "Luigi Moretti",
      email: 'luigi@pizzahub.com',
      password: vendorPassword,
      role: 'vendor',
      businessName: "Luigi's Wood-Fired Slice",
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      isBlocked: false,
      subscriptionPlan: 'free',
    });

    // 3. Create Customer
    const customer = await User.create({
      name: 'John Doe',
      email: 'customer@pizzahub.com',
      password: customerPassword,
      role: 'customer',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      isBlocked: false,
      subscriptionPlan: 'free',
    });

    console.log('[Seeder] Users created (Admin, Vendors, Customer)...');

    // 4. Create Menu Items across all 6 required categories
    const menuItemsData = [
      {
        vendorId: vendor1._id,
        itemName: 'Margherita Classica',
        category: 'Classic Pizzas',
        description: 'San Marzano tomato sauce, fresh buffalo mozzarella, fragrant sweet basil, extra virgin olive oil.',
        price: 14.99,
        location: 'Downtown Brooklyn, NY',
        images: [
          'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800',
          'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
        ],
        status: 'approved',
        averageRating: 4.9,
        numReviews: 24,
      },
      {
        vendorId: vendor1._id,
        itemName: 'Pepperoni Inferno',
        category: 'Classic Pizzas',
        description: 'Loaded with hand-cut spicy pepperoni cups, mozzarella blend, crushed red pepper, and honey drizzle.',
        price: 17.50,
        location: 'Downtown Brooklyn, NY',
        images: [
          'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800',
          'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800',
        ],
        status: 'approved',
        averageRating: 4.8,
        numReviews: 31,
      },
      {
        vendorId: vendor2._id,
        itemName: 'Garden Veggie Supreme',
        category: 'Vegetarian Pizzas',
        description: 'Roasted bell peppers, caramelized red onions, baby spinach, kalamata olives, button mushrooms, and fontina.',
        price: 16.00,
        location: 'Greenwich Village, NY',
        images: [
          'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
        ],
        status: 'approved',
        averageRating: 4.7,
        numReviews: 18,
      },
      {
        vendorId: vendor2._id,
        itemName: 'Quattro Formaggi Bianca',
        category: 'Vegetarian Pizzas',
        description: 'White garlic base, aged provolone, fior di latte, gorgonzola dolce, and freshly grated pecorino romano.',
        price: 18.25,
        location: 'Greenwich Village, NY',
        images: [
          'https://images.unsplash.com/photo-1573821663912-569905455b1c?w=800',
        ],
        status: 'approved',
        averageRating: 4.9,
        numReviews: 15,
      },
      {
        vendorId: vendor1._id,
        itemName: 'Carnivore Meat Feast',
        category: 'Meat Lovers',
        description: 'Smoky bacon lardons, Italian spicy sausage, smoked ham, seasoned ground beef, and signature BBQ glaze.',
        price: 19.99,
        location: 'Downtown Brooklyn, NY',
        images: [
          'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=800',
        ],
        status: 'approved',
        averageRating: 4.9,
        numReviews: 42,
      },
      {
        vendorId: vendor1._id,
        itemName: 'Truffle Mushroom Gourmet',
        category: 'Specialty / Gourmet Pizzas',
        description: 'Wild forest chanterelles, porcini cream, white truffle oil, shaved parmigiano, and organic thyme.',
        price: 22.50,
        location: 'Downtown Brooklyn, NY',
        images: [
          'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800',
        ],
        status: 'approved',
        averageRating: 5.0,
        numReviews: 29,
      },
      {
        vendorId: vendor2._id,
        itemName: 'Golden Garlic Parmesan Knots',
        category: 'Sides & Appetizers',
        description: '6 oven-baked dough knots tossed in roasted garlic herb butter, grated parmesan, with warm marinara dip.',
        price: 7.99,
        location: 'Greenwich Village, NY',
        images: [
          'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800',
        ],
        status: 'approved',
        averageRating: 4.6,
        numReviews: 19,
      },
      {
        vendorId: vendor1._id,
        itemName: 'Crispy Buffalo Wings (8pcs)',
        category: 'Sides & Appetizers',
        description: 'Jumbo wings tossed in spicy tang Buffalo glaze, served with fresh celery sticks and homemade blue cheese dip.',
        price: 11.50,
        location: 'Downtown Brooklyn, NY',
        images: [
          'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800',
        ],
        status: 'approved',
        averageRating: 4.8,
        numReviews: 25,
      },
      {
        vendorId: vendor1._id,
        itemName: 'Authentic Italian Tiramisu',
        category: 'Beverages & Desserts',
        description: 'Espresso-soaked savoiardi ladyfingers layered with rich mascarpone zabaglione and dusted with dark Valrhona cocoa.',
        price: 8.50,
        location: 'Downtown Brooklyn, NY',
        images: [
          'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
        ],
        status: 'approved',
        averageRating: 4.9,
        numReviews: 33,
      },
      {
        vendorId: vendor2._id,
        itemName: 'Sparkling Blood Orange Aranciata',
        category: 'Beverages & Desserts',
        description: 'Chilled authentic San Pellegrino artisan sparkling soda made with Sicilian blood oranges (330ml).',
        price: 3.50,
        location: 'Greenwich Village, NY',
        images: [
          'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800',
        ],
        status: 'approved',
        averageRating: 4.7,
        numReviews: 12,
      },
      {
        vendorId: vendor2._id,
        itemName: 'Rustic Prosciutto & Arugula',
        category: 'Specialty / Gourmet Pizzas',
        description: 'Thin crispy crust, fior di latte, aged 18-month Prosciutto di Parma, baby arugula, lemon glaze.',
        price: 21.00,
        location: 'Greenwich Village, NY',
        images: [
          'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
        ],
        status: 'pending', // Seed one pending item for Admin review testing!
        averageRating: 0,
        numReviews: 0,
      },
    ];

    const createdItems = await MenuItem.insertMany(menuItemsData);
    console.log(`[Seeder] Seeded ${createdItems.length} menu items across all 6 categories...`);

    // 5. Seed sample orders
    await Order.create({
      itemId: createdItems[0]._id,
      vendorId: vendor1._id,
      customerId: customer._id,
      deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      deliveryAddress: '742 Evergreen Terrace, Brooklyn, NY',
      message: 'Please ring the buzzer for Apt 4B. Extra marinara if possible!',
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Order submitted by customer. Awaiting restaurant acceptance.',
        },
      ],
    });

    await Order.create({
      itemId: createdItems[1]._id,
      vendorId: vendor1._id,
      customerId: customer._id,
      deliveryDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
      deliveryAddress: '742 Evergreen Terrace, Brooklyn, NY',
      message: 'Leave at front door.',
      status: 'accepted',
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
          note: 'Order submitted by customer.',
        },
        {
          status: 'accepted',
          timestamp: new Date(Date.now() - 47 * 60 * 60 * 1000),
          note: 'Order accepted by Mario Rossi.',
        },
      ],
    });

    // 6. Seed sample transaction
    await Transaction.create({
      vendorId: vendor1._id,
      plan: 'premium',
      amount: 29.99,
      currency: 'usd',
      stripeSessionId: 'cs_test_seed_session_12345',
      stripeSubscriptionId: 'sub_test_seed_12345',
      status: 'succeeded',
    });

    console.log('[Seeder] Database seeding completed successfully! ✨');
    console.log('\n--- Test Credentials ---');
    console.log('Admin:    admin@pizzahub.com    / Admin@123456');
    console.log('Vendor 1: mario@pizzahub.com    / Vendor@123456 (Premium)');
    console.log('Vendor 2: luigi@pizzahub.com    / Vendor@123456 (Free)');
    console.log('Customer: customer@pizzahub.com / Customer@123456\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Error during database seed:', error);
    process.exit(1);
  }
};

seedDatabase();
