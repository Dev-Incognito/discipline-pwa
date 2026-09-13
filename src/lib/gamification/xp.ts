export interface XpConfig {
  dailyCheckinXp: number;
  weeklyGoalXp: number;
  streak7Xp: number;
  streak30Xp: number;
  streak100Xp: number;
}

export const DEFAULT_XP_VALUES: XpConfig = {
  dailyCheckinXp: 10,
  weeklyGoalXp: 100,
  streak7Xp: 50,
  streak30Xp: 150,
  streak100Xp: 500,
};

export const XP_VALUES = {
  DAILY_CHECKIN: 10,
  WEEKLY_GOAL_MET: 100,
  MILESTONE_7_DAYS: 50,
  MILESTONE_30_DAYS: 150,
  MILESTONE_100_DAYS: 500,
} as const;

export interface XpBreakdown {
  baseXp: number;
  milestoneBonus: number;
  milestoneReason?: string;
  totalXpEarned: number;
}

/**
 * Calculates XP earned for a daily check-in, including streak milestones.
 * Supports dynamic configuration from database.
 */
export function calculateDailyCheckinXp(newStreak: number, customConfig?: Partial<XpConfig>): XpBreakdown {
  const config = {
    dailyCheckinXp: customConfig?.dailyCheckinXp ?? DEFAULT_XP_VALUES.dailyCheckinXp,
    weeklyGoalXp: customConfig?.weeklyGoalXp ?? DEFAULT_XP_VALUES.weeklyGoalXp,
    streak7Xp: customConfig?.streak7Xp ?? DEFAULT_XP_VALUES.streak7Xp,
    streak30Xp: customConfig?.streak30Xp ?? DEFAULT_XP_VALUES.streak30Xp,
    streak100Xp: customConfig?.streak100Xp ?? DEFAULT_XP_VALUES.streak100Xp,
  };

  const baseXp = Math.max(0, config.dailyCheckinXp);
  let milestoneBonus = 0;
  let milestoneReason: string | undefined;

  if (newStreak === 100) {
    milestoneBonus = Math.max(0, config.streak100Xp);
    milestoneReason = '100-Day Streak Milestone!';
  } else if (newStreak === 30) {
    milestoneBonus = Math.max(0, config.streak30Xp);
    milestoneReason = '30-Day Streak Milestone!';
  } else if (newStreak === 7) {
    milestoneBonus = Math.max(0, config.streak7Xp);
    milestoneReason = '7-Day Streak Milestone!';
  }

  return {
    baseXp,
    milestoneBonus,
    milestoneReason,
    totalXpEarned: baseXp + milestoneBonus,
  };
}
