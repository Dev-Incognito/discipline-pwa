'use client';

import { useState, useEffect, useCallback } from 'react';
import { getXpSettingsAction, updateXpSettingsAction } from '@/actions/adminActions';
import { Zap, CheckCircle2, AlertCircle, Save, Sparkles, TrendingUp } from 'lucide-react';
import { sound } from '@/lib/sound/sound';

export default function AdminXpPage() {
  const [dailyCheckinXp, setDailyCheckinXp] = useState<number>(10);
  const [weeklyGoalXp, setWeeklyGoalXp] = useState<number>(100);
  const [streak7Xp, setStreak7Xp] = useState<number>(50);
  const [streak30Xp, setStreak30Xp] = useState<number>(150);
  const [streak100Xp, setStreak100Xp] = useState<number>(500);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getXpSettingsAction();
    if (res.success && res.data) {
      setDailyCheckinXp(res.data.dailyCheckinXp);
      setWeeklyGoalXp(res.data.weeklyGoalXp);
      setStreak7Xp(res.data.streak7Xp);
      setStreak30Xp(res.data.streak30Xp);
      setStreak100Xp(res.data.streak100Xp);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      dailyCheckinXp < 0 ||
      weeklyGoalXp < 0 ||
      streak7Xp < 0 ||
      streak30Xp < 0 ||
      streak100Xp < 0
    ) {
      setError('XP rewards cannot be negative numbers.');
      return;
    }

    sound.playClick();
    setIsSaving(true);
    const res = await updateXpSettingsAction({
      dailyCheckinXp,
      weeklyGoalXp,
      streak7Xp,
      streak30Xp,
      streak100Xp,
    });
    setIsSaving(false);

    if (res.success) {
      sound.playSuccess();
      setToast('XP economy settings updated successfully.');
      setTimeout(() => setToast(null), 3000);
    } else {
      setError(res.error || 'Failed to update XP settings.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs font-mono">Loading XP Economy Settings...</span>
        </div>
      </div>
    );
  }

  // Live calculation of 30-day user with perfect consistency
  const sample30DayXp = (dailyCheckinXp * 30) + (weeklyGoalXp * 4) + streak7Xp + streak30Xp;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 rounded-xl border border-emerald-500/50 bg-emerald-950 px-4 py-3 text-sm text-emerald-200 shadow-2xl animate-in slide-in-from-bottom">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-800 pb-5">
        <h1 className="text-2xl font-black uppercase tracking-wider text-gray-100">
          XP Economy &amp; Reward Multipliers
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Adjust the progression rate of players. All changes take effect dynamically without redeploying.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Area */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-5">
          {/* Daily & Weekly Group */}
          <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
              <Zap className="h-5 w-5 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                Core Check-In Rewards
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                  Daily Check-in XP
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={dailyCheckinXp}
                    onChange={(e) => setDailyCheckinXp(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 font-mono text-sm text-amber-400 focus:border-amber-500 focus:outline-none"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-gray-500">XP / day</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Base experience awarded for 1 successful daily check-in.</p>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                  Weekly Goal Completion XP
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={weeklyGoalXp}
                    onChange={(e) => setWeeklyGoalXp(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 font-mono text-sm text-emerald-400 focus:border-amber-500 focus:outline-none"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-gray-500">XP / week</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Bonus unlocked once a user reaches their target days in a week.</p>
              </div>
            </div>
          </div>

          {/* Streak Milestones Group */}
          <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                Streak Milestone Bonuses
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                  7-Day Streak Bonus
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={streak7Xp}
                    onChange={(e) => setStreak7Xp(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 font-mono text-sm text-yellow-400 focus:border-amber-500 focus:outline-none"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-gray-500">XP</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Awarded on exactly day 7 of active streak.</p>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                  30-Day Streak Bonus
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={streak30Xp}
                    onChange={(e) => setStreak30Xp(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 font-mono text-sm text-orange-400 focus:border-amber-500 focus:outline-none"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-gray-500">XP</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Awarded on day 30 milestone.</p>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                  100-Day Streak Bonus
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={streak100Xp}
                    onChange={(e) => setStreak100Xp(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 font-mono text-sm text-rose-400 focus:border-amber-500 focus:outline-none"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-gray-500">XP</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Awarded on century streak milestone.</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-bold text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-all uppercase tracking-wider active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save XP Economy'}</span>
          </button>
        </form>

        {/* Live Simulation Card */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4 h-fit">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Economy Simulation
            </h2>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Preview the total XP a user accumulates over 30 days with consistent daily check-ins:
          </p>

          <div className="space-y-2 rounded-xl bg-gray-950/80 p-3 text-xs font-mono border border-gray-800">
            <div className="flex justify-between text-gray-400">
              <span>Daily (30 x {dailyCheckinXp} XP):</span>
              <span className="text-white">+{dailyCheckinXp * 30} XP</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Weekly Goals (4 x {weeklyGoalXp} XP):</span>
              <span className="text-white">+{weeklyGoalXp * 4} XP</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>7-Day Milestone:</span>
              <span className="text-white">+{streak7Xp} XP</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>30-Day Milestone:</span>
              <span className="text-white">+{streak30Xp} XP</span>
            </div>
            <div className="border-t border-gray-800 pt-2 flex justify-between font-bold text-amber-400">
              <span>Total in 30 Days:</span>
              <span>{sample30DayXp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
