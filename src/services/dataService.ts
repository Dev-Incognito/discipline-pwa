import { db, isPostgresConfigured, schema } from '@/db';
import { readLocalData, writeLocalData, DEFAULT_RANKS, DEFAULT_APP_SETTINGS } from '@/db/local-store';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { evaluateStreak } from '@/lib/gamification/streaks';
import { calculateDailyCheckinXp, XpConfig } from '@/lib/gamification/xp';
import { getMondayOfWeek, getWeekDates, computeWeeklyStatus } from '@/lib/gamification/weekly';
import { getRankFromXp, validateRankHierarchy, RankDefinition } from '@/lib/gamification/ranks';
import { checkNewAchievements, AchievementDefinition } from '@/lib/gamification/achievements';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface CheckinResult {
  success: boolean;
  message: string;
  isDuplicate: boolean;
  xpEarned: number;
  xpBreakdown: {
    baseXp: number;
    milestoneBonus: number;
    milestoneReason?: string;
    weeklyBonus: number;
    achievementBonus: number;
  };
  newStreak: number;
  newLongestStreak: number;
  newTotalDays: number;
  currentRank: string;
  previousRank: string;
  didRankUp: boolean;
  newRankDetails?: RankDefinition;
  rankUpMessage?: string;
  celebrationVideoUrl?: string | null;
  unlockedAchievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
  }>;
}

