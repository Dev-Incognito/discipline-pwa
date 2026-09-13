import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: text('username').notNull().unique(),
    pinHash: text('pin_hash').notNull(),
    currentXp: integer('current_xp').default(0).notNull(),
    currentStreak: integer('current_streak').default(0).notNull(),
    longestStreak: integer('longest_streak').default(0).notNull(),
    totalSuccessfulDays: integer('total_successful_days').default(0).notNull(),
    currentRank: text('current_rank').default('Beginner').notNull(),
    lastCheckinDate: text('last_checkin_date'), // Format: 'YYYY-MM-DD'
    weeklyGoal: integer('weekly_goal').default(6).notNull(),
    failedPinAttempts: integer('failed_pin_attempts').default(0).notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_users_username').on(table.username),
    index('idx_users_last_checkin').on(table.lastCheckinDate),
  ]
);

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    icon: text('icon').default('⚔️').notNull(),
    color: text('color').default('amber').notNull(),
    targetDaysPerWeek: integer('target_days_per_week').default(6).notNull(),
    currentStreak: integer('current_streak').default(0).notNull(),
    longestStreak: integer('longest_streak').default(0).notNull(),
    totalSuccessfulDays: integer('total_successful_days').default(0).notNull(),
    lastCheckinDate: text('last_checkin_date'),
    archived: boolean('archived').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_goals_user_id').on(table.userId),
    index('idx_goals_archived').on(table.archived),
  ]
);

export const dailyCheckins = pgTable(
  'daily_checkins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    goalId: uuid('goal_id')
      .references(() => goals.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // Format: 'YYYY-MM-DD'
    completed: boolean('completed').default(true).notNull(),
    mood: text('mood'), // 'difficult' | 'normal' | 'easy'
    journalNote: text('journal_note'), // Optional private note, max 280 chars
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_goal_date_unique').on(table.userId, table.goalId, table.date),
    index('idx_checkins_user').on(table.userId),
    index('idx_checkins_goal').on(table.goalId),
    index('idx_checkins_date').on(table.date),
  ]
);

export const weeklyProgress = pgTable(
  'weekly_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    goalId: uuid('goal_id')
      .references(() => goals.id, { onDelete: 'cascade' }),
    weekStart: text('week_start').notNull(), // YYYY-MM-DD (Monday)
    completedDays: integer('completed_days').default(0).notNull(),
    weeklyGoal: integer('weekly_goal').default(6).notNull(),
    weekCompleted: boolean('week_completed').default(false).notNull(),
    bonusAwarded: boolean('bonus_awarded').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_goal_week_unique').on(table.userId, table.goalId, table.weekStart),
    index('idx_weekly_user').on(table.userId),
    index('idx_weekly_goal').on(table.goalId),
  ]
);

export const rankDefinitions = pgTable(
  'rank_definitions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    icon: text('icon').notNull(),
    logoUrl: text('logo_url'),
    minXp: integer('min_xp').notNull(),
    displayOrder: integer('display_order').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    badgeColor: text('badge_color').default('text-amber-400 bg-amber-950/80 border-amber-700').notNull(),
    glowColor: text('glow_color').default('shadow-amber-500/20').notNull(),
    rankUpMessage: text('rank_up_message').default('A new rank has been unlocked!').notNull(),
    celebrationVideoUrl: text('celebration_video_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_ranks_order').on(table.displayOrder),
    index('idx_ranks_min_xp').on(table.minXp),
  ]
);

export const appSettings = pgTable(
  'app_settings',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    value: text('value').notNull(),
    valueType: text('value_type').default('string').notNull(),
    category: text('category').default('general').notNull(),
    description: text('description'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_settings_category').on(table.category),
  ]
);

export const achievements = pgTable('achievements', {
  id: text('id').primaryKey(), // 'first-step', '7-day-warrior', etc.
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  requirementType: text('requirement_type').notNull(), // 'streak' | 'total_days' | 'weekly_goals' | 'rank' | 'total_xp'
  requirementValue: text('requirement_value').notNull(),
  xpReward: integer('xp_reward').default(50).notNull(),
  displayOrder: integer('display_order').default(1).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    achievementId: text('achievement_id')
      .references(() => achievements.id, { onDelete: 'cascade' })
      .notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_user_achievement_unique').on(table.userId, table.achievementId),
    index('idx_user_achievements_user').on(table.userId),
  ]
);

export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  soundEnabled: boolean('sound_enabled').default(true).notNull(),
  hapticsEnabled: boolean('haptics_enabled').default(true).notNull(),
  reminderTime: text('reminder_time'),
  theme: text('theme').default('dark').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminAction: text('admin_action').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;
export type WeeklyProgress = typeof weeklyProgress.$inferSelect;
export type RankDefinitionRecord = typeof rankDefinitions.$inferSelect;
export type AppSettingRecord = typeof appSettings.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
