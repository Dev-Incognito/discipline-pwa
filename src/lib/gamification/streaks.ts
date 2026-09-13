export interface StreakEvaluation {
  isDuplicateCheckin: boolean;
  newStreak: number;
  newLongestStreak: number;
  newTotalDays: number;
  streakReset: boolean;
  supportiveMessage: string;
}

/**
 * Returns difference in calendar days between date strings YYYY-MM-DD
 */
export function getCalendarDayDiff(dateStrA: string, dateStrB: string): number {
  const [yA, mA, dA] = dateStrA.split('-').map(Number);
  const [yB, mB, dB] = dateStrB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

/**
 * Evaluates streak progression given last check-in date and current check-in date
 */
export function evaluateStreak(
  currentStreak: number,
  longestStreak: number,
  totalSuccessfulDays: number,
  lastCheckinDate: string | null | undefined,
  todayDate: string
): StreakEvaluation {
  // If already checked in today
  if (lastCheckinDate === todayDate) {
    return {
      isDuplicateCheckin: true,
      newStreak: currentStreak,
      newLongestStreak: longestStreak,
      newTotalDays: totalSuccessfulDays,
      streakReset: false,
      supportiveMessage: 'Already checked in for today. Great consistency!',
    };
  }

  // If this is the user's very first check-in
  if (!lastCheckinDate) {
    const newStreak = 1;
    return {
      isDuplicateCheckin: false,
      newStreak,
      newLongestStreak: Math.max(longestStreak, newStreak),
      newTotalDays: totalSuccessfulDays + 1,
      streakReset: false,
      supportiveMessage: 'First step taken. The journey begins!',
    };
  }

  const diffDays = getCalendarDayDiff(lastCheckinDate, todayDate);

  if (diffDays === 1) {
    // Consecutive day! Streak increases by 1
    const newStreak = currentStreak + 1;
    return {
      isDuplicateCheckin: false,
      newStreak,
      newLongestStreak: Math.max(longestStreak, newStreak),
      newTotalDays: totalSuccessfulDays + 1,
      streakReset: false,
      supportiveMessage: 'Keep the fire burning! Consistency is power.',
    };
  } else if (diffDays <= 0) {
    // Future date or strange order, treat as duplicate or safe fallback
    return {
      isDuplicateCheckin: true,
      newStreak: currentStreak,
      newLongestStreak: longestStreak,
      newTotalDays: totalSuccessfulDays,
      streakReset: false,
      supportiveMessage: 'Check-in recorded.',
    };
  } else {
    // Missed at least 1 day.
    // Core philosophy: "Streak ended. Progress didn't."
    const newStreak = 1;
    return {
      isDuplicateCheckin: false,
      newStreak,
      newLongestStreak: longestStreak, // Never lose historical longest streak!
      newTotalDays: totalSuccessfulDays + 1, // Total progress keeps accumulating!
      streakReset: true,
      supportiveMessage: 'Streak ended. Progress didn’t. You showed up today — that is what counts.',
    };
  }
}
