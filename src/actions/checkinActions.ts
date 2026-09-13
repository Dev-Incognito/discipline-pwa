'use server';

import { getUserSession } from '@/lib/auth/session';
import { checkinSchema } from '@/lib/validation';
import { dataService, CheckinResult } from '@/services/dataService';

export async function submitCheckinAction(payload: {
  date: string;
  mood?: 'difficult' | 'normal' | 'easy' | null;
  journalNote?: string | null;
}): Promise<{ success: boolean; data?: CheckinResult; error?: string }> {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized. Please unlock with PIN.' };
  }

  const parse = checkinSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || 'Invalid input data' };
  }

  try {
    const result = await dataService.processCheckin(
      session.userId,
      parse.data.date,
      parse.data.mood,
      parse.data.journalNote
    );
    return { success: true, data: result };
  } catch (err) {
    console.error('Check-in error:', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function saveReflectionAction(payload: {
  date: string;
  mood?: 'difficult' | 'normal' | 'easy' | null;
  journalNote?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const res = await dataService.saveDailyReflection(
      session.userId,
      payload.date,
      payload.mood,
      payload.journalNote
    );
    return res;
  } catch (err) {
    console.error('Save reflection error:', err);
    return { success: false, error: 'Failed to save reflection.' };
  }
}

export async function getDashboardAction(todayDate: string) {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const data = await dataService.getDashboardData(session.userId, todayDate);
    if (!data) return { success: false, error: 'User not found' };
    return { success: true, data };
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    return { success: false, error: 'Failed to load dashboard data.' };
  }
}

export async function getHistoryAction() {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const checkins = await dataService.getHistoryData(session.userId);
    return { success: true, data: checkins };
  } catch (err) {
    console.error('Error fetching history:', err);
    return { success: false, error: 'Failed to load history data.' };
  }
}

export async function getStatsAction() {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const stats = await dataService.getStatsData(session.userId);
    if (!stats) return { success: false, error: 'User not found' };
    return { success: true, data: stats };
  } catch (err) {
    console.error('Error fetching stats:', err);
    return { success: false, error: 'Failed to load statistics.' };
  }
}

export async function getAchievementsAction() {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const achievements = await dataService.getAchievementsForUser(session.userId);
    return { success: true, data: achievements };
  } catch (err) {
    console.error('Error fetching achievements:', err);
    return { success: false, error: 'Failed to load achievements.' };
  }
}
