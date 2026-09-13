import { evaluateStreak, getCalendarDayDiff } from '../src/lib/gamification/streaks';
import { getRankFromXp, RANKS } from '../src/lib/gamification/ranks';
import { calculateDailyCheckinXp, XP_VALUES } from '../src/lib/gamification/xp';
import { getMondayOfWeek, computeWeeklyStatus } from '../src/lib/gamification/weekly';
import { checkNewAchievements } from '../src/lib/gamification/achievements';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log('\n--- 1. TESTING STREAK CONTINUITY & SETBACK PHILOSOPHY ---');
// First checkin
const d1 = evaluateStreak(0, 0, 0, null, '2026-09-01');
assert(d1.newStreak === 1 && d1.newLongestStreak === 1 && d1.newTotalDays === 1, 'First day checkin sets streak to 1');

// Consecutive checkin
const d2 = evaluateStreak(d1.newStreak, d1.newLongestStreak, d1.newTotalDays, '2026-09-01', '2026-09-02');
assert(d2.newStreak === 2 && d2.newLongestStreak === 2 && d2.newTotalDays === 2, 'Consecutive day increments streak to 2');

// Duplicate checkin same day
const d2Dup = evaluateStreak(d2.newStreak, d2.newLongestStreak, d2.newTotalDays, '2026-09-02', '2026-09-02');
assert(d2Dup.isDuplicateCheckin === true, 'Duplicate checkin detected');

// Missed day setback (e.g. missed 2026-09-03, checked in on 2026-09-04)
const d4 = evaluateStreak(d2.newStreak, d2.newLongestStreak, d2.newTotalDays, '2026-09-02', '2026-09-04');
assert(d4.newStreak === 1, 'Streak resets to 1 after gap');
assert(d4.newLongestStreak === 2, 'Longest streak remains preserved');
assert(d4.newTotalDays === 3, 'Total successful days still incremented');
assert(d4.streakReset === true, 'Streak reset flag set');
assert(d4.supportiveMessage.includes("Streak ended. Progress didn’t"), 'Supportive non-shaming copy returned');

console.log('\n--- 2. TESTING XP CALCULATION & MILESTONES ---');
const xpNormal = calculateDailyCheckinXp(3);
assert(xpNormal.totalXpEarned === 10, 'Normal daily checkin earns +10 XP');

const xp7 = calculateDailyCheckinXp(7);
assert(xp7.totalXpEarned === 60, 'Day 7 milestone earns 10 + 50 = 60 XP');

const xp30 = calculateDailyCheckinXp(30);
assert(xp30.totalXpEarned === 160, 'Day 30 milestone earns 10 + 150 = 160 XP');

const xp100 = calculateDailyCheckinXp(100);
assert(xp100.totalXpEarned === 510, 'Day 100 milestone earns 10 + 500 = 510 XP');

console.log('\n--- 3. TESTING XP-DERIVED RANK LADDER ---');
const rank0 = getRankFromXp(0);
assert(rank0.currentRank.name === 'Beginner' && rank0.nextRank?.name === 'Warrior', '0 XP is Beginner, next is Warrior');

const rank100 = getRankFromXp(100);
assert(rank100.currentRank.name === 'Warrior', '100 XP reaches Warrior');

const rank800 = getRankFromXp(850);
assert(rank800.currentRank.name === 'Giga Chad', '850 XP is Giga Chad');
assert(rank800.xpNeededForNext === 650, 'Giga Chad needs 650 XP to reach Hercules (1500)');

const rankMax = getRankFromXp(10000);
assert(rankMax.currentRank.name === 'Legend' && rankMax.nextRank === null, '6000+ XP is Legend (top rank)');

console.log('\n--- 4. TESTING WEEKLY GOAL SYSTEM ---');
const monday = getMondayOfWeek('2026-09-02'); // Wednesday
assert(monday === '2026-08-31', 'Monday of 2026-09-02 is 2026-08-31');

const completedDates = new Set(['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
const weekStatus = computeWeeklyStatus('2026-08-31', '2026-09-05', completedDates, 6, false);
assert(weekStatus.completedCount === 6, '6 days completed in week');
assert(weekStatus.goalMet === true, 'Weekly goal is met');
assert(weekStatus.bonusXp === 100, '+100 XP awarded for completing weekly goal');

console.log('\n--- 5. TESTING ACHIEVEMENTS EVALUATION ---');
const newUnlocks = checkNewAchievements(
  {
    streak: 7,
    totalDays: 7,
    completedWeeklyGoals: 1,
    currentRank: 'Warrior',
  },
  new Set()
);
const unlockIds = newUnlocks.map((u) => u.id);
assert(unlockIds.includes('first-step'), 'Unlocked first-step achievement');
assert(unlockIds.includes('7-day-warrior'), 'Unlocked 7-day-warrior achievement');
assert(!unlockIds.includes('30-day-strong'), '30-day-strong remains locked');

console.log('\n🎉 ALL GAMIFICATION TESTS PASSED SUCCESSFULLY!\n');
