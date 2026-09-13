import { db, isPostgresConfigured, schema } from '@/db';
import { readLocalData, writeLocalData, DEFAULT_RANKS, DEFAULT_APP_SETTINGS } from '@/db/local-store';
import { eq, and, desc, asc, count } from 'drizzle-orm';
import { evaluateStreak } from '@/lib/gamification/streaks';
import { calculateDailyCheckinXp, XpConfig } from '@/lib/gamification/xp';
import { getMondayOfWeek, computeWeeklyStatus } from '@/lib/gamification/weekly';
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

  async createUserWithPin(pinHash: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isPostgresConfigured() && db) {
      const inserted = await db
        .insert(schema.users)
        .values({
          id,
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
  // DAILY CHECK-IN PROCESSOR
  // ----------------------------------------------------
  async processCheckin(
    userId: string,
    todayDate: string,
    mood?: string | null,
    journalNote?: string | null
  ): Promise<CheckinResult> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Evaluate streak continuity
    const streakEval = evaluateStreak(
      user.currentStreak,
      user.longestStreak,
      user.totalSuccessfulDays,
      user.lastCheckinDate,
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
        newStreak: user.currentStreak,
        newLongestStreak: user.longestStreak,
        newTotalDays: user.totalSuccessfulDays,
        currentRank: user.currentRank,
        previousRank: user.currentRank,
        didRankUp: false,
        unlockedAchievements: [],
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

    // Record checkin and calculate weekly progress
    let completedDaysInWeek = 1;
    let bonusAlreadyAwarded = false;

    if (isPostgresConfigured() && db) {
      // 1. Insert checkin
      await db
        .insert(schema.dailyCheckins)
        .values({
          userId,
          date: todayDate,
          completed: true,
          mood: mood || null,
          journalNote: journalNote ? journalNote.slice(0, 280) : null,
        })
        .onConflictDoUpdate({
          target: [schema.dailyCheckins.userId, schema.dailyCheckins.date],
          set: {
            completed: true,
            mood: mood || null,
            journalNote: journalNote ? journalNote.slice(0, 280) : null,
            updatedAt: new Date(),
          },
        });

      // 2. Fetch existing weekly progress
      const existingWeekly = await db
        .select()
        .from(schema.weeklyProgress)
        .where(
          and(
            eq(schema.weeklyProgress.userId, userId),
            eq(schema.weeklyProgress.weekStart, weekStart)
          )
        )
        .limit(1);

      if (existingWeekly[0]) {
        completedDaysInWeek = existingWeekly[0].completedDays + 1;
        bonusAlreadyAwarded = existingWeekly[0].bonusAwarded;
      }

      const goalMet = completedDaysInWeek >= user.weeklyGoal;
      const shouldAwardWeeklyBonus = goalMet && !bonusAlreadyAwarded;
      if (shouldAwardWeeklyBonus) {
        weeklyBonusEarned = xpConfig.weeklyGoalXp;
        totalXpEarned += weeklyBonusEarned;
      }

      // Upsert weekly progress
      await db
        .insert(schema.weeklyProgress)
        .values({
          userId,
          weekStart,
          completedDays: completedDaysInWeek,
          weeklyGoal: user.weeklyGoal,
          weekCompleted: goalMet,
          bonusAwarded: bonusAlreadyAwarded || shouldAwardWeeklyBonus,
        })
        .onConflictDoUpdate({
          target: [schema.weeklyProgress.userId, schema.weeklyProgress.weekStart],
          set: {
            completedDays: completedDaysInWeek,
            weekCompleted: goalMet,
            bonusAwarded: bonusAlreadyAwarded || shouldAwardWeeklyBonus,
            updatedAt: new Date(),
          },
        });
    } else {
      // Local store path
      const data = readLocalData();
      const existingIdx = data.dailyCheckins.findIndex(
        (c) => c.userId === userId && c.date === todayDate
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
          date: todayDate,
          completed: true,
          mood: mood || null,
          journalNote: journalNote ? journalNote.slice(0, 280) : null,
          createdAt: now,
          updatedAt: now,
        });
      }

      let weekly = data.weeklyProgress.find(
        (w) => w.userId === userId && w.weekStart === weekStart
      );

      if (weekly) {
        weekly.completedDays += 1;
        completedDaysInWeek = weekly.completedDays;
        bonusAlreadyAwarded = weekly.bonusAwarded;
      } else {
        weekly = {
          id: crypto.randomUUID(),
          userId,
          weekStart,
          completedDays: 1,
          weeklyGoal: user.weeklyGoal,
          weekCompleted: false,
          bonusAwarded: false,
          createdAt: now,
          updatedAt: now,
        };
        data.weeklyProgress.push(weekly);
      }

      const goalMet = completedDaysInWeek >= user.weeklyGoal;
      const shouldAwardWeeklyBonus = goalMet && !bonusAlreadyAwarded;
      if (shouldAwardWeeklyBonus) {
        weeklyBonusEarned = xpConfig.weeklyGoalXp;
        totalXpEarned += weeklyBonusEarned;
        weekly.bonusAwarded = true;
      }
      weekly.weekCompleted = goalMet;
      weekly.updatedAt = now;

      writeLocalData(data);
    }

    // Dynamic Ranks Evaluation
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

      // Fetch completed weekly goals count
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
        longestStreak: streakEval.newLongestStreak,
        totalDays: streakEval.newTotalDays,
        completedWeeklyGoals: completedWeeklyGoalsCount,
        totalXp: tentativeXp,
        currentRank: newRank,
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
        await db.insert(schema.userAchievements).values({
          userId,
          achievementId: ach.id,
        });
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
          longestStreak: streakEval.newLongestStreak,
          totalSuccessfulDays: streakEval.newTotalDays,
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
        u.longestStreak = streakEval.newLongestStreak;
        u.totalSuccessfulDays = streakEval.newTotalDays;
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
    };
  },

  // ----------------------------------------------------
  // DASHBOARD DATA AGGREGATOR
  // ----------------------------------------------------
  async getDashboardData(userId: string, todayDate: string) {
    const user = await this.getUserById(userId);
    if (!user) return null;

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
      // Check today's checkin
      const todayCheckin = await db
        .select()
        .from(schema.dailyCheckins)
        .where(
          and(
            eq(schema.dailyCheckins.userId, userId),
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
            eq(schema.weeklyProgress.weekStart, weekStart)
          )
        )
        .limit(1);
      if (weekly[0]) {
        bonusAwarded = weekly[0].bonusAwarded;
      }

      // Fetch all checkins for the week
      const allCheckins = await db
        .select()
        .from(schema.dailyCheckins)
        .where(eq(schema.dailyCheckins.userId, userId));
      weekCheckins = allCheckins;
    } else {
      const data = readLocalData();
      const todayCheckin = data.dailyCheckins.find(
        (c) => c.userId === userId && c.date === todayDate
      );
      if (todayCheckin && todayCheckin.completed) {
        isTodayCheckedIn = true;
        todayMood = todayCheckin.mood;
        todayJournal = todayCheckin.journalNote;
      }

      const weekly = data.weeklyProgress.find(
        (w) => w.userId === userId && w.weekStart === weekStart
      );
      if (weekly) {
        bonusAwarded = weekly.bonusAwarded;
      }

      weekCheckins = data.dailyCheckins.filter((c) => c.userId === userId);
    }

    const completedDatesSet = new Set(
      weekCheckins.filter((c) => c.completed).map((c) => c.date)
    );

    const weeklyGoalBonusXp = Number(settingsMap.weekly_goal_xp ?? 100);
    const weeklyStatus = computeWeeklyStatus(
      weekStart,
      todayDate,
      completedDatesSet,
      user.weeklyGoal,
      bonusAwarded,
      weeklyGoalBonusXp
    );

    return {
      user: {
        id: user.id,
        currentXp: user.currentXp,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalSuccessfulDays: user.totalSuccessfulDays,
        currentRank: rankInfo.currentRank.name,
        weeklyGoal: user.weeklyGoal,
      },
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
  async getHistoryData(userId: string) {
    if (isPostgresConfigured() && db) {
      const checkins = await db
        .select()
        .from(schema.dailyCheckins)
        .where(eq(schema.dailyCheckins.userId, userId))
        .orderBy(desc(schema.dailyCheckins.date));
      return checkins;
    } else {
      const data = readLocalData();
      return data.dailyCheckins
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
  },

  // ----------------------------------------------------
  // STATS DATA
  // ----------------------------------------------------
  async getStatsData(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const rankDefs = await this.getRankDefinitions();
    const rankInfo = getRankFromXp(user.currentXp, rankDefs);

    let checkins: Array<{ date: string; completed: boolean; mood: string | null }> = [];
    let completedWeeksCount = 0;

    if (isPostgresConfigured() && db) {
      checkins = await db
        .select()
        .from(schema.dailyCheckins)
        .where(eq(schema.dailyCheckins.userId, userId));

      const weeks = await db
        .select({ count: count() })
        .from(schema.weeklyProgress)
        .where(
          and(
            eq(schema.weeklyProgress.userId, userId),
            eq(schema.weeklyProgress.weekCompleted, true)
          )
        );
      completedWeeksCount = Number(weeks[0]?.count || 0);
    } else {
      const data = readLocalData();
      checkins = data.dailyCheckins.filter((c) => c.userId === userId);
      completedWeeksCount = data.weeklyProgress.filter(
        (w) => w.userId === userId && w.weekCompleted
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
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      totalSuccessfulDays: user.totalSuccessfulDays,
      totalWeeksCompleted: completedWeeksCount,
      currentXp: user.currentXp,
      currentRank: rankInfo.currentRank.name,
      rankInfo,
      totalCheckinsRecorded: totalCheckins,
      moodCounts,
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
};
