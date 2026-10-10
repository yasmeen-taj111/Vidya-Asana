import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerLibrarySchema = z.object({
  admin: z.object({
    name: z.string().min(1, 'Admin name is required'),
    email: z.string().email('Invalid admin email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().optional(),
  }),
  library: z.object({
    name: z.string().min(1, 'Library name is required'),
    description: z.string().optional(),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    latitude: z.number(),
    longitude: z.number(),
    contactEmail: z.string().email(),
    contactPhone: z.string().optional(),
    amenities: z.object({
      lockers: z.boolean().default(true),
      cctv: z.boolean().default(true),
      ac: z.boolean().default(true),
      wifi: z.boolean().default(true),
      powerOutlets: z.boolean().default(true),
    }),
    isFree: z.boolean().default(false),
    slotPricing: z.object({
      morningPrice: z.number().nonnegative().optional(),
      afternoonPrice: z.number().nonnegative().optional(),
      eveningPrice: z.number().nonnegative().optional(),
      nightPrice: z.number().nonnegative().optional(),
    }).optional(),
  }),
});
