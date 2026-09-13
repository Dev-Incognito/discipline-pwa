'use client';

import { useState, useEffect, useCallback } from 'react';
import { getHistoryAction } from '@/actions/checkinActions';
import { getUserGoalsAction } from '@/actions/goalActions';
import { Goal } from '@/db/schema';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChevronLeft, ChevronRight, CheckCircle2, Lock, MessageSquare, Loader2 } from 'lucide-react';
import { sound } from '@/lib/sound/sound';

interface CheckinRecord {
  id: string;
  date: string;
  goalId?: string | null;
  completed: boolean;
  mood: string | null;
  journalNote: string | null;
  createdAt: Date | string;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState<CheckinRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (goalId: string) => {
    setIsLoading(true);
    const [histRes, goalsRes] = await Promise.all([
      getHistoryAction(goalId === 'all' ? undefined : goalId),
      getUserGoalsAction(),
    ]);
    if (histRes.success && histRes.data) {
      setRecords(histRes.data as CheckinRecord[]);
    }
    if (goalsRes.success && goalsRes.data) {
      setGoals(goalsRes.data as Goal[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData(selectedGoalId);
  }, [selectedGoalId, loadData]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to change month
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const mondayOffset = (firstDayIndex + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map of completed dates: 'YYYY-MM-DD' -> record
  const checkinMap = new Map<string, CheckinRecord>();
  records.forEach((r) => {
    checkinMap.set(r.date, r);
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Count completions in this month
  const thisMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const completionsThisMonth = records.filter(
    (r) => r.completed && r.date.startsWith(thisMonthPrefix)
  ).length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b11] text-amber-500">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#080b11] text-gray-100 pb-safe-nav">
      <Header currentRank="History" />

      <main className="flex-1 space-y-4 px-4 py-4">
        {/* Habit Track Filter */}
        {goals.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
            <button
              onClick={() => {
                sound.playClick();
                setSelectedGoalId('all');
              }}
              className={`flex shrink-0 items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all active:scale-95 border ${
                selectedGoalId === 'all'
                  ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
              }`}
            >
              <span>⚡ All Habits</span>
            </button>
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedGoalId(g.id);
                }}
                className={`flex shrink-0 items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 border ${
                  selectedGoalId === g.id
                    ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
                }`}
              >
                <span>{g.icon}</span>
                <span className="truncate max-w-[120px]">{g.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Month Selector Card */}
        <div className="flex items-center justify-between rounded-2xl bg-[#0f1422] border border-gray-800/80 p-4">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous Month"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-300 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h2 className="text-base font-black tracking-wider text-gray-100 uppercase">
              {monthNames[month]} {year}
            </h2>
            <p className="text-[11px] text-amber-400 font-mono font-medium">
              {completionsThisMonth} / {daysInMonth} Days Completed
            </p>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next Month"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-300 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar Grid Card */}
        <div className="rounded-3xl bg-[#0f1422] border border-gray-800/80 p-5 shadow-lg">
          {/* Day Headers (Mon - Sun) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} className="text-[11px] font-bold text-gray-500 font-mono">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty offset spaces */}
            {Array.from({ length: mondayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 w-full" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const record = checkinMap.get(dateStr);
              const isCompleted = record?.completed;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isFuture}
                  onClick={() => {
                    if (record) setSelectedRecord(record);
                  }}
                  className={`relative flex h-10 w-full items-center justify-center rounded-xl border text-xs font-mono font-bold transition-all ${
                    isCompleted
                      ? 'border-emerald-500/60 bg-emerald-950/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)] active:scale-95'
                      : isToday
                      ? 'border-amber-400/80 bg-amber-950/30 text-amber-300 ring-2 ring-amber-400/20'
                      : isFuture
                      ? 'border-gray-900 bg-gray-950/30 text-gray-700 cursor-default'
                      : 'border-gray-800/80 bg-gray-900/40 text-gray-500 hover:border-gray-700'
                  }`}
                >
                  <span>{dayNum}</span>
                  {/* Subtle dot if note exists */}
                  {record?.journalNote && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex items-center justify-around border-t border-gray-800/80 pt-3 text-[11px] text-gray-400">
            <div className="flex items-center space-x-1.5">
              <span className="h-3 w-3 rounded-md border border-emerald-500/60 bg-emerald-950/80" />
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-3 w-3 rounded-md border border-amber-400 bg-amber-950/30" />
              <span>Today</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-3 w-3 rounded-md border border-gray-800 bg-gray-900/40" />
              <span>Missed</span>
            </div>
          </div>
        </div>

        {/* Selected Record Detail Drawer / Card */}
        {selectedRecord && (
          <div className="rounded-2xl bg-gray-950/90 border border-amber-500/40 p-4 shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-gray-200 uppercase font-mono">
                  {selectedRecord.date} Check-in
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Recorded Mood:</span>
                <span className="font-semibold text-gray-200 capitalize">
                  {selectedRecord.mood === 'difficult'
                    ? '😫 Difficult'
                    : selectedRecord.mood === 'normal'
                    ? '😐 Normal'
                    : selectedRecord.mood === 'easy'
                    ? '😎 Easy'
                    : 'None recorded'}
                </span>
              </div>

              {selectedRecord.journalNote && (
                <div className="mt-2 rounded-xl bg-[#0f1422] border border-gray-800 p-3">
                  <div className="flex items-center space-x-1.5 text-[11px] text-amber-400/90 mb-1">
                    <MessageSquare className="h-3 w-3" />
                    <span className="font-bold uppercase tracking-wider">Private Note</span>
                  </div>
                  <p className="text-xs text-gray-300 italic">
                    &ldquo;{selectedRecord.journalNote}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security / Non-editable historical disclaimer */}
        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-gray-400 text-center px-4 py-2">
          <Lock className="h-3 w-3" />
          <span>Historical check-ins are verified and immutable for progress integrity.</span>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
