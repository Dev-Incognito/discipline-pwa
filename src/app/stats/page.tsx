'use client';

import { useState, useEffect } from 'react';
import { getStatsAction } from '@/actions/checkinActions';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Flame, Trophy, Award, Sparkles, TrendingUp, Smile, Calendar, Loader2 } from 'lucide-react';

interface StatsData {
  currentStreak: number;
  longestStreak: number;
  totalSuccessfulDays: number;
  totalWeeksCompleted: number;
  currentXp: number;
  currentRank: string;
  rankInfo: {
    currentRank: {
      name: string;
      description: string;
    };
    progressPercent: number;
  };
  totalCheckinsRecorded: number;
  moodCounts: {
    difficult: number;
    normal: number;
    easy: number;
  };
}

function StatsProfileCard({ stats }: { stats: StatsData }) {
  return (
    <div className="rounded-3xl bg-gradient-to-b from-[#121829] to-[#0d121f] border border-amber-500/30 p-5 shadow-xl">
      <div className="flex items-center space-x-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <Trophy className="h-8 w-8 text-amber-400" />
        </div>
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
            PLAYER PROFILE
          </span>
          <h1 className="text-xl font-black text-gray-100 uppercase tracking-wide">
            {stats.currentRank}
          </h1>
          <p className="text-xs text-gray-400">{stats.rankInfo.currentRank.description}</p>
        </div>
      </div>

      {/* Primary XP metric */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-950/60 border border-gray-800/80 px-4 py-3 font-mono">
        <span className="text-xs text-gray-400 uppercase">Lifetime Experience</span>
        <span className="text-base font-bold text-amber-400">
          {stats.currentXp.toLocaleString()} XP
        </span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await getStatsAction();
      if (res.success && res.data) {
        setStats(res.data as StatsData);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const totalMoodCount =
    (stats?.moodCounts.difficult || 0) +
    (stats?.moodCounts.normal || 0) +
    (stats?.moodCounts.easy || 0);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b11] text-amber-500">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#080b11] text-gray-100 pb-safe-nav">
      <Header currentRank={stats?.currentRank || 'Stats'} />

      <main className="flex-1 space-y-4 px-4 py-4">
        {stats && (
          <>
            {/* Player RPG Card */}
            <StatsProfileCard stats={stats} />

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#0f1422] border border-gray-800/80 p-4 shadow-sm">
                <div className="flex items-center space-x-2 text-amber-400 mb-1">
                  <Flame className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Current</span>
                </div>
                <div className="text-2xl font-black font-mono text-gray-100">
                  {stats.currentStreak}
                  <span className="text-xs font-normal text-gray-400 ml-1">days</span>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Continuous streak</p>
              </div>

              <div className="rounded-2xl bg-[#0f1422] border border-gray-800/80 p-4 shadow-sm">
                <div className="flex items-center space-x-2 text-orange-400 mb-1">
                  <Award className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Best Streak</span>
                </div>
                <div className="text-2xl font-black font-mono text-gray-100">
                  {stats.longestStreak}
                  <span className="text-xs font-normal text-gray-400 ml-1">days</span>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">All-time record</p>
              </div>

              <div className="rounded-2xl bg-[#0f1422] border border-gray-800/80 p-4 shadow-sm">
                <div className="flex items-center space-x-2 text-emerald-400 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Days</span>
                </div>
                <div className="text-2xl font-black font-mono text-gray-100">
                  {stats.totalSuccessfulDays}
                  <span className="text-xs font-normal text-gray-400 ml-1">days</span>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Total verified check-ins</p>
              </div>

              <div className="rounded-2xl bg-[#0f1422] border border-gray-800/80 p-4 shadow-sm">
                <div className="flex items-center space-x-2 text-purple-400 mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Weeks Met</span>
                </div>
                <div className="text-2xl font-black font-mono text-gray-100">
                  {stats.totalWeeksCompleted}
                  <span className="text-xs font-normal text-gray-400 ml-1">weeks</span>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Goals achieved</p>
              </div>
            </div>

            {/* Consistency & Discipline Philosophy Card */}
            <div className="rounded-2xl bg-[#0f1422] border border-gray-800/80 p-4">
              <div className="flex items-center space-x-2 text-amber-400 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Discipline Law</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed italic">
                &ldquo;You don&apos;t rise to the level of your goals; you fall to the level of your
                systems. Consistency over months beats intensity over days.&rdquo;
              </p>
            </div>

            {/* Mood Distribution */}
            {totalMoodCount > 0 && (
              <div className="rounded-3xl bg-[#0f1422] border border-gray-800/80 p-5 shadow-lg">
                <div className="flex items-center space-x-2 text-gray-300 mb-3">
                  <Smile className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Reflection Breakdown
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">😎 Easy Days</span>
                      <span className="font-mono text-gray-200">
                        {stats.moodCounts.easy} (
                        {Math.round((stats.moodCounts.easy / totalMoodCount) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-900 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${(stats.moodCounts.easy / totalMoodCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">😐 Normal Days</span>
                      <span className="font-mono text-gray-200">
                        {stats.moodCounts.normal} (
                        {Math.round((stats.moodCounts.normal / totalMoodCount) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-900 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${(stats.moodCounts.normal / totalMoodCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">😫 Difficult Days</span>
                      <span className="font-mono text-gray-200">
                        {stats.moodCounts.difficult} (
                        {Math.round((stats.moodCounts.difficult / totalMoodCount) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-900 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{
                          width: `${(stats.moodCounts.difficult / totalMoodCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