export const dataService = {
  // ----------------------------------------------------
  // USER CREATION & RETRIEVAL
  // ----------------------------------------------------
  async getUserById(userId: string) {
    if (isPostgresConfigured() && db) {
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
      return result[0] || null;
    } else {
      const data = readLocalData();
      return data.users.find((u) => u.id === userId) || null;
    }
  },

  async getUserByUsername(username: string) {
    const cleanUsername = username.trim().toLowerCase();
    if (isPostgresConfigured() && db) {
      const result = await db
        .select()
        .from(schema.users)
        .where(sql`lower(${schema.users.username}) = ${cleanUsername}`)
        .limit(1);
      return result[0] || null;
    } else {
      const data = readLocalData();
      return (
        data.users.find(
          (u) => (u.username || '').toLowerCase() === cleanUsername
        ) || null
      );
    }
  },

  async createUserWithPin(username: string, pinHash: string) {
    const cleanUsername = username.trim().toLowerCase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isPostgresConfigured() && db) {
      const inserted = await db
        .insert(schema.users)
        .values({
          id,
          username: cleanUsername,
          pinHash,
          currentXp: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalSuccessfulDays: 0,
          currentRank: 'Beginner',
          weeklyGoal: 6,
        })
        .returning();

      // Create default settings
      await db.insert(schema.settings).values({
        userId: id,
        soundEnabled: true,
        hapticsEnabled: true,
        theme: 'dark',
      });

      return inserted[0];
    } else {
      const data = readLocalData();
      const newUser = {
        id,
        username: cleanUsername,
        pinHash,
        currentXp: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalSuccessfulDays: 0,
        currentRank: 'Beginner',
        lastCheckinDate: null,
        weeklyGoal: 6,
        failedPinAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };
      data.users.push(newUser);
      data.settings.push({
        id: crypto.randomUUID(),
        userId: id,
        soundEnabled: true,
        hapticsEnabled: true,
        reminderTime: null,
        theme: 'dark',
        createdAt: now,
        updatedAt: now,
      });
      writeLocalData(data);
      return newUser;
    }
  },

  async getFirstUser() {
    if (isPostgresConfigured() && db) {
      const result = await db.select().from(schema.users).limit(1);
      return result[0] || null;
    } else {
      const data = readLocalData();
      return data.users[0] || null;
    }
  },

  async updateUserPin(userId: string, newPinHash: string) {
    if (isPostgresConfigured() && db) {
      await db
        .update(schema.users)
        .set({ pinHash: newPinHash, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    } else {
      const data = readLocalData();
      const user = data.users.find((u) => u.id === userId);
      if (user) {
        user.pinHash = newPinHash;
        user.updatedAt = new Date().toISOString();
        writeLocalData(data);
      }
    }
  },

  // ----------------------------------------------------
  // GOALS & HABITS MANAGEMENT
  // ----------------------------------------------------
  async getUserGoals(userId: string): Promise<schema.Goal[]> {
    if (isPostgresConfigured() && db) {
      const list = await db
        .select()
        .from(schema.goals)
        .where(and(eq(schema.goals.userId, userId), eq(schema.goals.archived, false)))
        .orderBy(asc(schema.goals.createdAt));

      if (list.length > 0) return list;

      // Auto-create default goal if user has none
      const user = await this.getUserById(userId);
      const newGoalId = crypto.randomUUID();
      const defaultGoalList = await db
        .insert(schema.goals)
        .values({
          id: newGoalId,
          userId,
          title: 'Primary Discipline',
          description: 'Main habit and self-control tracker',
          icon: '⚔️',
          color: 'amber',
          targetDaysPerWeek: user?.weeklyGoal || 6,
          currentStreak: user?.currentStreak || 0,
          longestStreak: user?.longestStreak || 0,
          totalSuccessfulDays: user?.totalSuccessfulDays || 0,
          lastCheckinDate: user?.lastCheckinDate || null,
        })
        .returning();

      const defaultGoal = defaultGoalList[0];

      // Link any orphan checkins for this user to default goal
      await db
        .update(schema.dailyCheckins)
        .set({ goalId: defaultGoal.id })
        .where(and(eq(schema.dailyCheckins.userId, userId), sql`${schema.dailyCheckins.goalId} IS NULL`));

      await db
        .update(schema.weeklyProgress)
        .set({ goalId: defaultGoal.id })
        .where(and(eq(schema.weeklyProgress.userId, userId), sql`${schema.weeklyProgress.goalId} IS NULL`));

      return [defaultGoal];
    } else {
      const data = readLocalData();
      const list = (data.goals || []).filter((g) => g.userId === userId && !g.archived);
      if (list.length > 0) return list as unknown as schema.Goal[];

      const user = data.users.find((u) => u.id === userId);
      const defaultGoal = {
        id: crypto.randomUUID(),
        userId,
        title: 'Primary Discipline',
        description: 'Main habit and self-control tracker',
        icon: '⚔️',
        color: 'amber',
        targetDaysPerWeek: user?.weeklyGoal || 6,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
        totalSuccessfulDays: user?.totalSuccessfulDays || 0,
        lastCheckinDate: user?.lastCheckinDate || null,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!data.goals) data.goals = [];
      data.goals.push(defaultGoal);

      data.dailyCheckins.forEach((c) => {
        if (c.userId === userId && !c.goalId) {
          c.goalId = defaultGoal.id;
        }
      });
      data.weeklyProgress.forEach((w) => {
        if (w.userId === userId && !w.goalId) {
          w.goalId = defaultGoal.id;
        }
      });

      writeLocalData(data);
      return [defaultGoal as unknown as schema.Goal];
    }
  },

  async getGoalById(goalId: string): Promise<schema.Goal | null> {
    if (isPostgresConfigured() && db) {
      const result = await db
        .select()
        .from(schema.goals)
        .where(eq(schema.goals.id, goalId))
        .limit(1);
      return result[0] || null;
    } else {
      const data = readLocalData();
      const g = (data.goals || []).find((item) => item.id === goalId);
      return (g as unknown as schema.Goal) || null;
    }
  },

  async createGoal(
    userId: string,
    data: {
      title: string;
      description?: string | null;
      icon?: string;
      color?: string;
      targetDaysPerWeek?: number;
    }
  ): Promise<schema.Goal> {
    const goalId = crypto.randomUUID();
    const icon = data.icon?.trim() || '⚔️';
    const color = data.color?.trim() || 'amber';
    const targetDays = Math.max(1, Math.min(7, data.targetDaysPerWeek || 6));
    const title = data.title.trim();

    if (isPostgresConfigured() && db) {
      const [inserted] = await db
        .insert(schema.goals)
        .values({
          id: goalId,
          userId,
          title,
          description: data.description ? data.description.trim() : null,
          icon,
          color,
          targetDaysPerWeek: targetDays,
          currentStreak: 0,
          longestStreak: 0,
          totalSuccessfulDays: 0,
        })
        .returning();
      return inserted;
    } else {
      const local = readLocalData();
      if (!local.goals) local.goals = [];
      const newGoal = {
        id: goalId,
        userId,
        title,
        description: data.description ? data.description.trim() : null,
        icon,
        color,
        targetDaysPerWeek: targetDays,
        currentStreak: 0,
        longestStreak: 0,
        totalSuccessfulDays: 0,
        lastCheckinDate: null,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      local.goals.push(newGoal);
      writeLocalData(local);
      return newGoal as unknown as schema.Goal;
    }
  },

  async updateGoal(
    userId: string,
    goalId: string,
    updates: {
      title?: string;
      description?: string | null;
      icon?: string;
      color?: string;
      targetDaysPerWeek?: number;
      archived?: boolean;
    }
  ): Promise<schema.Goal | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.icon !== undefined) updateData.icon = updates.icon.trim();
    if (updates.color !== undefined) updateData.color = updates.color.trim();
    if (updates.targetDaysPerWeek !== undefined) {
      updateData.targetDaysPerWeek = Math.max(1, Math.min(7, updates.targetDaysPerWeek));
    }
    if (updates.archived !== undefined) updateData.archived = updates.archived;

    if (isPostgresConfigured() && db) {
      const [updated] = await db
        .update(schema.goals)
        .set(updateData)
        .where(and(eq(schema.goals.id, goalId), eq(schema.goals.userId, userId)))
        .returning();
      return updated || null;
    } else {
      const local = readLocalData();
      const g = (local.goals || []).find((goal) => goal.id === goalId && goal.userId === userId);
      if (!g) return null;
      if (updates.title !== undefined) g.title = updates.title.trim();
      if (updates.description !== undefined) g.description = updates.description?.trim() || null;
      if (updates.icon !== undefined) g.icon = updates.icon.trim();
      if (updates.color !== undefined) g.color = updates.color.trim();
      if (updates.targetDaysPerWeek !== undefined) {
        g.targetDaysPerWeek = Math.max(1, Math.min(7, updates.targetDaysPerWeek));
      }
      if (updates.archived !== undefined) g.archived = updates.archived;
      g.updatedAt = new Date().toISOString();
      writeLocalData(local);
      return g as unknown as schema.Goal;
    }
  },

  async deleteGoal(userId: string, goalId: string): Promise<boolean> {
    if (isPostgresConfigured() && db) {
      await db
        .delete(schema.goals)
        .where(and(eq(schema.goals.id, goalId), eq(schema.goals.userId, userId)));
      return true;
    } else {
      const local = readLocalData();
      local.goals = (local.goals || []).filter((g) => !(g.id === goalId && g.userId === userId));
      local.dailyCheckins = local.dailyCheckins.filter(
        (c) => !(c.goalId === goalId && c.userId === userId)
      );
      writeLocalData(local);
      return true;
    }
  },

  // ----------------------------------------------------
  // DAILY CHECK-IN PROCESSOR
  // ----------------------------------------------------
  async processCheckin(
    userId: string,
    todayDate: string,
    mood?: string | null,
    journalNote?: string | null,
    goalId?: string | null
  ): Promise<CheckinResult & { goalDetails?: schema.Goal }> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const userGoals = await this.getUserGoals(userId);
    const targetGoal = (goalId ? userGoals.find((g) => g.id === goalId) : null) || userGoals[0];
    if (!targetGoal) {
      throw new Error('No active goal found');
    }

    // Evaluate streak continuity on the specific goal
    const streakEval = evaluateStreak(
      targetGoal.currentStreak,
      targetGoal.longestStreak,
      targetGoal.totalSuccessfulDays,
      targetGoal.lastCheckinDate,
      todayDate
    );

    if (streakEval.isDuplicateCheckin) {
      return {
        success: true,
        message: streakEval.supportiveMessage,
        isDuplicate: true,
        xpEarned: 0,
        xpBreakdown: {
          baseXp: 0,
          milestoneBonus: 0,
          weeklyBonus: 0,
          achievementBonus: 0,
        },
        newStreak: targetGoal.currentStreak,
        newLongestStreak: targetGoal.longestStreak,
        newTotalDays: targetGoal.totalSuccessfulDays,
        currentRank: user.currentRank,
        previousRank: user.currentRank,
        didRankUp: false,
        unlockedAchievements: [],
        goalDetails: targetGoal,
      };
    }

    // Load dynamic CMS settings and ranks
    const settingsMap = await this.getAppSettingsMap();
    const xpConfig: XpConfig = {
      dailyCheckinXp: Number(settingsMap.daily_checkin_xp ?? 10),
      weeklyGoalXp: Number(settingsMap.weekly_goal_xp ?? 100),
      streak7Xp: Number(settingsMap.streak_7_xp ?? 50),
      streak30Xp: Number(settingsMap.streak_30_xp ?? 150),
      streak100Xp: Number(settingsMap.streak_100_xp ?? 500),
    };

    // Calculate XP for checkin + streak milestone
    const xpCalc = calculateDailyCheckinXp(streakEval.newStreak, xpConfig);
    let totalXpEarned = xpCalc.totalXpEarned;
    let weeklyBonusEarned = 0;
    let achievementBonusEarned = 0;

    const weekStart = getMondayOfWeek(todayDate);

    // Record checkin and calculate weekly progress for this goal
    let completedDaysInWeek = 1;
    let bonusAlreadyAwarded = false;

    if (isPostgresConfigured() && db) {
      // 1. Insert checkin for goal
      await db
        .insert(schema.dailyCheckins)
        .values({
          userId,
          goalId: targetGoal.id,
          date: todayDate,
          completed: true,
          mood: mood || null,
          journalNote: journalNote ? journalNote.slice(0, 280) : null,
        })
        .onConflictDoUpdate({
          target: [schema.dailyCheckins.userId, schema.dailyCheckins.goalId, schema.dailyCheckins.date],
          set: {
            completed: true,
            mood: mood || null,
            journalNote: journalNote ? journalNote.slice(0, 280) : null,
            updatedAt: new Date(),
          },
        });

      // 2. Fetch existing weekly progress and count distinct completed days in this week for this goal
      const weekDates = getWeekDates(weekStart);
      const weekCheckins = await db
        .select({ date: schema.dailyCheckins.date })
        .from(schema.dailyCheckins)
        .where(
          and(
            eq(schema.dailyCheckins.userId, userId),
            eq(schema.dailyCheckins.goalId, targetGoal.id),
            eq(schema.dailyCheckins.completed, true)
          )
        );

      const checkinDatesThisWeek = new Set(
        weekCheckins.map((c) => c.date).filter((d) => weekDates.includes(d))
      );
      checkinDatesThisWeek.add(todayDate);
      completedDaysInWeek = checkinDatesThisWeek.size;

      const existingWeekly = await db
        .select()
        .from(schema.weeklyProgress)
        .where(
          and(
            eq(schema.weeklyProgress.userId, userId),
            eq(schema.weeklyProgress.goalId, targetGoal.id),
            eq(schema.weeklyProgress.weekStart, weekStart)
          )
        )
        .limit(1);

      if (existingWeekly[0]) {
        bonusAlreadyAwarded = existingWeekly[0].bonusAwarded;
      }

      const goalMet = completedDaysInWeek >= targetGoal.targetDaysPerWeek;
      const shouldAwardWeeklyBonus = goalMet && !bonusAlreadyAwarded;
      if (shouldAwardWeeklyBonus) {
        weeklyBonusEarned = xpConfig.weeklyGoalXp;
        totalXpEarned += weeklyBonusEarned;
      }

      // Upsert weekly progress for this goal
      await db
        .insert(schema.weeklyProgress)
        .values({
          userId,
          goalId: targetGoal.id,
          weekStart,
          completedDays: completedDaysInWeek,
          weeklyGoal: targetGoal.targetDaysPerWeek,
          weekCompleted: goalMet,
          bonusAwarded: bonusAlreadyAwarded || shouldAwardWeeklyBonus,
        })
        .onConflictDoUpdate({
          target: [schema.weeklyProgress.userId, schema.weeklyProgress.goalId, schema.weeklyProgress.weekStart],
          set: {
            completedDays: completedDaysInWeek,
            weeklyGoal: targetGoal.targetDaysPerWeek,
            weekCompleted: goalMet,
            bonusAwarded: bonusAlreadyAwarded || shouldAwardWeeklyBonus,
            updatedAt: new Date(),
          },
        });

      // 3. Update the goal's own streaks
      await db
        .update(schema.goals)
        .set({
          currentStreak: streakEval.newStreak,
          longestStreak: streakEval.newLongestStreak,
          totalSuccessfulDays: streakEval.newTotalDays,
          lastCheckinDate: todayDate,
          updatedAt: new Date(),
        })
        .where(eq(schema.goals.id, targetGoal.id));

      targetGoal.currentStreak = streakEval.newStreak;
      targetGoal.longestStreak = streakEval.newLongestStreak;
      targetGoal.totalSuccessfulDays = streakEval.newTotalDays;
      targetGoal.lastCheckinDate = todayDate;
    } else {
      // Local store path
      const data = readLocalData();
      const existingIdx = data.dailyCheckins.findIndex(
        (c) => c.userId === userId && c.goalId === targetGoal.id && c.date === todayDate
      );
      const now = new Date().toISOString();

      if (existingIdx >= 0) {
        data.dailyCheckins[existingIdx].completed = true;
        data.dailyCheckins[existingIdx].mood = mood || null;
        data.dailyCheckins[existingIdx].journalNote = journalNote ? journalNote.slice(0, 280) : null;
        data.dailyCheckins[existingIdx].updatedAt = now;
      } else {
        data.dailyCheckins.push({
          id: crypto.randomUUID(),
          userId,
          goalId: targetGoal.id,
          date: todayDate,
          completed: true,
          mood: mood || null,
          journalNote: journalNote ? journalNote.slice(0, 280) : null,
          createdAt: now,
          updatedAt: now,
        });
      }

      const weekDates = getWeekDates(weekStart);
      const distinctDates = new Set(
        data.dailyCheckins
          .filter((c) => c.userId === userId && c.goalId === targetGoal.id && c.completed && weekDates.includes(c.date))
          .map((c) => c.date)
      );
      distinctDates.add(todayDate);
      completedDaysInWeek = distinctDates.size;

      let weekly = data.weeklyProgress.find(
        (w) => w.userId === userId && w.goalId === targetGoal.id && w.weekStart === weekStart
      );

      if (weekly) {
        bonusAlreadyAwarded = weekly.bonusAwarded;
      } else {
        weekly = {
          id: crypto.randomUUID(),
          userId,
          goalId: targetGoal.id,
          weekStart,
          completedDays: 1,
          weeklyGoal: targetGoal.targetDaysPerWeek,
          weekCompleted: false,
          bonusAwarded: false,
          createdAt: now,
          updatedAt: now,
        };
        data.weeklyProgress.push(weekly);
      }

      const goalMet = completedDaysInWeek >= targetGoal.targetDaysPerWeek;
      const shouldAwardWeeklyBonus = goalMet && !bonusAlreadyAwarded;
      if (shouldAwardWeeklyBonus) {
        weeklyBonusEarned = xpConfig.weeklyGoalXp;
        totalXpEarned += weeklyBonusEarned;
        weekly.bonusAwarded = true;
      }
      weekly.completedDays = completedDaysInWeek;
      weekly.weekCompleted = goalMet;
      weekly.updatedAt = now;

      // Update goal in local store
      const localGoal = (data.goals || []).find((g) => g.id === targetGoal.id);
      if (localGoal) {
        localGoal.currentStreak = streakEval.newStreak;
        localGoal.longestStreak = streakEval.newLongestStreak;
        localGoal.totalSuccessfulDays = streakEval.newTotalDays;
        localGoal.lastCheckinDate = todayDate;
        localGoal.updatedAt = now;
      }

      writeLocalData(data);
    }

    // Dynamic Ranks Evaluation (User lifetime XP & rank)
    const rankDefs = await this.getRankDefinitions();
    const tentativeXp = user.currentXp + totalXpEarned;
    const previousRank = user.currentRank;
    const rankInfo = getRankFromXp(tentativeXp, rankDefs);
    const newRank = rankInfo.currentRank.name;
    const didRankUp = newRank !== previousRank;

    // Evaluate Achievements
    const unlockedAchievementsList: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      xpReward: number;
    }> = [];

    let completedWeeklyGoalsCount = 0;
    const alreadyUnlockedIds = new Set<string>();

    if (isPostgresConfigured() && db) {
      // Fetch unlocked achievements
      const existingUnlocks = await db
        .select()
        .from(schema.userAchievements)
        .where(eq(schema.userAchievements.userId, userId));
      existingUnlocks.forEach((u) => alreadyUnlockedIds.add(u.achievementId));

      // Fetch completed weekly goals count across all goals
      const weeks = await db
        .select({ count: count() })
        .from(schema.weeklyProgress)
        .where(
          and(
            eq(schema.weeklyProgress.userId, userId),
            eq(schema.weeklyProgress.weekCompleted, true)
          )
        );
      completedWeeklyGoalsCount = Number(weeks[0]?.count || 0);
    } else {
      const data = readLocalData();
      data.userAchievements
        .filter((u) => u.userId === userId)
        .forEach((u) => alreadyUnlockedIds.add(u.achievementId));

      completedWeeklyGoalsCount = data.weeklyProgress.filter(
        (w) => w.userId === userId && w.weekCompleted
      ).length;
    }

    const achDefs = await this.getAchievementDefinitions();
    const newAchievements = checkNewAchievements(
      {
        streak: streakEval.newStreak,
        longestStreak: Math.max(user.longestStreak, streakEval.newLongestStreak),
        totalDays: user.totalSuccessfulDays + 1,
        completedWeeklyGoals: completedWeeklyGoalsCount,
        currentRank: newRank,
        totalXp: tentativeXp,
      },
      alreadyUnlockedIds,
      achDefs
    );

    // Award achievement XP and record unlocks
    for (const ach of newAchievements) {
      achievementBonusEarned += ach.xpReward;
      totalXpEarned += ach.xpReward;
      unlockedAchievementsList.push({
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        xpReward: ach.xpReward,
      });

      // Save unlock
      if (isPostgresConfigured() && db) {
        try {
          await db
            .insert(schema.userAchievements)
            .values({
              userId,
              achievementId: ach.id,
            })
            .onConflictDoNothing();
        } catch {
          // ignore duplicate
        }
      } else {
        const data = readLocalData();
        data.userAchievements.push({
          id: crypto.randomUUID(),
          userId,
          achievementId: ach.id,
          unlockedAt: new Date().toISOString(),
        });
        writeLocalData(data);
      }
    }

    // Final total XP and rank
    const finalXp = user.currentXp + totalXpEarned;
    const finalRankInfo = getRankFromXp(finalXp, rankDefs);
    const finalRank = finalRankInfo.currentRank.name;

    // Update user record
    if (isPostgresConfigured() && db) {
      await db
        .update(schema.users)
        .set({
          currentXp: finalXp,
          currentStreak: streakEval.newStreak,
          longestStreak: Math.max(user.longestStreak, streakEval.newLongestStreak),
          totalSuccessfulDays: user.totalSuccessfulDays + 1,
          currentRank: finalRank,
          lastCheckinDate: todayDate,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    } else {
      const data = readLocalData();
      const u = data.users.find((userItem) => userItem.id === userId);
      if (u) {
        u.currentXp = finalXp;
        u.currentStreak = streakEval.newStreak;
        u.longestStreak = Math.max(user.longestStreak, streakEval.newLongestStreak);
        u.totalSuccessfulDays = user.totalSuccessfulDays + 1;
        u.currentRank = finalRank;
        u.lastCheckinDate = todayDate;
        u.updatedAt = new Date().toISOString();
        writeLocalData(data);
      }
    }

    const hasRankedUp = finalRank !== previousRank || didRankUp;

    return {
      success: true,
      message: streakEval.supportiveMessage,
      isDuplicate: false,
      xpEarned: totalXpEarned,
      xpBreakdown: {
        baseXp: xpCalc.baseXp,
        milestoneBonus: xpCalc.milestoneBonus,
        milestoneReason: xpCalc.milestoneReason,
        weeklyBonus: weeklyBonusEarned,
        achievementBonus: achievementBonusEarned,
      },
      newStreak: streakEval.newStreak,
      newLongestStreak: streakEval.newLongestStreak,
      newTotalDays: streakEval.newTotalDays,
      currentRank: finalRank,
      previousRank,
      didRankUp: hasRankedUp,
      newRankDetails: finalRankInfo.currentRank,
      rankUpMessage: finalRankInfo.currentRank.rankUpMessage || 'New Rank Unlocked!',
      celebrationVideoUrl: finalRankInfo.currentRank.celebrationVideoUrl || settingsMap.celebration_video_url || '/videos/celebration.mp4',
      unlockedAchievements: unlockedAchievementsList,
      goalDetails: targetGoal,
    };
  },

  async saveDailyReflection(
    userId: string,
    todayDate: string,
    mood?: string | null,
    journalNote?: string | null,
    goalId?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    const userGoals = await this.getUserGoals(userId);
    const targetGoal = (goalId ? userGoals.find((g) => g.id === goalId) : null) || userGoals[0];
    const targetGoalId = targetGoal?.id;

    if (isPostgresConfigured() && db) {
      await db
        .insert(schema.dailyCheckins)
        .values({
          userId,
          goalId: targetGoalId,
          date: todayDate,
          completed: true,
          mood: mood || null,
          journalNote: journalNote ? journalNote.slice(0, 280) : null,
        })
        .onConflictDoUpdate({
          target: [schema.dailyCheckins.userId, schema.dailyCheckins.goalId, schema.dailyCheckins.date],
          set: {
            mood: mood || null,
            journalNote: journalNote ? journalNote.slice(0, 280) : null,
            updatedAt: new Date(),
          },
        });
      return { success: true };
    } else {
      const data = readLocalData();
      const existingIdx = data.dailyCheckins.findIndex(
        (c) => c.userId === userId && c.goalId === targetGoalId && c.date === todayDate
      );
      const now = new Date().toISOString();
      if (existingIdx >= 0) {
        data.dailyCheckins[existingIdx].mood = mood || null;
        data.dailyCheckins[existingIdx].journalNote = journalNote ? journalNote.slice(0, 280) : null;
        data.dailyCheckins[existingIdx].updatedAt = now;
      } else {
        data.dailyCheckins.push({
          id: crypto.randomUUID(),
          userId,
          goalId: targetGoalId,
          date: todayDate,
          completed: true,
          mood: mood || null,
          journalNote: journalNote ? journalNote.slice(0, 280) : null,
          createdAt: now,
          updatedAt: now,
        });
      }
      writeLocalData(data);
      return { success: true };
    }
  },

  // ----------------------------------------------------
  // DASHBOARD DATA AGGREGATOR
  // ----------------------------------------------------
  async getDashboardData(userId: string, todayDate: string, goalId?: string | null) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const userGoals = await this.getUserGoals(userId);
    const currentGoal = (goalId ? userGoals.find((g) => g.id === goalId) : null) || userGoals[0];
    if (!currentGoal) return null;

    const rankDefs = await this.getRankDefinitions();
    const settingsMap = await this.getAppSettingsMap();
    const rankInfo = getRankFromXp(user.currentXp, rankDefs);
    const weekStart = getMondayOfWeek(todayDate);

    let weekCheckins: Array<{
      date: string;
      completed: boolean;
      mood: string | null;
      journalNote: string | null;
    }> = [];
    let isTodayCheckedIn = false;
    let todayMood: string | null = null;
    let todayJournal: string | null = null;
    let bonusAwarded = false;

    if (isPostgresConfigured() && db) {
      // Check today's checkin for currentGoal
      const todayCheckin = await db
        .select()
        .from(schema.dailyCheckins)
        .where(
          and(
            eq(schema.dailyCheckins.userId, userId),
            eq(schema.dailyCheckins.goalId, currentGoal.id),
            eq(schema.dailyCheckins.date, todayDate)
          )
        )
        .limit(1);

      if (todayCheckin[0] && todayCheckin[0].completed) {
        isTodayCheckedIn = true;
        todayMood = todayCheckin[0].mood;
        todayJournal = todayCheckin[0].journalNote;
      }

      // Check current week
      const weekly = await db
        .select()
        .from(schema.weeklyProgress)
        .where(
          and(
            eq(schema.weeklyProgress.userId, userId),
            eq(schema.weeklyProgress.goalId, currentGoal.id),
            eq(schema.weeklyProgress.weekStart, weekStart)
          )
        )
        .limit(1);
      if (weekly[0]) {
        bonusAwarded = weekly[0].bonusAwarded;
      }

      // Fetch all checkins for the week for this goal
      const allCheckins = await db
        .select()
        .from(schema.dailyCheckins)
        .where(
          and(
            eq(schema.dailyCheckins.userId, userId),
            eq(schema.dailyCheckins.goalId, currentGoal.id)
          )
        );
      weekCheckins = allCheckins;
    } else {
      const data = readLocalData();
      const todayCheckin = (data.dailyCheckins || []).find(
        (c) => c.userId === userId && c.goalId === currentGoal.id && c.date === todayDate
      );
      if (todayCheckin && todayCheckin.completed) {
        isTodayCheckedIn = true;
        todayMood = todayCheckin.mood;
        todayJournal = todayCheckin.journalNote;
      }

      const weekly = (data.weeklyProgress || []).find(
        (w) => w.userId === userId && w.goalId === currentGoal.id && w.weekStart === weekStart
      );
      if (weekly) {
        bonusAwarded = weekly.bonusAwarded;
      }

      weekCheckins = (data.dailyCheckins || []).filter(
        (c) => c.userId === userId && c.goalId === currentGoal.id
      );
    }

    const completedDatesSet = new Set(
      weekCheckins.filter((c) => c.completed).map((c) => c.date)
    );

    const weeklyGoalBonusXp = Number(settingsMap.weekly_goal_xp ?? 100);
    const weeklyStatus = computeWeeklyStatus(
      weekStart,
      todayDate,
      completedDatesSet,
      currentGoal.targetDaysPerWeek,
      bonusAwarded,
      weeklyGoalBonusXp
    );

    return {
      user: {
        id: user.id,
        currentXp: user.currentXp,
        currentStreak: currentGoal.currentStreak,
        longestStreak: currentGoal.longestStreak,
        totalSuccessfulDays: currentGoal.totalSuccessfulDays,
        currentRank: rankInfo.currentRank.name,
        weeklyGoal: currentGoal.targetDaysPerWeek,
      },
      currentGoal,
      goals: userGoals,
      rankInfo,
      appSettings: settingsMap,
      isTodayCheckedIn,
      todayMood,
      todayJournal,
      weeklyStatus,
    };
  },

  // ----------------------------------------------------
  // HISTORY / CALENDAR DATA
  // ----------------------------------------------------
  async getHistoryData(userId: string, goalId?: string | null) {
    if (isPostgresConfigured() && db) {
      const conditions = [eq(schema.dailyCheckins.userId, userId)];
      if (goalId && goalId !== 'all') {
        conditions.push(eq(schema.dailyCheckins.goalId, goalId));
      }
      const checkins = await db
        .select()
        .from(schema.dailyCheckins)
        .where(and(...conditions))
        .orderBy(desc(schema.dailyCheckins.date));
      return checkins;
    } else {
      const data = readLocalData();
      return (data.dailyCheckins || [])
        .filter((c) => c.userId === userId && (!goalId || goalId === 'all' || c.goalId === goalId))
        .sort((a, b) => b.date.localeCompare(a.date));
    }
  },

  // ----------------------------------------------------
  // STATS DATA
  // ----------------------------------------------------
  async getStatsData(userId: string, goalId?: string | null) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const rankDefs = await this.getRankDefinitions();
    const rankInfo = getRankFromXp(user.currentXp, rankDefs);

    const userGoals = await this.getUserGoals(userId);
    const activeGoal = goalId && goalId !== 'all' ? userGoals.find((g) => g.id === goalId) || userGoals[0] : null;

    let checkins: Array<{ date: string; completed: boolean; mood: string | null }> = [];
    let completedWeeksCount = 0;

    if (isPostgresConfigured() && db) {
      const conditions = [eq(schema.dailyCheckins.userId, userId)];
      if (activeGoal) {
        conditions.push(eq(schema.dailyCheckins.goalId, activeGoal.id));
      }
      checkins = await db
        .select()
        .from(schema.dailyCheckins)
        .where(and(...conditions));

      const weeklyConditions = [
        eq(schema.weeklyProgress.userId, userId),
        eq(schema.weeklyProgress.weekCompleted, true),
      ];
      if (activeGoal) {
        weeklyConditions.push(eq(schema.weeklyProgress.goalId, activeGoal.id));
      }

      const weeks = await db
        .select({ count: count() })
        .from(schema.weeklyProgress)
        .where(and(...weeklyConditions));
      completedWeeksCount = Number(weeks[0]?.count || 0);
    } else {
      const data = readLocalData();
      checkins = (data.dailyCheckins || []).filter(
        (c) => c.userId === userId && (!activeGoal || c.goalId === activeGoal.id)
      );
      completedWeeksCount = (data.weeklyProgress || []).filter(
        (w) => w.userId === userId && w.weekCompleted && (!activeGoal || w.goalId === activeGoal.id)
      ).length;
    }

    const totalCheckins = checkins.filter((c) => c.completed).length;

    // Mood counts
    const moodCounts = {
      difficult: 0,
      normal: 0,
      easy: 0,
    };
    checkins.forEach((c) => {
      if (c.mood === 'difficult') moodCounts.difficult++;
      else if (c.mood === 'normal') moodCounts.normal++;
      else if (c.mood === 'easy') moodCounts.easy++;
    });

    return {
      currentStreak: activeGoal ? activeGoal.currentStreak : user.currentStreak,
      longestStreak: activeGoal ? activeGoal.longestStreak : user.longestStreak,
      totalSuccessfulDays: activeGoal ? activeGoal.totalSuccessfulDays : user.totalSuccessfulDays,
      totalWeeksCompleted: completedWeeksCount,
      currentXp: user.currentXp,
      currentRank: rankInfo.currentRank.name,
      rankInfo,
      totalCheckinsRecorded: totalCheckins,
      moodCounts,
      goals: userGoals,
      activeGoal: activeGoal || userGoals[0] || null,
    };
  },

  // ----------------------------------------------------
  // ACHIEVEMENTS LIST & UNLOCKED STATUS
  // ----------------------------------------------------
  async getAchievementsForUser(userId: string) {
    const unlockedMap = new Map<string, string>(); // achievementId -> unlockedAt

    if (isPostgresConfigured() && db) {
      const userUnlocks = await db
        .select()
        .from(schema.userAchievements)
        .where(eq(schema.userAchievements.userId, userId));
      userUnlocks.forEach((u) => {
        unlockedMap.set(u.achievementId, u.unlockedAt.toISOString());
      });
    } else {
      const data = readLocalData();
      data.userAchievements
        .filter((u) => u.userId === userId)
        .forEach((u) => {
          unlockedMap.set(u.achievementId, u.unlockedAt);
        });
    }

    const achDefs = await this.getAchievementDefinitions();

    return achDefs.map((ach) => ({
      ...ach,
      unlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id) || null,
    }));
  },

  // ----------------------------------------------------
  // SETTINGS & PROFILE UPDATE
  // ----------------------------------------------------
  async getSettings(userId: string) {
    if (isPostgresConfigured() && db) {
      const s = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.userId, userId))
        .limit(1);
      return s[0] || null;
    } else {
      const data = readLocalData();
      return data.settings.find((s) => s.userId === userId) || null;
    }
  },

  async updateSettings(
    userId: string,
    updates: {
      weeklyGoal?: number;
      soundEnabled?: boolean;
      hapticsEnabled?: boolean;
      theme?: string;
    }
  ) {
    if (updates.weeklyGoal !== undefined) {
      const goal = Math.max(1, Math.min(7, updates.weeklyGoal));
      if (isPostgresConfigured() && db) {
        await db
          .update(schema.users)
          .set({ weeklyGoal: goal, updatedAt: new Date() })
          .where(eq(schema.users.id, userId));
      } else {
        const data = readLocalData();
        const u = data.users.find((user) => user.id === userId);
        if (u) {
          u.weeklyGoal = goal;
          u.updatedAt = new Date().toISOString();
          writeLocalData(data);
        }
      }
    }

    if (isPostgresConfigured() && db) {
      await db
        .update(schema.settings)
        .set({
          soundEnabled: updates.soundEnabled,
          hapticsEnabled: updates.hapticsEnabled,
          theme: updates.theme,
          updatedAt: new Date(),
        })
        .where(eq(schema.settings.userId, userId));
    } else {
      const data = readLocalData();
      const s = data.settings.find((set) => set.userId === userId);
      if (s) {
        if (updates.soundEnabled !== undefined) s.soundEnabled = updates.soundEnabled;
        if (updates.hapticsEnabled !== undefined) s.hapticsEnabled = updates.hapticsEnabled;
        if (updates.theme !== undefined) s.theme = updates.theme;
        s.updatedAt = new Date().toISOString();
        writeLocalData(data);
      }
    }
  },

  // ----------------------------------------------------
  // DANGER ZONE: DELETE ALL DATA
  // ----------------------------------------------------
  async deleteAllUserData(userId: string) {
    if (isPostgresConfigured() && db) {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    } else {
      const data = readLocalData();
      data.users = data.users.filter((u) => u.id !== userId);
      data.dailyCheckins = data.dailyCheckins.filter((c) => c.userId !== userId);
      data.weeklyProgress = data.weeklyProgress.filter((w) => w.userId !== userId);
      data.userAchievements = data.userAchievements.filter((a) => a.userId !== userId);
      data.settings = data.settings.filter((s) => s.userId !== userId);
      writeLocalData(data);
    }
  },

  // ----------------------------------------------------
  // ADMIN AGGREGATE TELEMETRY (ZERO JOURNAL PRIVACY LEAKAGE)
  // ----------------------------------------------------
  async getAdminAggregates() {
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setUTCDate(sevenDaysAgoDate.getUTCDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().split('T')[0];

    if (isPostgresConfigured() && db) {
      const allUsers = await db.select().from(schema.users);
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter((u) => u.lastCheckinDate && u.lastCheckinDate >= sevenDaysAgoStr).length;
      const totalXpAwarded = allUsers.reduce((sum, u) => sum + (u.currentXp || 0), 0);

      const allCheckins = await db.select().from(schema.dailyCheckins);
      const totalCheckins = allCheckins.length;
      const checkinsToday = allCheckins.filter((c) => c.date === todayStr && c.completed).length;

      const allWeeks = await db.select().from(schema.weeklyProgress);
      const totalWeeksCompleted = allWeeks.filter((w) => w.weekCompleted).length;
      const weeklyCompletionRate = allWeeks.length > 0 ? Math.round((totalWeeksCompleted / allWeeks.length) * 100) : 0;

      // Rank distribution
      const rankDistribution: Record<string, number> = {};
      allUsers.forEach((u) => {
        rankDistribution[u.currentRank] = (rankDistribution[u.currentRank] || 0) + 1;
      });

      let mostCommonRank = 'Beginner';
      let maxCount = -1;
      for (const [rank, cnt] of Object.entries(rankDistribution)) {
        if (cnt > maxCount) {
          maxCount = cnt;
          mostCommonRank = rank;
        }
      }

      // Achievement stats
      const userAchs = await db.select().from(schema.userAchievements);
      const achievementsUnlocked = userAchs.length;
      const achievementStats: Record<string, number> = {};
      userAchs.forEach((u) => {
        achievementStats[u.achievementId] = (achievementStats[u.achievementId] || 0) + 1;
      });

      const auditLogs = await db
        .select()
        .from(schema.adminAuditLogs)
        .orderBy(desc(schema.adminAuditLogs.timestamp))
        .limit(30);

      return {
        totalUsers,
        activeUsers,
        totalCheckins,
        checkinsToday,
        totalWeeksCompleted,
        weeklyCompletionRate,
        mostCommonRank,
        totalXpAwarded,
        achievementsUnlocked,
        rankDistribution,
        achievementStats,
        auditLogs,
      };
    } else {
      const data = readLocalData();
      const allUsers = data.users;
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter((u) => u.lastCheckinDate && u.lastCheckinDate >= sevenDaysAgoStr).length;
      const totalXpAwarded = allUsers.reduce((sum, u) => sum + (u.currentXp || 0), 0);

      const allCheckins = data.dailyCheckins;
      const totalCheckins = allCheckins.length;
      const checkinsToday = allCheckins.filter((c) => c.date === todayStr && c.completed).length;

      const allWeeks = data.weeklyProgress;
      const totalWeeksCompleted = allWeeks.filter((w) => w.weekCompleted).length;
      const weeklyCompletionRate = allWeeks.length > 0 ? Math.round((totalWeeksCompleted / allWeeks.length) * 100) : 0;

      const rankDistribution: Record<string, number> = {};
      allUsers.forEach((u) => {
        rankDistribution[u.currentRank] = (rankDistribution[u.currentRank] || 0) + 1;
      });

      let mostCommonRank = 'Beginner';
      let maxCount = -1;
      for (const [rank, cnt] of Object.entries(rankDistribution)) {
        if (cnt > maxCount) {
          maxCount = cnt;
          mostCommonRank = rank;
        }
      }

      const achievementsUnlocked = data.userAchievements.length;
      const achievementStats: Record<string, number> = {};
      data.userAchievements.forEach((u) => {
        achievementStats[u.achievementId] = (achievementStats[u.achievementId] || 0) + 1;
      });

      return {
        totalUsers,
        activeUsers,
        totalCheckins,
        checkinsToday,
        totalWeeksCompleted,
        weeklyCompletionRate,
        mostCommonRank,
        totalXpAwarded,
        achievementsUnlocked,
        rankDistribution,
        achievementStats,
        auditLogs: data.adminAuditLogs.slice(-30).reverse(),
      };
    }
  },

  async logAdminAction(action: string, metadata?: Record<string, unknown>) {
    const timestamp = new Date();
    if (isPostgresConfigured() && db) {
      await db.insert(schema.adminAuditLogs).values({
        adminAction: action,
        timestamp,
        metadata: metadata || null,
      });
    } else {
      const data = readLocalData();
      data.adminAuditLogs.push({
        id: crypto.randomUUID(),
        adminAction: action,
        timestamp: timestamp.toISOString(),
        metadata: metadata || null,
      });
      writeLocalData(data);
    }
  },

  // ----------------------------------------------------
  // RANK DEFINITIONS CMS
  // ----------------------------------------------------
  async getRankDefinitions(): Promise<RankDefinition[]> {
    if (isPostgresConfigured() && db) {
      const records = await db
        .select()
        .from(schema.rankDefinitions)
        .where(eq(schema.rankDefinitions.enabled, true))
        .orderBy(asc(schema.rankDefinitions.displayOrder), asc(schema.rankDefinitions.minXp));
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        minXp: r.minXp,
        icon: r.icon,
        logoUrl: r.logoUrl,
        description: r.description,
        badgeColor: r.badgeColor,
        glowColor: r.glowColor,
        rankUpMessage: r.rankUpMessage,
        celebrationVideoUrl: r.celebrationVideoUrl,
        displayOrder: r.displayOrder,
        enabled: r.enabled,
      }));
    } else {
      const data = readLocalData();
      const list = data.rankDefinitions && data.rankDefinitions.length > 0 ? data.rankDefinitions : DEFAULT_RANKS;
      return list
        .filter((r) => r.enabled !== false)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }
  },

  async getAllRankDefinitions(): Promise<RankDefinition[]> {
    if (isPostgresConfigured() && db) {
      const records = await db
        .select()
        .from(schema.rankDefinitions)
        .orderBy(asc(schema.rankDefinitions.displayOrder));
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        minXp: r.minXp,
        icon: r.icon,
        logoUrl: r.logoUrl,
        description: r.description,
        badgeColor: r.badgeColor,
        glowColor: r.glowColor,
        rankUpMessage: r.rankUpMessage,
        celebrationVideoUrl: r.celebrationVideoUrl,
        displayOrder: r.displayOrder,
        enabled: r.enabled,
      }));
    } else {
      const data = readLocalData();
      const list = data.rankDefinitions && data.rankDefinitions.length > 0 ? data.rankDefinitions : DEFAULT_RANKS;
      return [...list].sort((a, b) => a.displayOrder - b.displayOrder);
    }
  },

  async saveRankDefinition(rank: Partial<RankDefinition> & { name: string; minXp: number; description: string; icon: string }): Promise<{ success: boolean; error?: string }> {
    const existing = await this.getAllRankDefinitions();
    const rankId = rank.id || rank.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const isNew = !existing.some((r) => r.id === rankId);

    const nextRanks = isNew
      ? [...existing, { ...rank, id: rankId, displayOrder: rank.displayOrder ?? existing.length + 1, enabled: rank.enabled ?? true, badgeColor: rank.badgeColor || 'text-amber-400 bg-amber-950/80 border-amber-700', glowColor: rank.glowColor || 'shadow-amber-500/20', rankUpMessage: rank.rankUpMessage || `Rank ${rank.name} Unlocked!` }]
      : existing.map((r) => (r.id === rankId ? { ...r, ...rank } : r));

    const validation = validateRankHierarchy(nextRanks);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const now = new Date();
    if (isPostgresConfigured() && db) {
      await db
        .insert(schema.rankDefinitions)
        .values({
          id: rankId,
          name: rank.name,
          description: rank.description,
          icon: rank.icon,
          logoUrl: rank.logoUrl || null,
          minXp: rank.minXp,
          displayOrder: rank.displayOrder ?? existing.length + 1,
          enabled: rank.enabled ?? true,
          badgeColor: rank.badgeColor || 'text-amber-400 bg-amber-950/80 border-amber-700',
          glowColor: rank.glowColor || 'shadow-amber-500/20',
          rankUpMessage: rank.rankUpMessage || `Rank ${rank.name} Unlocked!`,
          celebrationVideoUrl: rank.celebrationVideoUrl || null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.rankDefinitions.id,
          set: {
            name: rank.name,
            description: rank.description,
            icon: rank.icon,
            logoUrl: rank.logoUrl || null,
            minXp: rank.minXp,
            displayOrder: rank.displayOrder ?? existing.length + 1,
            enabled: rank.enabled ?? true,
            badgeColor: rank.badgeColor || 'text-amber-400 bg-amber-950/80 border-amber-700',
            glowColor: rank.glowColor || 'shadow-amber-500/20',
            rankUpMessage: rank.rankUpMessage || `Rank ${rank.name} Unlocked!`,
            celebrationVideoUrl: rank.celebrationVideoUrl || null,
            updatedAt: now,
          },
        });
    } else {
      const data = readLocalData();
      const idx = data.rankDefinitions.findIndex((r) => r.id === rankId);
      const entry = {
        id: rankId,
        name: rank.name,
        description: rank.description,
        icon: rank.icon,
        logoUrl: rank.logoUrl || null,
        minXp: rank.minXp,
        displayOrder: rank.displayOrder ?? existing.length + 1,
        enabled: rank.enabled ?? true,
        badgeColor: rank.badgeColor || 'text-amber-400 bg-amber-950/80 border-amber-700',
        glowColor: rank.glowColor || 'shadow-amber-500/20',
        rankUpMessage: rank.rankUpMessage || `Rank ${rank.name} Unlocked!`,
        celebrationVideoUrl: rank.celebrationVideoUrl || null,
        createdAt: idx >= 0 ? data.rankDefinitions[idx].createdAt : now.toISOString(),
        updatedAt: now.toISOString(),
      };
      if (idx >= 0) {
        data.rankDefinitions[idx] = entry;
      } else {
        data.rankDefinitions.push(entry);
      }
      writeLocalData(data);
    }

    await this.logAdminAction(isNew ? 'RANK_CREATED' : 'RANK_UPDATED', { rankId, rankName: rank.name, minXp: rank.minXp });
    return { success: true };
  },

  async deleteRankDefinition(id: string): Promise<{ success: boolean; error?: string }> {
    const all = await this.getAllRankDefinitions();
    const target = all.find((r) => r.id === id);
    if (!target) return { success: false, error: 'Rank not found' };
    if (target.minXp === 0 || target.displayOrder === 1) {
      return { success: false, error: 'Cannot delete the starting 0 XP base rank.' };
    }
    if (all.length <= 1) {
      return { success: false, error: 'Cannot delete the only remaining rank.' };
    }

    if (isPostgresConfigured() && db) {
      await db.delete(schema.rankDefinitions).where(eq(schema.rankDefinitions.id, id));
    } else {
      const data = readLocalData();
      data.rankDefinitions = data.rankDefinitions.filter((r) => r.id !== id);
      writeLocalData(data);
    }

    await this.logAdminAction('RANK_DELETED', { rankId: id, rankName: target.name });
    return { success: true };
  },

  async reorderRanks(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (isPostgresConfigured() && db) {
      for (let i = 0; i < orderedIds.length; i++) {
        await db
          .update(schema.rankDefinitions)
          .set({ displayOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.rankDefinitions.id, orderedIds[i]));
      }
    } else {
      const data = readLocalData();
      orderedIds.forEach((id, idx) => {
        const found = data.rankDefinitions.find((r) => r.id === id);
        if (found) {
          found.displayOrder = idx + 1;
          found.updatedAt = new Date().toISOString();
        }
      });
      writeLocalData(data);
    }
    await this.logAdminAction('RANKS_REORDERED', { count: orderedIds.length });
    return { success: true };
  },

  // ----------------------------------------------------
  // APP SETTINGS CMS
  // ----------------------------------------------------
  async getAppSettings(): Promise<Array<{ id: string; key: string; value: string; valueType: string; category: string; description: string | null }>> {
    if (isPostgresConfigured() && db) {
      return await db.select().from(schema.appSettings);
    } else {
      const data = readLocalData();
      const rawSettings = data.appSettings && data.appSettings.length > 0 ? data.appSettings : DEFAULT_APP_SETTINGS;
      return rawSettings.map((s) => ({
        id: s.id,
        key: s.key,
        value: s.value,
        valueType: s.valueType,
        category: s.category,
        description: s.description ?? null,
      }));
    }
  },

  async getAppSettingsMap(): Promise<Record<string, string>> {
    const list = await this.getAppSettings();
    const map: Record<string, string> = {};
    list.forEach((s) => {
      map[s.key] = s.value;
    });
    return map;
  },

  async updateAppSettings(updates: Record<string, string>): Promise<{ success: boolean; error?: string }> {
    const now = new Date();
    if (isPostgresConfigured() && db) {
      for (const [key, value] of Object.entries(updates)) {
        await db
          .insert(schema.appSettings)
          .values({
            id: key,
            key,
            value: String(value),
            valueType: 'string',
            category: 'general',
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.appSettings.key,
            set: { value: String(value), updatedAt: now },
          });
      }
    } else {
      const data = readLocalData();
      for (const [key, value] of Object.entries(updates)) {
        const item = data.appSettings.find((s) => s.key === key);
        if (item) {
          item.value = String(value);
          item.updatedAt = now.toISOString();
        } else {
          data.appSettings.push({
            id: key,
            key,
            value: String(value),
            valueType: 'string',
            category: 'general',
            description: null,
            updatedAt: now.toISOString(),
          });
        }
      }
      writeLocalData(data);
    }
    await this.logAdminAction('APP_SETTINGS_UPDATED', { updatedKeys: Object.keys(updates) });
    return { success: true };
  },

  // ----------------------------------------------------
  // ACHIEVEMENTS CMS
  // ----------------------------------------------------
  async getAchievementDefinitions(): Promise<AchievementDefinition[]> {
    if (isPostgresConfigured() && db) {
      const records = await db
        .select()
        .from(schema.achievements)
        .orderBy(asc(schema.achievements.displayOrder));
      return records.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        requirementType: a.requirementType as AchievementDefinition['requirementType'],
        requirementValue: a.requirementValue,
        xpReward: a.xpReward,
        displayOrder: a.displayOrder,
        enabled: a.enabled,
      }));
    } else {
      const data = readLocalData();
      return ((data.achievements || []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))) as AchievementDefinition[];
    }
  },

  async saveAchievementDefinition(ach: AchievementDefinition): Promise<{ success: boolean; error?: string }> {
    const now = new Date();
    if (ach.xpReward < 0) {
      return { success: false, error: 'XP reward cannot be negative.' };
    }

    if (isPostgresConfigured() && db) {
      await db
        .insert(schema.achievements)
        .values({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          requirementType: ach.requirementType,
          requirementValue: ach.requirementValue,
          xpReward: ach.xpReward,
          displayOrder: ach.displayOrder ?? 1,
          enabled: ach.enabled ?? true,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.achievements.id,
          set: {
            name: ach.name,
            description: ach.description,
            icon: ach.icon,
            requirementType: ach.requirementType,
            requirementValue: ach.requirementValue,
            xpReward: ach.xpReward,
            displayOrder: ach.displayOrder ?? 1,
            enabled: ach.enabled ?? true,
            updatedAt: now,
          },
        });
    } else {
      const data = readLocalData();
      const idx = data.achievements.findIndex((a) => a.id === ach.id);
      const entry = {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        requirementType: ach.requirementType,
        requirementValue: ach.requirementValue,
        xpReward: ach.xpReward,
        displayOrder: ach.displayOrder ?? 1,
        enabled: ach.enabled ?? true,
        createdAt: idx >= 0 ? data.achievements[idx].createdAt : now.toISOString(),
        updatedAt: now.toISOString(),
      };
      if (idx >= 0) {
        data.achievements[idx] = entry;
      } else {
        data.achievements.push(entry);
      }
      writeLocalData(data);
    }
    await this.logAdminAction('ACHIEVEMENT_SAVED', { achievementId: ach.id, name: ach.name });
    return { success: true };
  },

  async deleteAchievementDefinition(id: string): Promise<{ success: boolean; error?: string }> {
    if (isPostgresConfigured() && db) {
      await db.delete(schema.achievements).where(eq(schema.achievements.id, id));
    } else {
      const data = readLocalData();
      data.achievements = data.achievements.filter((a) => a.id !== id);
      writeLocalData(data);
    }
    await this.logAdminAction('ACHIEVEMENT_DELETED', { achievementId: id });
    return { success: true };
  },

  async reorderAchievements(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (isPostgresConfigured() && db) {
      for (let i = 0; i < orderedIds.length; i++) {
        await db
          .update(schema.achievements)
          .set({ displayOrder: i + 1, updatedAt: new Date() })
          .where(eq(schema.achievements.id, orderedIds[i]));
      }
    } else {
      const data = readLocalData();
      orderedIds.forEach((id, idx) => {
        const found = data.achievements.find((a) => a.id === id);
        if (found) {
          found.displayOrder = idx + 1;
          found.updatedAt = new Date().toISOString();
        }
      });
      writeLocalData(data);
    }
    await this.logAdminAction('ACHIEVEMENTS_REORDERED', { count: orderedIds.length });
    return { success: true };
  },

  // ----------------------------------------------------
  // ADMIN SECURITY & AUDIT LOGS
  // ----------------------------------------------------
  async changeAdminPin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
    if (!newPin || newPin.length < 4) {
      return { success: false, error: 'New PIN must be at least 4 digits.' };
    }

    const settingsMap = await this.getAppSettingsMap();
    const storedHash = settingsMap.admin_pin_hash || process.env.ADMIN_PIN_HASH || process.env.ADMIN_PIN || '$2a$10$w09aR91zW46GqZ7vIqK0ce23Fk5W4j3oP0l87dJ6x9i11K1N2v7ey';

    let isValid = false;
    if (storedHash.startsWith('$2')) {
      isValid = await bcrypt.compare(currentPin, storedHash);
    } else {
      isValid = currentPin === storedHash;
    }

    if (!isValid) {
      await this.logAdminAction('FAILED_ADMIN_PIN_CHANGE_ATTEMPT');
      return { success: false, error: 'Current Admin PIN is incorrect.' };
    }

    const newHash = await bcrypt.hash(newPin, 10);
    await this.updateAppSettings({ admin_pin_hash: newHash });
    await this.logAdminAction('ADMIN_PIN_CHANGED');
    return { success: true };
  },

  async getAdminAuditLogs(limit: number = 100) {
    if (isPostgresConfigured() && db) {
      return await db
        .select()
        .from(schema.adminAuditLogs)
        .orderBy(desc(schema.adminAuditLogs.timestamp))
        .limit(limit);
    } else {
      const data = readLocalData();
      return (data.adminAuditLogs || []).slice(-limit).reverse();
    }
  },

  // ----------------------------------------------------
  // BULK & RAW JSON CMS OPERATIONS
  // ----------------------------------------------------
  async saveBulkRanks(newRanks: RankDefinition[]): Promise<{ success: boolean; error?: string }> {
    if (!Array.isArray(newRanks) || newRanks.length === 0) {
      return { success: false, error: 'Ranks JSON must be a non-empty array.' };
    }

    const validation = validateRankHierarchy(newRanks);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const now = new Date();
    if (isPostgresConfigured() && db) {
      for (const r of newRanks) {
        if (!r.name || r.minXp === undefined) {
          return { success: false, error: `Invalid rank definition: missing name or minXp for rank "${r.id || 'unknown'}"` };
        }
        const rankId = r.id || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await db
          .insert(schema.rankDefinitions)
          .values({
            id: rankId,
            name: r.name,
            description: r.description || '',
            icon: r.icon || '⚔️',
            logoUrl: r.logoUrl || null,
            minXp: r.minXp,
            displayOrder: r.displayOrder ?? 1,
            enabled: r.enabled ?? true,
            badgeColor: r.badgeColor || 'text-amber-400 bg-amber-950/80 border-amber-700',
            glowColor: r.glowColor || 'shadow-amber-500/20',
            rankUpMessage: r.rankUpMessage || `Rank ${r.name} Unlocked!`,
            celebrationVideoUrl: r.celebrationVideoUrl || null,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.rankDefinitions.id,
            set: {
              name: r.name,
              description: r.description || '',
              icon: r.icon || '⚔️',
              logoUrl: r.logoUrl || null,
              minXp: r.minXp,
              displayOrder: r.displayOrder ?? 1,
              enabled: r.enabled ?? true,
              badgeColor: r.badgeColor || 'text-amber-400 bg-amber-950/80 border-amber-700',
              glowColor: r.glowColor || 'shadow-amber-500/20',
              rankUpMessage: r.rankUpMessage || `Rank ${r.name} Unlocked!`,
              celebrationVideoUrl: r.celebrationVideoUrl || null,
              updatedAt: now,
            },
          });
      }
      await this.logAdminAction('BULK_RANKS_UPDATED_JSON', { count: newRanks.length });
      return { success: true };
    } else {
      const data = readLocalData();
      data.rankDefinitions = newRanks.map((r, idx) => ({
        ...r,
        id: r.id || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        displayOrder: r.displayOrder ?? idx + 1,
        enabled: r.enabled ?? true,
        rankUpMessage: r.rankUpMessage || `Rank ${r.name} Unlocked!`,
        badgeColor: r.badgeColor || 'text-amber-400 bg-amber-950/80 border-amber-700',
        glowColor: r.glowColor || 'shadow-amber-500/20',
        createdAt: data.rankDefinitions?.find((x) => x.id === r.id)?.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
      }));
      writeLocalData(data);
      await this.logAdminAction('BULK_RANKS_UPDATED_JSON', { count: newRanks.length });
      return { success: true };
    }
  },

  async saveBulkAchievements(newAchievements: AchievementDefinition[]): Promise<{ success: boolean; error?: string }> {
    if (!Array.isArray(newAchievements) || newAchievements.length === 0) {
      return { success: false, error: 'Achievements JSON must be a non-empty array.' };
    }

    const now = new Date();
    if (isPostgresConfigured() && db) {
      for (const a of newAchievements) {
        if (!a.id || !a.name || !a.requirementType) {
          return { success: false, error: `Invalid achievement definition: missing id, name, or requirementType.` };
        }
        await db
          .insert(schema.achievements)
          .values({
            id: a.id,
            name: a.name,
            description: a.description || '',
            icon: a.icon || '🏆',
            requirementType: a.requirementType,
            requirementValue: String(a.requirementValue),
            xpReward: a.xpReward ?? 50,
            displayOrder: a.displayOrder ?? 1,
            enabled: a.enabled ?? true,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.achievements.id,
            set: {
              name: a.name,
              description: a.description || '',
              icon: a.icon || '🏆',
              requirementType: a.requirementType,
              requirementValue: String(a.requirementValue),
              xpReward: a.xpReward ?? 50,
              displayOrder: a.displayOrder ?? 1,
              enabled: a.enabled ?? true,
              updatedAt: now,
            },
          });
      }
      await this.logAdminAction('BULK_ACHIEVEMENTS_UPDATED_JSON', { count: newAchievements.length });
      return { success: true };
    } else {
      const data = readLocalData();
      data.achievements = newAchievements.map((a, idx) => ({
        ...a,
        displayOrder: a.displayOrder ?? idx + 1,
        enabled: a.enabled ?? true,
        requirementValue: String(a.requirementValue),
        createdAt: data.achievements?.find((x) => x.id === a.id)?.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
      }));
      writeLocalData(data);
      await this.logAdminAction('BULK_ACHIEVEMENTS_UPDATED_JSON', { count: newAchievements.length });
      return { success: true };
    }
  },

  async saveBulkSettings(settingsList: Array<{ key: string; value: string; category?: string; description?: string }>): Promise<{ success: boolean; error?: string }> {
    if (!Array.isArray(settingsList)) {
      return { success: false, error: 'Settings JSON must be an array of key-value objects.' };
    }

    const now = new Date();
    if (isPostgresConfigured() && db) {
      for (const s of settingsList) {
        if (!s.key) continue;
        await db
          .insert(schema.appSettings)
          .values({
            id: s.key,
            key: s.key,
            value: String(s.value),
            valueType: 'string',
            category: s.category || 'general',
            description: s.description || null,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.appSettings.key,
            set: {
              value: String(s.value),
              category: s.category || 'general',
              description: s.description || null,
              updatedAt: now,
            },
          });
      }
      await this.logAdminAction('BULK_SETTINGS_UPDATED_JSON', { count: settingsList.length });
      return { success: true };
    } else {
      const data = readLocalData();
      for (const s of settingsList) {
        if (!s.key) continue;
        const idx = data.appSettings.findIndex((item) => item.key === s.key);
        if (idx >= 0) {
          data.appSettings[idx].value = String(s.value);
          if (s.category) data.appSettings[idx].category = s.category;
          if (s.description) data.appSettings[idx].description = s.description;
          data.appSettings[idx].updatedAt = now.toISOString();
        } else {
          data.appSettings.push({
            id: s.key,
            key: s.key,
            value: String(s.value),
            valueType: 'string',
            category: s.category || 'general',
            description: s.description || null,
            updatedAt: now.toISOString(),
          });
        }
      }
      writeLocalData(data);
      await this.logAdminAction('BULK_SETTINGS_UPDATED_JSON', { count: settingsList.length });
      return { success: true };
    }
  },

  async getAllAchievements() {
    return this.getAchievementDefinitions();
  },

  async getFullSystemConfig() {
    const [ranks, achievements, settingsList] = await Promise.all([
      this.getAllRankDefinitions(),
      this.getAchievementDefinitions(),
      this.getAppSettings(),
    ]);
    return { ranks, achievements, settings: settingsList };
  },

  async saveFullSystemConfig(config: {
    ranks?: RankDefinition[];
    achievements?: AchievementDefinition[];
    settings?: Array<{ key: string; value: string; category?: string; description?: string }>;
  }): Promise<{ success: boolean; error?: string }> {
    if (config.ranks && Array.isArray(config.ranks)) {
      const rRes = await this.saveBulkRanks(config.ranks);
      if (!rRes.success) return rRes;
    }
    if (config.achievements && Array.isArray(config.achievements)) {
      const aRes = await this.saveBulkAchievements(config.achievements);
      if (!aRes.success) return aRes;
    }
    if (config.settings && Array.isArray(config.settings)) {
      const sRes = await this.saveBulkSettings(config.settings);
      if (!sRes.success) return sRes;
    }
    await this.logAdminAction('FULL_SYSTEM_CONFIG_UPDATED_JSON');
    return { success: true };
  },
};
