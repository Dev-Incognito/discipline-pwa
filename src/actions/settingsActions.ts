'use server';

import { getUserSession, destroyUserSession } from '@/lib/auth/session';
import { settingsSchema } from '@/lib/validation';
import { dataService } from '@/services/dataService';

export async function getSettingsAction() {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  const user = await dataService.getUserById(session.userId);
  const settings = await dataService.getSettings(session.userId);

  return {
    success: true,
    data: {
      username: user?.username ?? 'user',
      currentRank: user?.currentRank ?? 'Beginner',
      weeklyGoal: user?.weeklyGoal ?? 6,
      soundEnabled: settings?.soundEnabled ?? true,
      hapticsEnabled: settings?.hapticsEnabled ?? true,
      theme: settings?.theme ?? 'dark',
    },
  };
}

export async function updateSettingsAction(payload: {
  weeklyGoal?: number;
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
  theme?: string;
}) {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  const parse = settingsSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors[0]?.message || 'Invalid settings' };
  }

  try {
    await dataService.updateSettings(session.userId, {
      weeklyGoal: payload.weeklyGoal,
      soundEnabled: payload.soundEnabled,
      hapticsEnabled: payload.hapticsEnabled,
      theme: payload.theme,
    });
    return { success: true };
  } catch (err) {
    console.error('Settings update error:', err);
    return { success: false, error: 'Failed to save settings' };
  }
}

export async function exportUserDataAction() {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const user = await dataService.getUserById(session.userId);
    const checkins = await dataService.getHistoryData(session.userId);
    const achievements = await dataService.getAchievementsForUser(session.userId);
    const settings = await dataService.getSettings(session.userId);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: user
        ? {
            currentXp: user.currentXp,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            totalSuccessfulDays: user.totalSuccessfulDays,
            currentRank: user.currentRank,
            weeklyGoal: user.weeklyGoal,
            createdAt: user.createdAt,
          }
        : null,
      checkins: checkins.map((c) => ({
        date: c.date,
        completed: c.completed,
        mood: c.mood,
        journalNote: c.journalNote,
        createdAt: c.createdAt,
      })),
      unlockedAchievements: achievements.filter((a) => a.unlocked),
      settings: settings
        ? {
            soundEnabled: settings.soundEnabled,
            hapticsEnabled: settings.hapticsEnabled,
            theme: settings.theme,
          }
        : null,
    };

    return { success: true, data: exportPayload };
  } catch (err) {
    console.error('Export error:', err);
    return { success: false, error: 'Failed to export data.' };
  }
}

export async function deleteAccountAction(confirmText: string) {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  if (confirmText.trim() !== 'DELETE EVERYTHING') {
    return { success: false, error: 'Confirmation phrase does not match.' };
  }

  try {
    await dataService.deleteAllUserData(session.userId);
    await destroyUserSession();
    return { success: true };
  } catch (err) {
    console.error('Delete data error:', err);
    return { success: false, error: 'Failed to delete account data.' };
  }
}
