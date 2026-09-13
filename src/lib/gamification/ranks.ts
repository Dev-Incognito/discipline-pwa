export interface RankDefinition {
  id?: string;
  name: string;
  minXp: number;
  icon: string; // Lucide icon identifier, emoji, or symbol
  logoUrl?: string | null; // Optional path in /ranks/ or image URL
  description: string;
  badgeColor: string;
  glowColor: string;
  rankUpMessage?: string;
  celebrationVideoUrl?: string | null;
  displayOrder?: number;
  enabled?: boolean;
}

export const RANKS: RankDefinition[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    minXp: 0,
    icon: '🥚',
    logoUrl: null,
    displayOrder: 1,
    enabled: true,
    description: 'Every journey starts somewhere.',
    badgeColor: 'text-zinc-400 bg-zinc-800/80 border-zinc-700',
    glowColor: 'shadow-zinc-500/20',
    rankUpMessage: 'Welcome to your journey.',
    celebrationVideoUrl: null,
  },
  {
    id: 'warrior',
    name: 'Warrior',
    minXp: 100,
    icon: '⚔️',
    logoUrl: null,
    displayOrder: 2,
    enabled: true,
    description: 'Consistency is becoming a habit.',
    badgeColor: 'text-blue-400 bg-blue-950/80 border-blue-700',
    glowColor: 'shadow-blue-500/20',
    rankUpMessage: 'Consistency is becoming a habit.',
    celebrationVideoUrl: null,
  },
  {
    id: 'chad',
    name: 'Chad',
    minXp: 300,
    icon: '💪',
    logoUrl: null,
    displayOrder: 3,
    enabled: true,
    description: "You're building serious momentum.",
    badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-700',
    glowColor: 'shadow-emerald-500/20',
    rankUpMessage: "You're building serious momentum.",
    celebrationVideoUrl: null,
  },
  {
    id: 'giga-chad',
    name: 'Giga Chad',
    minXp: 750,
    icon: '🗿',
    logoUrl: null,
    displayOrder: 4,
    enabled: true,
    description: 'Elite consistency unlocked.',
    badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-700',
    glowColor: 'shadow-amber-500/20',
    rankUpMessage: 'Elite consistency unlocked.',
    celebrationVideoUrl: null,
  },
  {
    id: 'hercules',
    name: 'Hercules',
    minXp: 1500,
    icon: '⚡',
    logoUrl: null,
    displayOrder: 5,
    enabled: true,
    description: "You're entering legendary territory.",
    badgeColor: 'text-orange-400 bg-orange-950/80 border-orange-700',
    glowColor: 'shadow-orange-500/20',
    rankUpMessage: "You're entering legendary territory.",
    celebrationVideoUrl: null,
  },
  {
    id: 'titan',
    name: 'Titan',
    minXp: 3000,
    icon: '👑',
    logoUrl: null,
    displayOrder: 6,
    enabled: true,
    description: 'Very few reach this level.',
    badgeColor: 'text-purple-400 bg-purple-950/80 border-purple-700',
    glowColor: 'shadow-purple-500/20',
    rankUpMessage: 'Titan power achieved. Very few reach this height.',
    celebrationVideoUrl: null,
  },
  {
    id: 'ascended',
    name: 'Ascended',
    minXp: 6000,
    icon: '🌌',
    logoUrl: null,
    displayOrder: 7,
    enabled: true,
    description: 'Elite consistency.',
    badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-700',
    glowColor: 'shadow-rose-500/20',
    rankUpMessage: 'Ascended discipline unlocked.',
    celebrationVideoUrl: null,
  },
  {
    id: 'legend',
    name: 'Legend',
    minXp: 10000,
    icon: '🐐',
    logoUrl: null,
    displayOrder: 8,
    enabled: true,
    description: 'The final rank.',
    badgeColor: 'text-yellow-300 bg-yellow-950/80 border-yellow-500',
    glowColor: 'shadow-yellow-500/30',
    rankUpMessage: 'The final rank. You are a living Legend.',
    celebrationVideoUrl: null,
  },
];

export interface RankProgress {
  currentRank: RankDefinition;
  nextRank: RankDefinition | null;
  currentXp: number;
  xpInCurrentTier: number;
  xpNeededForNext: number;
  tierTotalXp: number;
  progressPercent: number; // 0 to 100
}

/**
 * Validates rank hierarchy configuration (monotonically increasing XP, unique display order)
 */
export function validateRankHierarchy(ranks: RankDefinition[]): { valid: boolean; error?: string } {
  if (!ranks || ranks.length === 0) {
    return { valid: false, error: 'At least one rank is required.' };
  }

  const enabledRanks = ranks
    .filter((r) => r.enabled !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  if (enabledRanks.length === 0) {
    return { valid: false, error: 'At least one rank must be enabled.' };
  }

  // Check for negative XP
  for (const rank of enabledRanks) {
    if (rank.minXp < 0) {
      return { valid: false, error: `Rank "${rank.name}" has negative Min XP (${rank.minXp}). XP must be >= 0.` };
    }
  }

  // Check that the lowest rank starts at 0 XP
  if (enabledRanks[0].minXp !== 0) {
    return {
      valid: false,
      error: `The first rank ("${enabledRanks[0].name}") must start at 0 XP (currently ${enabledRanks[0].minXp}).`,
    };
  }

  // Check that minXp is strictly increasing
  for (let i = 1; i < enabledRanks.length; i++) {
    const prev = enabledRanks[i - 1];
    const curr = enabledRanks[i];
    if (curr.minXp <= prev.minXp) {
      return {
        valid: false,
        error: `Rank "${curr.name}" (${curr.minXp} XP) must have higher Min XP than preceding rank "${prev.name}" (${prev.minXp} XP).`,
      };
    }
  }

  return { valid: true };
}

/**
 * Calculates user's rank and progress towards the next rank.
 * Can take custom database-loaded rank definitions or defaults to static ladder.
 */
export function getRankFromXp(xp: number, customRanks?: RankDefinition[]): RankProgress {
  const safeXp = Math.max(0, Math.floor(xp));

  const sourceRanks = customRanks && customRanks.length > 0
    ? customRanks.filter((r) => r.enabled !== false).sort((a, b) => a.minXp - b.minXp)
    : RANKS;

  let currentRankIndex = 0;
  for (let i = sourceRanks.length - 1; i >= 0; i--) {
    if (safeXp >= sourceRanks[i].minXp) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = sourceRanks[currentRankIndex] || sourceRanks[0];
  const nextRank = currentRankIndex < sourceRanks.length - 1 ? sourceRanks[currentRankIndex + 1] : null;

  if (!nextRank) {
    // Top rank achieved
    return {
      currentRank,
      nextRank: null,
      currentXp: safeXp,
      xpInCurrentTier: safeXp - currentRank.minXp,
      xpNeededForNext: 0,
      tierTotalXp: 0,
      progressPercent: 100,
    };
  }

  const tierTotalXp = Math.max(1, nextRank.minXp - currentRank.minXp);
  const xpInCurrentTier = safeXp - currentRank.minXp;
  const xpNeededForNext = Math.max(0, nextRank.minXp - safeXp);
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentTier / tierTotalXp) * 100)));

  return {
    currentRank,
    nextRank,
    currentXp: safeXp,
    xpInCurrentTier,
    xpNeededForNext,
    tierTotalXp,
    progressPercent,
  };
}
