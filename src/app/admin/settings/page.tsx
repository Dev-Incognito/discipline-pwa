'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAppSettingsAction, updateAppSettingsAction } from '@/actions/adminActions';
import { Sliders, CheckCircle2, AlertCircle, Save, Type, ToggleLeft, Video } from 'lucide-react';
import { sound } from '@/lib/sound/sound';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getAppSettingsAction();
    if (res.success && res.data) {
      setSettings(res.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key: string) => {
    sound.playClick();
    const current = settings[key] === 'true';
    handleChange(key, String(!current));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    sound.playClick();
    setIsSaving(true);
    const res = await updateAppSettingsAction(settings);
    setIsSaving(false);

    if (res.success) {
      sound.playSuccess();
      setToast('Application settings saved successfully.');
      setTimeout(() => setToast(null), 3000);
    } else {
      setError(res.error || 'Failed to save settings.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs font-mono">Loading System Settings...</span>
        </div>
      </div>
    );
  }

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
          Application Settings &amp; Motivational Text CMS
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Customize brand identity, core motivational copy, feature toggles, and emergency modes.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Group: Brand Identity */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Sliders className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Identity &amp; Branding
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Application Display Name
              </label>
              <input
                type="text"
                value={settings.app_name || 'Discipline'}
                onChange={(e) => handleChange('app_name', e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={settings.app_tagline || 'Private Habit & Progression'}
                onChange={(e) => handleChange('app_tagline', e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Group: Motivational & Product Copy */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Type className="h-5 w-5 text-purple-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              User-Facing Motivational Text
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Dashboard Hero Subtitle
              </label>
              <input
                type="text"
                value={settings.dashboard_subtitle || 'Build discipline. Build yourself.'}
                onChange={(e) => handleChange('dashboard_subtitle', e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-amber-200 focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Displayed on main dashboard hero banner.</span>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Check-In Success Message
              </label>
              <input
                type="text"
                value={settings.checkin_success_message || 'Another day locked in.'}
                onChange={(e) => handleChange('checkin_success_message', e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-emerald-300 focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Shown in reflection modal upon completion.</span>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Streak Reset Message (Supportive)
              </label>
              <input
                type="text"
                value={settings.streak_reset_message || "Streak ended. Progress didn't."}
                onChange={(e) => handleChange('streak_reset_message', e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-blue-300 focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Non-shaming message displayed if streak breaks.</span>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Weekly Completion Message
              </label>
              <input
                type="text"
                value={settings.weekly_completion_message || 'Week complete. Keep building.'}
                onChange={(e) => handleChange('weekly_completion_message', e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-yellow-300 focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Shown when weekly goal threshold is met.</span>
            </div>
          </div>
        </div>

        {/* Group: Feature Toggles & Behavior */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <ToggleLeft className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Feature Switches &amp; Constraints
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-3">
              <div>
                <span className="text-xs font-bold text-gray-200 block">Mood Tracking</span>
                <span className="text-[10px] text-gray-500">Allow users to log difficulty mood</span>
              </div>
              <input
                type="checkbox"
                checked={settings.mood_tracking_enabled === 'true'}
                onChange={() => handleToggle('mood_tracking_enabled')}
                className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-3">
              <div>
                <span className="text-xs font-bold text-gray-200 block">Journal Reflection</span>
                <span className="text-[10px] text-gray-500">Private notes in daily check-in</span>
              </div>
              <input
                type="checkbox"
                checked={settings.journal_enabled === 'true'}
                onChange={() => handleToggle('journal_enabled')}
                className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-3">
              <div>
                <span className="text-xs font-bold text-gray-200 block">Urge Emergency Mode</span>
                <span className="text-[10px] text-gray-500">5-minute pause and breathing screen</span>
              </div>
              <input
                type="checkbox"
                checked={settings.urge_mode_enabled === 'true'}
                onChange={() => handleToggle('urge_mode_enabled')}
                className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-3">
              <div>
                <span className="text-xs font-bold text-gray-200 block">Trophy Room (Badges)</span>
                <span className="text-[10px] text-gray-500">Show achievements in navigation</span>
              </div>
              <input
                type="checkbox"
                checked={settings.achievements_enabled === 'true'}
                onChange={() => handleToggle('achievements_enabled')}
                className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Urge Countdown Duration (Seconds)
              </label>
              <input
                type="number"
                min={30}
                max={3600}
                value={settings.urge_timer_duration || '300'}
                onChange={(e) => handleChange('urge_timer_duration', e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">300 seconds = 5-minute pause.</span>
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Max Journal Length (Characters)
              </label>
              <input
                type="number"
                min={50}
                max={1000}
                value={settings.max_journal_length || '280'}
                onChange={(e) => handleChange('max_journal_length', e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Standard Twitter-style limit is 280.</span>
            </div>
          </div>
        </div>

        {/* Group: Global Celebration Video URL */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Video className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Global Rank Celebration Video
            </h2>
          </div>
          <div>
            <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
              Celebration Video URL / File Path
            </label>
            <input
              type="text"
              value={settings.celebration_video_url || ''}
              onChange={(e) => handleChange('celebration_video_url', e.target.value)}
              placeholder="/videos/celebration.mp4 or hosted video URL"
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 font-mono text-xs text-amber-300 focus:border-amber-500 focus:outline-none"
            />
            <span className="text-[10px] text-gray-500 mt-1 block">
              Plays in the Rank Up celebration popup whenever any user achieves a new rank (unless overridden per rank).
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-bold text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-all uppercase tracking-wider active:scale-95 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Application Settings'}</span>
        </button>
      </form>
    </div>
  );
}
