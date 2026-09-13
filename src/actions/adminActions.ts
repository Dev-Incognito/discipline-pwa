'use server';

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import {
  createAdminSession,
  getAdminSession,
  destroyAdminSession,
} from '@/lib/auth/session';
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/security/rate-limiter';
import { dataService } from '@/services/dataService';
import { RankDefinition } from '@/lib/gamification/ranks';
import { AchievementDefinition } from '@/lib/gamification/achievements';

// Default development hash for PIN "9999"
const DEFAULT_DEV_ADMIN_HASH = '$2a$10$w09aR91zW46GqZ7vIqK0ce23Fk5W4j3oP0l87dJ6x9i11K1N2v7ey';

async function getAdminPinHash(): Promise<string> {
  try {
    const settingsMap = await dataService.getAppSettingsMap();
    if (settingsMap.admin_pin_hash && settingsMap.admin_pin_hash.trim() !== '') {
      return settingsMap.admin_pin_hash.trim();
    }
  } catch {
    // ignore
  }

  if (process.env.ADMIN_PIN_HASH && process.env.ADMIN_PIN_HASH.trim() !== '') {
    return process.env.ADMIN_PIN_HASH.trim();
  }
  if (process.env.ADMIN_PIN && process.env.ADMIN_PIN.trim() !== '') {
    return bcrypt.hash(process.env.ADMIN_PIN.trim(), 10);
  }
  return DEFAULT_DEV_ADMIN_HASH;
}

