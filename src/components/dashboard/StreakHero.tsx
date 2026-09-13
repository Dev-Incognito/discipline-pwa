'use client';

import Image from 'next/image';
import { Flame, Shield, Award } from 'lucide-react';
import { RankProgress } from '@/lib/gamification/ranks';

interface StreakHeroProps {
  currentStreak: number;
  longestStreak: number;
  totalSuccessfulDays: number;
  rankInfo: RankProgress;
  streakResetMessage?: string;
}

export function StreakHero({
  currentStreak,
  longestStreak,
  totalSuccessfulDays,
  rankInfo,
  streakResetMessage,
}: StreakHeroProps) {
  const { currentRank, nextRank, currentXp, xpNeededForNext, progressPercent } = rankInfo;

  return (
    <div className="flex flex-col rounded-3xl bg-gradient-to-b from-[#101626] to-[#0b0f19] border border-gray-800/80 p-5 shadow-xl">
      {/* Streak Hero Counter */}
      <div className="flex flex-col items-center justify-center text-center pb-3">
        <div className="flex items-center justify-center space-x-2">
          <Flame className="h-9 w-9 text-amber-500 animate-flame drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
          <span className="text-4xl font-black tracking-tight text-gray-100 font-mono">
            {currentStreak}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400/90 ml-1">
            {currentStreak === 1 ? 'DAY STREAK' : 'DAYS STREAK'}
          </span>
        </div>

        {/* Supportive sub-heading when streak resets */}
        {currentStreak === 1 && longestStreak > 1 && (
          <p className="mt-1.5 text-xs text-amber-300/80 font-medium italic">
            {streakResetMessage || "Streak ended. Progress didn't."}
          </p>
        )}

        {/* Milestone counters */}
        <div className="mt-3 flex items-center space-x-4 text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <Award className="h-3.5 w-3.5 text-gray-400" />
            <span>Best: <strong className="text-gray-200">{longestStreak}d</strong></span>
          </div>
          <span className="text-gray-700">•</span>
          <div className="flex items-center space-x-1">
            <Shield className="h-3.5 w-3.5 text-gray-400" />
            <span>Total: <strong className="text-gray-200">{totalSuccessfulDays}d</strong></span>
          </div>
        </div>
      </div>

      {/* Rank & XP Progress Section */}
      <div className="mt-4 rounded-2xl bg-gray-950/60 border border-gray-800/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 overflow-hidden shadow-sm">
              {currentRank.logoUrl ? (
                <div className="relative h-6 w-6">
                  <Image
                    src={currentRank.logoUrl}
                    alt={currentRank.name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <span className="text-lg">{currentRank.icon || '⚔️'}</span>
              )}
            </div>
            <div>
              <span className="text-sm font-extrabold uppercase tracking-wide text-gray-100">
                {currentRank.name}
              </span>
              <p className="text-[11px] text-gray-400 leading-tight">
                {currentRank.description}
              </p>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-sm font-bold text-amber-400">
              {currentXp.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-400 ml-1">XP</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-900 border border-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>{progressPercent}%</span>
            <span>
              {nextRank
                ? `${xpNeededForNext.toLocaleString()} XP TO ${nextRank.name.toUpperCase()}`
                : 'MAX RANK ACHIEVED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
