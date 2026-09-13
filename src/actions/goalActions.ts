'use server';

import { getUserSession } from '@/lib/auth/session';
import { dataService } from '@/services/dataService';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createGoalSchema = z.object({
  title: z.string().min(1, 'Goal title is required').max(60, 'Max 60 characters'),
  description: z.string().max(280, 'Max 280 characters').optional().nullable(),
  icon: z.string().min(1).default('⚔️'),
  color: z.string().min(1).default('amber'),
  targetDaysPerWeek: z.number().int().min(1).max(7).default(6),
});

export async function getUserGoalsAction() {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const goals = await dataService.getUserGoals(session.userId);
    return { success: true, data: goals };
  } catch (err) {
    console.error('Error fetching user goals:', err);
    return { success: false, error: 'Failed to load goals.' };
  }
}

export async function createGoalAction(payload: {
  title: string;
  description?: string | null;
  icon?: string;
  color?: string;
  targetDaysPerWeek?: number;
}) {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = createGoalSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid goal data' };
  }

  try {
    const goal = await dataService.createGoal(session.userId, parsed.data);
    revalidatePath('/', 'layout');
    revalidatePath('/history');
    revalidatePath('/stats');
    return { success: true, data: goal };
  } catch (err) {
    console.error('Error creating goal:', err);
    return { success: false, error: 'Failed to create goal.' };
  }
}

export async function updateGoalAction(
  goalId: string,
  payload: {
    title?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    targetDaysPerWeek?: number;
    archived?: boolean;
  }
) {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!goalId) {
    return { success: false, error: 'Goal ID is required' };
  }

  try {
    const goal = await dataService.updateGoal(session.userId, goalId, payload);
    if (!goal) return { success: false, error: 'Goal not found' };
    revalidatePath('/', 'layout');
    revalidatePath('/history');
    revalidatePath('/stats');
    return { success: true, data: goal };
  } catch (err) {
    console.error('Error updating goal:', err);
    return { success: false, error: 'Failed to update goal.' };
  }
}

export async function deleteGoalAction(goalId: string) {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!goalId) {
    return { success: false, error: 'Goal ID is required' };
  }

  try {
    const goals = await dataService.getUserGoals(session.userId);
    if (goals.length <= 1) {
      return { success: false, error: 'You must maintain at least one active goal.' };
    }

    await dataService.deleteGoal(session.userId, goalId);
    revalidatePath('/', 'layout');
    revalidatePath('/history');
    revalidatePath('/stats');
    return { success: true };
  } catch (err) {
    console.error('Error deleting goal:', err);
    return { success: false, error: 'Failed to delete goal.' };
  }
}
