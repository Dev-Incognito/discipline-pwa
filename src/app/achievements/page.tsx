'use client';

import { useState, useEffect } from 'react';
import { getAchievementsAction } from '@/actions/checkinActions';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Trophy,
  Shield,
  Flame,
  Zap,
  Sword,
  Target,
  Award,
  Crown,
  Sparkles,
  Footprints,
  Lock,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirementType: string;
  requirementValue: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

const ICON_MAP: Record<string, typeof Trophy> = {
  Footprints,
  Shield,
  Flame,
  Zap,
  Sword,
  Target,
  Award,
  Crown,
  Sparkles,
  Trophy,
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await getAchievementsAction();
      if (res.success && res.data) {
        setAchievements(res.data as AchievementItem[]);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const filtered = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b11] text-amber-500">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#080b11] text-gray-100 pb-safe-nav">
      <Header currentRank="Badges" />

      <main className="flex-1 space-y-4 px-4 py-4">
        {/* Achievements Progress Summary Header */}
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-b from-[#121929] to-[#0c111c] border border-amber-500/30 p-5 shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Trophy className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                TROPHY ROOM
              </span>
              <h1 className="text-xl font-black text-gray-100 uppercase tracking-wide">
                Achievements
              </h1>
              <p className="text-xs text-gray-400">
                {unlockedCount} of {achievements.length} Unlocked
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-lg font-black text-amber-400">
              {Math.round((unlockedCount / (achievements.length || 1)) * 100)}%
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex rounded-xl bg-[#0f1422] p-1 border border-gray-800">
          {(['all', 'unlocked', 'locked'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                filter === tab
                  ? 'bg-amber-500 text-gray-950 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Achievement Cards Grid */}
        <div className="space-y-3">
          {filtered.map((ach) => {
            const IconComponent = ICON_MAP[ach.icon] || Trophy;

            return (
              <div
                key={ach.id}
                className={`relative flex items-center justify-between rounded-2xl border p-4 transition-all ${
                  ach.unlocked
                    ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-[#0f1422] to-[#0f1422] shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'border-gray-800/80 bg-gray-950/40 opacity-70'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                      ach.unlocked
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'border-gray-800 bg-gray-900/60 text-gray-600'
                    }`}
                  >
                    {ach.unlocked ? (
                      <IconComponent className="h-6 w-6" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3
                        className={`text-sm font-black uppercase tracking-wider ${
                          ach.unlocked ? 'text-gray-100' : 'text-gray-400'
                        }`}
                      >
                        {ach.name}
                      </h3>
                      {ach.unlocked && (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{ach.description}</p>
                    {ach.unlocked && ach.unlockedAt && (
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span
                    className={`text-xs font-bold ${
                      ach.unlocked ? 'text-amber-400' : 'text-gray-600'
                    }`}
                  >
                    +{ach.xpReward} XP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
