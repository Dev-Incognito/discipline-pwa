import { XP_VALUES } from './xp';

/**
 * Returns the Monday date (YYYY-MM-DD) for a given date string or Date object
 */
export function getMondayOfWeek(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T12:00:00Z`) : new Date(dateInput);
  const day = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // In Monday-first system: Monday offset = 0, Tuesday offset = 1, ..., Sunday offset = 6
  const diff = date.getUTCDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Returns the 7 days (YYYY-MM-DD) of the week starting from Monday
 */
export function getWeekDates(mondayStr: string): string[] {
  const dates: string[] = [];
  const base = new Date(`${mondayStr}T12:00:00Z`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export interface WeeklyStatus {
  weekStart: string;
  days: {
    date: string;
    dayName: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    dayLetter: string; // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
    completed: boolean;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
  }[];
  completedCount: number;
  weeklyGoal: number;
  goalMet: boolean;
  bonusAwarded: boolean;
  bonusXp: number;
}

const DAY_LABELS = [
  { name: 'Mon', letter: 'M' },
  { name: 'Tue', letter: 'T' },
  { name: 'Wed', letter: 'W' },
  { name: 'Thu', letter: 'T' },
  { name: 'Fri', letter: 'F' },
  { name: 'Sat', letter: 'S' },
  { name: 'Sun', letter: 'S' },
];

/**
 * Computes weekly status given checked-in dates for this week
 */
export function computeWeeklyStatus(
  weekStart: string,
  todayStr: string,
  completedDatesSet: Set<string>,
  weeklyGoal: number = 6,
  bonusAlreadyAwarded: boolean = false,
  weeklyBonusXp: number = XP_VALUES.WEEKLY_GOAL_MET
): WeeklyStatus {
  const dates = getWeekDates(weekStart);
  let completedCount = 0;

  const days = dates.map((d, index) => {
    const completed = completedDatesSet.has(d);
    if (completed) completedCount++;
    const isToday = d === todayStr;
    const isPast = d < todayStr;
    const isFuture = d > todayStr;

    return {
      date: d,
      dayName: DAY_LABELS[index].name,
      dayLetter: DAY_LABELS[index].letter,
      completed,
      isToday,
      isPast,
      isFuture,
    };
  });

  const goalMet = completedCount >= weeklyGoal;
  const shouldAwardBonus = goalMet && !bonusAlreadyAwarded;

  return {
    weekStart,
    days,
    completedCount,
    weeklyGoal,
    goalMet,
    bonusAwarded: bonusAlreadyAwarded || shouldAwardBonus,
    bonusXp: shouldAwardBonus ? weeklyBonusXp : 0,
  };
}
