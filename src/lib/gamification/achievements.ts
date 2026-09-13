export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  requirementType: 'streak' | 'longest_streak' | 'total_days' | 'weekly_goals' | 'rank' | 'total_xp';
  requirementValue: string; // numeric or rank name
  xpReward: number;
  displayOrder?: number;
  enabled?: boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Complete your first day.',
    icon: 'Footprints',
    requirementType: 'total_days',
    requirementValue: '1',
    xpReward: 25,
    displayOrder: 1,
    enabled: true,
  },
  {
    id: '7-day-warrior',
    name: '7-Day Warrior',
    description: 'Reach a 7-day streak.',
    icon: 'Shield',
    requirementType: 'streak',
    requirementValue: '7',
    xpReward: 50,
    displayOrder: 2,
    enabled: true,
  },
  {
    id: '14-day-discipline',
    name: '14-Day Discipline',
    description: 'Reach a 14-day streak.',
    icon: 'Flame',
    requirementType: 'streak',
    requirementValue: '14',
    xpReward: 75,
    displayOrder: 3,
    enabled: true,
  },
  {
    id: '30-day-strong',
    name: '30-Day Strong',
    description: 'Reach a 30-day streak.',
    icon: 'Zap',
    requirementType: 'streak',
    requirementValue: '30',
    xpReward: 150,
    displayOrder: 4,
    enabled: true,
  },
  {
    id: '50-day-warrior',
    name: '50-Day Warrior',
    description: 'Reach a 50-day streak.',
    icon: 'Sword',
    requirementType: 'streak',
    requirementValue: '50',
    xpReward: 250,
    displayOrder: 5,
    enabled: true,
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Reach 100 total successful days.',
    icon: 'Target',
    requirementType: 'total_days',
    requirementValue: '100',
    xpReward: 500,
    displayOrder: 6,
    enabled: true,
  },
  {
    id: 'unbreakable',
    name: 'Unbreakable',
    description: 'Complete 4 weekly goals.',
    icon: 'Award',
    requirementType: 'weekly_goals',
    requirementValue: '4',
    xpReward: 200,
    displayOrder: 7,
    enabled: true,
  },
  {
    id: 'giga-chad',
    name: 'Giga Chad',
    description: 'Reach the Giga Chad rank.',
    icon: 'Crown',
    requirementType: 'rank',
    requirementValue: 'Giga Chad',
    xpReward: 100,
    displayOrder: 8,
    enabled: true,
  },
  {
    id: 'locked-in',
    name: 'Locked-In',
    description: 'Reach the Locked-In rank.',
    icon: 'Sparkles',
    requirementType: 'rank',
    requirementValue: 'Locked-In',
    xpReward: 200,
    displayOrder: 9,
    enabled: true,
  },
  {
    id: 'giga-chad',
    name: 'Giga Chad',
    description: 'Reach the Giga Chad rank.',
    icon: 'Trophy',
    requirementType: 'rank',
    requirementValue: 'Giga Chad',
    xpReward: 500,
    displayOrder: 10,
    enabled: true,
  },
];

const RANK_HIERARCHY: Record<string, number> = {
  NPC: 0,
  Alpha: 1,
  Beta: 2,
  Coping: 3,
  'Locked-In': 4,
  'Built Different': 5,
  Chad: 6,
  'Giga Chad': 7,
  Menace: 8,
  'Peak Masculinity': 9,
  'Final Boss': 10,
  'Lore Accurate': 11,
  'Unreasonably Disciplined': 12,
  'Beyond Human Comprehension': 13,
  'Main Character': 14,
  Unfuckable: 15,
};

export interface UserStatsForAchievements {
  streak: number;
  longestStreak?: number;
  totalDays: number;
  completedWeeklyGoals: number;
  totalXp?: number;
  currentRank: string;
}

/**
 * Checks all achievements against user stats and returns newly unlocked ones.
 * Supports dynamic definitions from database.
 */
export function checkNewAchievements(
  stats: UserStatsForAchievements,
  alreadyUnlockedIds: Set<string>,
  customDefinitions?: AchievementDefinition[]
): AchievementDefinition[] {
  const newUnlocks: AchievementDefinition[] = [];
  const list = customDefinitions && customDefinitions.length > 0
    ? customDefinitions.filter((a) => a.enabled !== false)
    : ACHIEVEMENTS;

  for (const ach of list) {
    if (alreadyUnlockedIds.has(ach.id)) continue;

    let qualifies = false;
    switch (ach.requirementType) {
      case 'streak': {
        const targetStreak = parseInt(ach.requirementValue, 10);
        if (stats.streak >= targetStreak) qualifies = true;
        break;
      }
      case 'longest_streak': {
        const targetStreak = parseInt(ach.requirementValue, 10);
        const bestStreak = Math.max(stats.streak, stats.longestStreak ?? 0);
        if (bestStreak >= targetStreak) qualifies = true;
        break;
      }
      case 'total_days': {
        const targetDays = parseInt(ach.requirementValue, 10);
        if (stats.totalDays >= targetDays) qualifies = true;
        break;
      }
      case 'weekly_goals': {
        const targetWeeks = parseInt(ach.requirementValue, 10);
        if (stats.completedWeeklyGoals >= targetWeeks) qualifies = true;
        break;
      }
      case 'total_xp': {
        const targetXp = parseInt(ach.requirementValue, 10);
        if ((stats.totalXp ?? 0) >= targetXp) qualifies = true;
        break;
      }
      case 'rank': {
        const targetRankLevel = RANK_HIERARCHY[ach.requirementValue] ?? 99;
        const currentRankLevel = RANK_HIERARCHY[stats.currentRank] ?? 0;
        if (currentRankLevel >= targetRankLevel) qualifies = true;
        break;
      }
    }

    if (qualifies) {
      newUnlocks.push(ach);
    }
  }

  return newUnlocks;
}
