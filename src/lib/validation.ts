import { z } from 'zod';

export const pinSchema = z
  .string()
  .min(4, 'PIN must be at least 4 digits')
  .max(8, 'PIN must not exceed 8 digits')
  .regex(/^\d+$/, 'PIN must contain digits only');

export const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  mood: z.enum(['difficult', 'normal', 'easy']).optional().nullable(),
  journalNote: z.string().max(280, 'Note must not exceed 280 characters').optional().nullable(),
});

export const settingsSchema = z.object({
  weeklyGoal: z.number().int().min(1).max(7).optional(),
  soundEnabled: z.boolean().optional(),
  hapticsEnabled: z.boolean().optional(),
  theme: z.enum(['dark', 'oled']).optional(),
});
