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
    phone: z.string().optional().nullable().or(z.literal('')),
  }),
  library: z.object({
    name: z.string().min(1, 'Library name is required'),
    description: z.string().optional().nullable().or(z.literal('')),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    latitude: z.coerce.number().default(12.9716),
    longitude: z.coerce.number().default(77.5946),
    contactEmail: z.string().email('Invalid library contact email'),
    contactPhone: z.string().optional().nullable().or(z.literal('')),
    amenities: z.object({
      lockers: z.boolean().default(true),
      cctv: z.boolean().default(true),
      ac: z.boolean().default(true),
      wifi: z.boolean().default(true),
      powerOutlets: z.boolean().default(true),
    }).default({}),
    isFree: z.boolean().default(false),
    slotPricing: z.object({
      morningPrice: z.coerce.number().nonnegative().optional(),
      afternoonPrice: z.coerce.number().nonnegative().optional(),
      eveningPrice: z.coerce.number().nonnegative().optional(),
      nightPrice: z.coerce.number().nonnegative().optional(),
    }).optional().nullable(),
  }),
});
