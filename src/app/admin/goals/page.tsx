'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGoalSettingsAction, updateGoalSettingsAction } from '@/actions/adminActions';
import { Target, CheckCircle2, AlertCircle, Save, Calendar } from 'lucide-react';
import { sound } from '@/lib/sound/sound';

export default function AdminGoalsPage() {
  const [defaultWeeklyGoal, setDefaultWeeklyGoal] = useState<number>(6);
  const [minWeeklyGoal, setMinWeeklyGoal] = useState<number>(1);
  const [maxWeeklyGoal, setMaxWeeklyGoal] = useState<number>(7);
  const [weekStartDay, setWeekStartDay] = useState<string>('Monday');
  const [weekEndDay, setWeekEndDay] = useState<string>('Sunday');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getGoalSettingsAction();
    if (res.success && res.data) {
      setDefaultWeeklyGoal(res.data.defaultWeeklyGoal);
      setMinWeeklyGoal(res.data.minWeeklyGoal);
      setMaxWeeklyGoal(res.data.maxWeeklyGoal);
      setWeekStartDay(res.data.weekStartDay);
      setWeekEndDay(res.data.weekEndDay);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (minWeeklyGoal < 1 || maxWeeklyGoal > 7) {
      setError('Weekly goal limits must be between 1 and 7 days.');
      return;
    }
    if (minWeeklyGoal > maxWeeklyGoal) {
      setError('Minimum weekly goal cannot exceed maximum weekly goal.');
      return;
    }
    if (defaultWeeklyGoal < minWeeklyGoal || defaultWeeklyGoal > maxWeeklyGoal) {
      setError(`Default weekly goal must be between ${minWeeklyGoal} and ${maxWeeklyGoal} days.`);
      return;
    }

    sound.playClick();
    setIsSaving(true);
    const res = await updateGoalSettingsAction({
      defaultWeeklyGoal,
      minWeeklyGoal,
      maxWeeklyGoal,
      weekStartDay,
      weekEndDay,
    });
    setIsSaving(false);

    if (res.success) {
      sound.playSuccess();
      setToast('Weekly goal settings updated successfully.');
      setTimeout(() => setToast(null), 3000);
    } else {
      setError(res.error || 'Failed to update goal settings.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs font-mono">Loading Weekly Goal Settings...</span>
        </div>
      </div>
    );
  }

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
          Weekly Goal &amp; Cycle Configuration
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure default weekly targets, acceptable user-configuration bounds, and tracking cycle boundaries.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Goal Targets */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Target className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Days Required Targets
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Default Goal
              </label>
              <input
                type="number"
                min={minWeeklyGoal}
                max={maxWeeklyGoal}
                value={defaultWeeklyGoal}
                onChange={(e) => setDefaultWeeklyGoal(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 font-mono text-sm text-amber-400 focus:border-amber-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Assigned to new players</span>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Minimum Allowed
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={minWeeklyGoal}
                onChange={(e) => setMinWeeklyGoal(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Lowest setting in user menu</span>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Maximum Allowed
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={maxWeeklyGoal}
                onChange={(e) => setMaxWeeklyGoal(parseInt(e.target.value, 10) || 7)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Highest setting in user menu</span>
            </div>
          </div>
        </div>

        {/* Cycle Days */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Calendar className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Weekly Tracking Cycle
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Week Start Day
              </label>
              <select
                value={weekStartDay}
                onChange={(e) => setWeekStartDay(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-200 focus:border-amber-500 focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Week End Day
              </label>
              <select
                value={weekEndDay}
                onChange={(e) => setWeekEndDay(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-200 focus:border-amber-500 focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-bold text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-all uppercase tracking-wider active:scale-95 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Goal Settings'}</span>
        </button>
      </form>
    </div>
  );
}