export async function verifyAdminPinAction(pin: string): Promise<{
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}> {
  if (!pin || pin.length < 4) {
    return { success: false, error: 'Invalid PIN format' };
  }

  const rateLimit = checkRateLimit('admin_portal_auth');
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Admin access locked for ${rateLimit.retryAfterMinutes || 15} minutes.`,
    };
  }

  const adminHash = await getAdminPinHash();
  let isValid = false;

  if (adminHash.startsWith('$2')) {
    isValid = await bcrypt.compare(pin, adminHash);
  } else {
    isValid = pin === adminHash;
  }

  if (!isValid) {
    const failedStatus = recordFailedAttempt('admin_portal_auth');
    await dataService.logAdminAction('FAILED_ADMIN_LOGIN_ATTEMPT');
    return {
      success: false,
      error: 'Invalid Admin PIN',
      remainingAttempts: failedStatus.remainingAttempts,
    };
  }

  resetAttempts('admin_portal_auth');
  await createAdminSession();
  await dataService.logAdminAction('ADMIN_LOGIN_SUCCESS');

  return { success: true };
}

export async function checkAdminAuthState() {
  const session = await getAdminSession();
  return { isAuthenticated: Boolean(session) };
}

export async function logoutAdminAction() {
  await destroyAdminSession();
  await dataService.logAdminAction('ADMIN_LOGOUT');
  return { success: true };
}

export async function getAdminDataAction() {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const aggregates = await dataService.getAdminAggregates();
    await dataService.logAdminAction('ADMIN_VIEW_TELEMETRY');
    return { success: true, data: aggregates };
  } catch (err) {
    console.error('Error fetching admin aggregates:', err);
    return { success: false, error: 'Failed to fetch admin metrics.' };
  }
}

// ----------------------------------------------------------------------
// RANK MANAGEMENT ACTIONS
// ----------------------------------------------------------------------

export async function getAdminRanksAction(): Promise<{ success: boolean; data?: RankDefinition[]; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const ranks = await dataService.getAllRankDefinitions();
    return { success: true, data: ranks };
  } catch {
    return { success: false, error: 'Failed to load rank definitions' };
  }
}

export async function saveRankAction(rank: Partial<RankDefinition> & { name: string; minXp: number; description: string; icon: string }) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  if (!rank.name || rank.name.trim() === '') {
    return { success: false, error: 'Rank name is required.' };
  }
  if (rank.minXp === undefined || rank.minXp < 0) {
    return { success: false, error: 'Min XP must be 0 or higher.' };
  }

  const res = await dataService.saveRankDefinition(rank);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/ranks');
    revalidatePath('/stats');
  }
  return res;
}

export async function deleteRankAction(id: string) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const res = await dataService.deleteRankDefinition(id);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/ranks');
    revalidatePath('/stats');
  }
  return res;
}

export async function reorderRanksAction(orderedIds: string[]) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const res = await dataService.reorderRanks(orderedIds);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/ranks');
  }
  return res;
}

// ----------------------------------------------------------------------
// XP CONFIGURATION ACTIONS
// ----------------------------------------------------------------------

export async function getXpSettingsAction() {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const map = await dataService.getAppSettingsMap();
  return {
    success: true,
    data: {
      dailyCheckinXp: Number(map.daily_checkin_xp ?? 10),
      weeklyGoalXp: Number(map.weekly_goal_xp ?? 100),
      streak7Xp: Number(map.streak_7_xp ?? 50),
      streak30Xp: Number(map.streak_30_xp ?? 150),
      streak100Xp: Number(map.streak_100_xp ?? 500),
    },
  };
}

export async function updateXpSettingsAction(xp: {
  dailyCheckinXp: number;
  weeklyGoalXp: number;
  streak7Xp: number;
  streak30Xp: number;
  streak100Xp: number;
}) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  if (
    xp.dailyCheckinXp < 0 ||
    xp.weeklyGoalXp < 0 ||
    xp.streak7Xp < 0 ||
    xp.streak30Xp < 0 ||
    xp.streak100Xp < 0
  ) {
    return { success: false, error: 'XP values cannot be negative.' };
  }

  const updates: Record<string, string> = {
    daily_checkin_xp: String(xp.dailyCheckinXp),
    weekly_goal_xp: String(xp.weeklyGoalXp),
    streak_7_xp: String(xp.streak7Xp),
    streak_30_xp: String(xp.streak30Xp),
    streak_100_xp: String(xp.streak100Xp),
  };

  const res = await dataService.updateAppSettings(updates);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/xp');
  }
  return res;
}

// ----------------------------------------------------------------------
// WEEKLY GOAL CONFIGURATION ACTIONS
// ----------------------------------------------------------------------

export async function getGoalSettingsAction() {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const map = await dataService.getAppSettingsMap();
  return {
    success: true,
    data: {
      defaultWeeklyGoal: Number(map.default_weekly_goal ?? 6),
      minWeeklyGoal: Number(map.min_weekly_goal ?? 1),
      maxWeeklyGoal: Number(map.max_weekly_goal ?? 7),
      weekStartDay: map.week_start_day ?? 'Monday',
      weekEndDay: map.week_end_day ?? 'Sunday',
    },
  };
}

export async function updateGoalSettingsAction(goals: {
  defaultWeeklyGoal: number;
  minWeeklyGoal: number;
  maxWeeklyGoal: number;
  weekStartDay: string;
  weekEndDay: string;
}) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  if (goals.minWeeklyGoal < 1 || goals.maxWeeklyGoal > 7 || goals.minWeeklyGoal > goals.maxWeeklyGoal) {
    return { success: false, error: 'Weekly goals must be between 1 and 7, and min cannot exceed max.' };
  }
  if (goals.defaultWeeklyGoal < goals.minWeeklyGoal || goals.defaultWeeklyGoal > goals.maxWeeklyGoal) {
    return { success: false, error: 'Default goal must be between min and max.' };
  }

  const updates: Record<string, string> = {
    default_weekly_goal: String(goals.defaultWeeklyGoal),
    min_weekly_goal: String(goals.minWeeklyGoal),
    max_weekly_goal: String(goals.maxWeeklyGoal),
    week_start_day: goals.weekStartDay,
    week_end_day: goals.weekEndDay,
  };

  const res = await dataService.updateAppSettings(updates);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/goals');
  }
  return res;
}

// ----------------------------------------------------------------------
// ACHIEVEMENTS CONFIGURATION ACTIONS
// ----------------------------------------------------------------------

export async function getAdminAchievementsAction() {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const list = await dataService.getAchievementDefinitions();
  return { success: true, data: list };
}

export async function saveAchievementAction(ach: AchievementDefinition) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  if (!ach.name || !ach.id) {
    return { success: false, error: 'Achievement name and ID are required.' };
  }
  if (ach.xpReward < 0) {
    return { success: false, error: 'XP reward must be non-negative.' };
  }

  const res = await dataService.saveAchievementDefinition(ach);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/achievements');
    revalidatePath('/achievements');
  }
  return res;
}

export async function deleteAchievementAction(id: string) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const res = await dataService.deleteAchievementDefinition(id);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/achievements');
    revalidatePath('/achievements');
  }
  return res;
}

export async function reorderAchievementsAction(orderedIds: string[]) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const res = await dataService.reorderAchievements(orderedIds);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/achievements');
  }
  return res;
}

// ----------------------------------------------------------------------
// APPLICATION SETTINGS & MOTIVATIONAL TEXT ACTIONS
// ----------------------------------------------------------------------

export async function getAppSettingsAction() {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const map = await dataService.getAppSettingsMap();
  return { success: true, data: map };
}

export async function updateAppSettingsAction(settingsMap: Record<string, string>) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const res = await dataService.updateAppSettings(settingsMap);
  if (res.success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin/settings');
  }
  return res;
}

// ----------------------------------------------------------------------
// ADMIN SECURITY & AUDIT ACTIONS
// ----------------------------------------------------------------------

export async function changeAdminPinAction(currentPin: string, newPin: string) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  return await dataService.changeAdminPin(currentPin, newPin);
}

export async function getAdminAuditLogsAction(limit: number = 100) {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const logs = await dataService.getAdminAuditLogs(limit);
  return { success: true, data: logs };
}

// ----------------------------------------------------------------------
// RANK LOGO ASSETS DISCOVERY
// ----------------------------------------------------------------------

export async function getAvailableRankLogosAction(): Promise<{ success: boolean; logos: string[] }> {
  const logos: string[] = [];
  try {
    const ranksDir = path.join(process.cwd(), 'public', 'ranks');
    if (fs.existsSync(ranksDir)) {
      const files = fs.readdirSync(ranksDir);
      files.forEach((f) => {
        if (/\.(png|jpe?g|svg|webp|gif)$/i.test(f)) {
          logos.push(`/ranks/${f}`);
        }
      });
    }
  } catch {
    // Directory might not exist yet
  }
  return { success: true, logos };
}
