'use client';

import { Check, Trophy, CalendarCheck2 } from 'lucide-react';
import { WeeklyStatus } from '@/lib/gamification/weekly';

interface WeeklyProgressCardProps {
  weeklyStatus: WeeklyStatus;
}

export function WeeklyProgressCard({ weeklyStatus }: WeeklyProgressCardProps) {
  const { days, completedCount, weeklyGoal, goalMet } = weeklyStatus;

  return (
    <div className="flex flex-col rounded-3xl bg-[#0f1422] border border-gray-800/80 p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarCheck2 className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
            THIS WEEK
          </span>
        </div>

        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <span className="font-extrabold text-amber-400">{completedCount}</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400">{weeklyGoal} DAYS</span>
        </div>
      </div>

      {/* 7 Days Row: Mon -> Sun */}
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {days.map((day) => {
          return (
            <div key={day.date} className="flex flex-col items-center">
              <span
                className={`text-[11px] font-bold ${
                  day.isToday ? 'text-amber-400' : 'text-gray-400'
                }`}
              >
                {day.dayName}
              </span>

              {/* Day Circle / Pill */}
              <div
                className={`mt-1.5 flex h-10 w-full max-w-[42px] items-center justify-center rounded-xl border transition-all ${
                  day.completed
                    ? 'border-emerald-500/60 bg-emerald-950/80 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : day.isToday
                    ? 'border-amber-400/60 bg-amber-950/30 text-amber-400 ring-2 ring-amber-400/20'
                    : day.isPast
                    ? 'border-gray-800 bg-gray-900/50 text-gray-600'
                    : 'border-gray-800/60 bg-gray-950/40 text-gray-700'
                }`}
              >
                {day.completed ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  <span className="text-xs font-mono font-medium">
                    {day.isToday ? '•' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly Goal Banner */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-950/60 border border-gray-800/60 px-3.5 py-2.5">
        <div className="flex items-center space-x-2">
          <Trophy className={`h-4 w-4 ${goalMet ? 'text-amber-400' : 'text-gray-500'}`} />
          <span className="text-xs font-semibold text-gray-300">
            {goalMet ? 'WEEK COMPLETE' : `Goal: ${weeklyGoal} successful days`}
          </span>
        </div>
        <span
          className={`text-xs font-mono font-bold ${
            goalMet ? 'text-amber-400' : 'text-gray-500'
          }`}
        >
          {goalMet ? '+100 XP' : `${Math.max(0, weeklyGoal - completedCount)} to go`}
        </span>
      </div>

      <p className="mt-2 text-[10px] text-gray-400 text-center">
        Weekly reset happens every Sunday night. Keep your momentum going!
      </p>
    </div>
  );
}
