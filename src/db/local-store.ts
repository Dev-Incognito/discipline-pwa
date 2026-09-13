import fs from 'fs';
import path from 'path';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';

export interface LocalDataSchema {
  users: Array<{
    id: string;
    username: string;
    pinHash: string;
    currentXp: number;
    currentStreak: number;
    longestStreak: number;
    totalSuccessfulDays: number;
    currentRank: string;
    lastCheckinDate: string | null;
    weeklyGoal: number;
    failedPinAttempts: number;
    lockedUntil: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  goals: Array<{
    id: string;
    userId: string;
    title: string;
    description?: string | null;
    icon: string;
    color: string;
    targetDaysPerWeek: number;
    currentStreak: number;
    longestStreak: number;
    totalSuccessfulDays: number;
    lastCheckinDate: string | null;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  dailyCheckins: Array<{
    id: string;
    userId: string;
    goalId?: string | null;
    date: string;
    completed: boolean;
    mood: string | null;
    journalNote: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  weeklyProgress: Array<{
    id: string;
    userId: string;
    goalId?: string | null;
    weekStart: string;
    completedDays: number;
    weeklyGoal: number;
    weekCompleted: boolean;
    bonusAwarded: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  rankDefinitions: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    logoUrl?: string | null;
    minXp: number;
    displayOrder: number;
    enabled: boolean;
    badgeColor: string;
    glowColor: string;
    rankUpMessage: string;
    celebrationVideoUrl?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  appSettings: Array<{
    id: string;
    key: string;
    value: string;
    valueType: string;
    category: string;
    description?: string | null;
    updatedAt: string;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    requirementType: string;
    requirementValue: string;
    xpReward: number;
    displayOrder: number;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  userAchievements: Array<{
    id: string;
    userId: string;
    achievementId: string;
    unlockedAt: string;
  }>;
  settings: Array<{
    id: string;
    userId: string;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    reminderTime: string | null;
    theme: string;
    createdAt: string;
    updatedAt: string;
  }>;
  adminAuditLogs: Array<{
    id: string;
    adminAction: string;
    timestamp: string;
    metadata: Record<string, unknown> | null;
  }>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'discipline_dev.json');

export const DEFAULT_RANKS = [
  {
    id: 'npc',
    name: 'NPC',
    minXp: 0,
    icon: '😶',
    logoUrl: null,
    displayOrder: 1,
    enabled: true,
    description: 'You are just an extra in someone else\'s story.',
    badgeColor: 'text-zinc-400 bg-zinc-800/80 border-zinc-700',
    glowColor: 'shadow-zinc-500/20',
    rankUpMessage: 'Your journey begins. Stop being an NPC.',
    celebrationVideoUrl: null,
  },
  {
    id: 'alpha',
    name: 'Alpha',
    minXp: 100,
    icon: '🐺',
    logoUrl: null,
    displayOrder: 2,
    enabled: true,
    description: 'First steps of real discipline.',
    badgeColor: 'text-slate-400 bg-slate-800/80 border-slate-600',
    glowColor: 'shadow-slate-500/20',
    rankUpMessage: 'Alpha unlocked. You showed up.',
    celebrationVideoUrl: null,
  },
  {
    id: 'beta',
    name: 'Beta',
    minXp: 250,
    icon: '🔰',
    logoUrl: null,
    displayOrder: 3,
    enabled: true,
    description: 'Consistency is starting to click.',
    badgeColor: 'text-sky-400 bg-sky-950/80 border-sky-700',
    glowColor: 'shadow-sky-500/20',
    rankUpMessage: 'Beta tier reached. Keep stacking days.',
    celebrationVideoUrl: null,
  },
  {
    id: 'coping',
    name: 'Coping',
    minXp: 500,
    icon: '😤',
    logoUrl: null,
    displayOrder: 4,
    enabled: true,
    description: 'You\'re fighting through resistance.',
    badgeColor: 'text-blue-400 bg-blue-950/80 border-blue-700',
    glowColor: 'shadow-blue-500/20',
    rankUpMessage: 'Coping tier — the grind is real.',
    celebrationVideoUrl: null,
  },
  {
    id: 'locked-in',
    name: 'Locked-In',
    minXp: 900,
    icon: '🔒',
    logoUrl: null,
    displayOrder: 5,
    enabled: true,
    description: 'Distraction is no longer winning.',
    badgeColor: 'text-indigo-400 bg-indigo-950/80 border-indigo-700',
    glowColor: 'shadow-indigo-500/20',
    rankUpMessage: 'Locked-In. Your focus is sharpening.',
    celebrationVideoUrl: null,
  },
  {
    id: 'built-different',
    name: 'Built Different',
    minXp: 1500,
    icon: '🏗️',
    logoUrl: null,
    displayOrder: 6,
    enabled: true,
    description: 'Most people quit here. Not you.',
    badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-700',
    glowColor: 'shadow-emerald-500/20',
    rankUpMessage: 'Built Different. You\'re not like most.',
    celebrationVideoUrl: null,
  },
  {
    id: 'chad',
    name: 'Chad',
    minXp: 2500,
    icon: '💪',
    logoUrl: null,
    displayOrder: 7,
    enabled: true,
    description: 'Serious momentum. The standard is rising.',
    badgeColor: 'text-green-400 bg-green-950/80 border-green-700',
    glowColor: 'shadow-green-500/20',
    rankUpMessage: 'Chad status achieved. Keep the standard high.',
    celebrationVideoUrl: null,
  },
  {
    id: 'giga-chad',
    name: 'Giga Chad',
    minXp: 4000,
    icon: '🗿',
    logoUrl: null,
    displayOrder: 8,
    enabled: true,
    description: 'Elite discipline. The grind is automatic.',
    badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-700',
    glowColor: 'shadow-amber-500/20',
    rankUpMessage: 'Giga Chad. The elite don\'t count days.',
    celebrationVideoUrl: null,
  },
  {
    id: 'menace',
    name: 'Menace',
    minXp: 6000,
    icon: '😈',
    logoUrl: null,
    displayOrder: 9,
    enabled: true,
    description: 'Dangerously disciplined. Others watch in awe.',
    badgeColor: 'text-orange-400 bg-orange-950/80 border-orange-700',
    glowColor: 'shadow-orange-500/20',
    rankUpMessage: 'Menace unlocked. You are a threat to mediocrity.',
    celebrationVideoUrl: null,
  },
  {
    id: 'peak-masculinity',
    name: 'Peak Masculinity',
    minXp: 9000,
    icon: '🦁',
    logoUrl: null,
    displayOrder: 10,
    enabled: true,
    description: 'The top fraction. You are the reference point.',
    badgeColor: 'text-yellow-400 bg-yellow-950/80 border-yellow-700',
    glowColor: 'shadow-yellow-500/30',
    rankUpMessage: 'Peak Masculinity. Few will ever see this.',
    celebrationVideoUrl: null,
  },
  {
    id: 'final-boss',
    name: 'Final Boss',
    minXp: 13000,
    icon: '👹',
    logoUrl: null,
    displayOrder: 11,
    enabled: true,
    description: 'You are the obstacle others are afraid to face.',
    badgeColor: 'text-red-400 bg-red-950/80 border-red-700',
    glowColor: 'shadow-red-500/30',
    rankUpMessage: 'Final Boss. Others were never ready for you.',
    celebrationVideoUrl: null,
  },
  {
    id: 'lore-accurate',
    name: 'Lore Accurate',
    minXp: 18000,
    icon: '📖',
    logoUrl: null,
    displayOrder: 12,
    enabled: true,
    description: 'Your story is already being told.',
    badgeColor: 'text-purple-400 bg-purple-950/80 border-purple-700',
    glowColor: 'shadow-purple-500/30',
    rankUpMessage: 'Lore Accurate. Your name carries weight now.',
    celebrationVideoUrl: null,
  },
  {
    id: 'unreasonably-disciplined',
    name: 'Unreasonably Disciplined',
    minXp: 25000,
    icon: '🤖',
    logoUrl: null,
    displayOrder: 13,
    enabled: true,
    description: 'Discipline at a level that defies logic.',
    badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-700',
    glowColor: 'shadow-rose-500/30',
    rankUpMessage: 'Unreasonably Disciplined. Normal doesn\'t apply to you.',
    celebrationVideoUrl: null,
  },
  {
    id: 'beyond-human-comprehension',
    name: 'Beyond Human Comprehension',
    minXp: 35000,
    icon: '🌌',
    logoUrl: null,
    displayOrder: 14,
    enabled: true,
    description: 'Science cannot explain your consistency.',
    badgeColor: 'text-cyan-300 bg-cyan-950/80 border-cyan-600',
    glowColor: 'shadow-cyan-400/30',
    rankUpMessage: 'Beyond Human Comprehension. You broke the simulation.',
    celebrationVideoUrl: null,
  },
  {
    id: 'main-character',
    name: 'Main Character',
    minXp: 50000,
    icon: '⭐',
    logoUrl: null,
    displayOrder: 15,
    enabled: true,
    description: 'The universe is built around your arc.',
    badgeColor: 'text-yellow-200 bg-yellow-950/80 border-yellow-400',
    glowColor: 'shadow-yellow-300/40',
    rankUpMessage: 'Main Character. This was always your story.',
    celebrationVideoUrl: null,
  },
  {
    id: 'unfuckable',
    name: 'Unfuckable',
    minXp: 75000,
    icon: '🔱',
    logoUrl: null,
    displayOrder: 16,
    enabled: true,
    description: 'Nothing can stop you. Nothing ever could.',
    badgeColor: 'text-white bg-gradient-to-r from-amber-950/80 to-yellow-900/80 border-yellow-300',
    glowColor: 'shadow-yellow-200/50',
    rankUpMessage: 'UNFUCKABLE. The final form. No one is touching you.',
    celebrationVideoUrl: null,
  },
];

export const DEFAULT_APP_SETTINGS = [
  { id: 'app_name', key: 'app_name', value: 'Discipline', valueType: 'string', category: 'general', description: 'Application display name' },
  { id: 'app_tagline', key: 'app_tagline', value: 'Private Habit & Progression', valueType: 'string', category: 'general', description: 'Application tagline' },
  { id: 'dashboard_subtitle', key: 'dashboard_subtitle', value: 'Build discipline. Build yourself.', valueType: 'string', category: 'text', description: 'Dashboard hero subtitle' },
  { id: 'checkin_success_message', key: 'checkin_success_message', value: 'Another day locked in.', valueType: 'string', category: 'text', description: 'Check-in success modal message' },
  { id: 'streak_reset_message', key: 'streak_reset_message', value: "Streak ended. Progress didn't.", valueType: 'string', category: 'text', description: 'Non-shaming streak setback message' },
  { id: 'weekly_completion_message', key: 'weekly_completion_message', value: 'Week complete. Keep building.', valueType: 'string', category: 'text', description: 'Weekly goal completion celebration message' },
  { id: 'daily_checkin_xp', key: 'daily_checkin_xp', value: '10', valueType: 'number', category: 'xp', description: 'Base XP awarded for daily check-in' },
  { id: 'weekly_goal_xp', key: 'weekly_goal_xp', value: '100', valueType: 'number', category: 'xp', description: 'Bonus XP awarded for hitting weekly goal' },
  { id: 'streak_7_xp', key: 'streak_7_xp', value: '50', valueType: 'number', category: 'xp', description: 'Bonus XP for 7-day streak milestone' },
  { id: 'streak_30_xp', key: 'streak_30_xp', value: '150', valueType: 'number', category: 'xp', description: 'Bonus XP for 30-day streak milestone' },
  { id: 'streak_100_xp', key: 'streak_100_xp', value: '500', valueType: 'number', category: 'xp', description: 'Bonus XP for 100-day streak milestone' },
  { id: 'default_weekly_goal', key: 'default_weekly_goal', value: '6', valueType: 'number', category: 'goals', description: 'Default days required per week' },
  { id: 'min_weekly_goal', key: 'min_weekly_goal', value: '1', valueType: 'number', category: 'goals', description: 'Minimum allowed weekly goal' },
  { id: 'max_weekly_goal', key: 'max_weekly_goal', value: '7', valueType: 'number', category: 'goals', description: 'Maximum allowed weekly goal' },
  { id: 'week_start_day', key: 'week_start_day', value: 'Monday', valueType: 'string', category: 'goals', description: 'First day of weekly tracking cycle' },
  { id: 'week_end_day', key: 'week_end_day', value: 'Sunday', valueType: 'string', category: 'goals', description: 'Last day of weekly tracking cycle' },
  { id: 'max_journal_length', key: 'max_journal_length', value: '280', valueType: 'number', category: 'general', description: 'Maximum characters for private check-in note' },
  { id: 'mood_tracking_enabled', key: 'mood_tracking_enabled', value: 'true', valueType: 'boolean', category: 'general', description: 'Enable mood selector in check-in' },
  { id: 'journal_enabled', key: 'journal_enabled', value: 'true', valueType: 'boolean', category: 'general', description: 'Enable private journal note field' },
  { id: 'urge_mode_enabled', key: 'urge_mode_enabled', value: 'true', valueType: 'boolean', category: 'general', description: 'Enable emergency Urge pause screen' },
  { id: 'urge_timer_duration', key: 'urge_timer_duration', value: '300', valueType: 'number', category: 'general', description: 'Urge mode countdown in seconds (300 = 5 min)' },
  { id: 'achievements_enabled', key: 'achievements_enabled', value: 'true', valueType: 'boolean', category: 'general', description: 'Enable achievements and trophy room' },
  { id: 'stats_enabled', key: 'stats_enabled', value: 'true', valueType: 'boolean', category: 'general', description: 'Enable RPG stats and calendar heatmap' },
  { id: 'admin_session_timeout', key: 'admin_session_timeout', value: '60', valueType: 'number', category: 'security', description: 'Admin inactivity session timeout in minutes' },
  { id: 'admin_pin_hash', key: 'admin_pin_hash', value: '$2a$10$w09aR91zW46GqZ7vIqK0ce23Fk5W4j3oP0l87dJ6x9i11K1N2v7ey', valueType: 'string', category: 'security', description: 'Bcrypt hash of admin PIN (default: 9999)' },
  { id: 'celebration_video_url', key: 'celebration_video_url', value: '/videos/celebration.mp4', valueType: 'string', category: 'general', description: 'Default rank-up celebration video' },
];

function getDefaultData(): LocalDataSchema {
  const now = new Date().toISOString();
  return {
    users: [],
    dailyCheckins: [],
    weeklyProgress: [],
    rankDefinitions: DEFAULT_RANKS.map((r) => ({
      ...r,
      createdAt: now,
      updatedAt: now,
    })),
    appSettings: DEFAULT_APP_SETTINGS.map((s) => ({
      ...s,
      updatedAt: now,
    })),
    achievements: ACHIEVEMENTS.map((a, index) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      requirementType: a.requirementType,
      requirementValue: a.requirementValue,
      xpReward: a.xpReward,
      displayOrder: index + 1,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })),
    goals: [],
    userAchievements: [],
    settings: [],
    adminAuditLogs: [],
  };
}

export function readLocalData(): LocalDataSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const defaultData = getDefaultData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content) as Partial<LocalDataSchema>;

    let modified = false;
    const now = new Date().toISOString();

    // Auto-migrate if goals missing
    if (!parsed.goals) {
      parsed.goals = [];
      modified = true;
    }

    // Auto-migrate if rankDefinitions missing
    if (!parsed.rankDefinitions || parsed.rankDefinitions.length === 0) {
      parsed.rankDefinitions = DEFAULT_RANKS.map((r) => ({
        ...r,
        createdAt: now,
        updatedAt: now,
      }));
      modified = true;
    }

    // Auto-migrate if appSettings missing
    if (!parsed.appSettings || parsed.appSettings.length === 0) {
      parsed.appSettings = DEFAULT_APP_SETTINGS.map((s) => ({
        ...s,
        updatedAt: now,
      }));
      modified = true;
    }

    // Ensure achievements have displayOrder and enabled
    if (parsed.achievements) {
      parsed.achievements = parsed.achievements.map((ach, idx) => ({
        ...ach,
        displayOrder: ach.displayOrder ?? idx + 1,
        enabled: ach.enabled ?? true,
        updatedAt: ach.updatedAt ?? now,
      }));
    }

    const fullData: LocalDataSchema = {
      users: parsed.users || [],
      goals: parsed.goals || [],
      dailyCheckins: parsed.dailyCheckins || [],
      weeklyProgress: parsed.weeklyProgress || [],
      rankDefinitions: parsed.rankDefinitions || [],
      appSettings: parsed.appSettings || [],
      achievements: parsed.achievements || [],
      userAchievements: parsed.userAchievements || [],
      settings: parsed.settings || [],
      adminAuditLogs: parsed.adminAuditLogs || [],
    };

    if (modified) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(fullData, null, 2), 'utf-8');
    }

    return fullData;
  } catch (err) {
    console.error('Error reading local data store:', err);
    return getDefaultData();
  }
}

export function writeLocalData(data: LocalDataSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local data store:', err);
  }
}
