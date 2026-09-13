'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSettingsAction,
  updateSettingsAction,
  exportUserDataAction,
  deleteAccountAction,
} from '@/actions/settingsActions';
import { changePinAction, logoutAction } from '@/actions/authActions';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Key,
  Calendar,
  Volume2,
  Smartphone,
  Download,
  Trash2,
  Info,
  Shield,
  LogOut,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
  Palette,
} from 'lucide-react';
import { sound } from '@/lib/sound/sound';

const THEME_OPTIONS = [
  { id: 'onyx', name: 'Onyx Obsidian', desc: 'Dark Gold & Charcoal', gradient: 'from-amber-500 to-amber-300', ring: 'ring-amber-500' },
  { id: 'emerald', name: 'Cyber Emerald', desc: 'Matrix Neon Green', gradient: 'from-emerald-500 to-teal-300', ring: 'ring-emerald-500' },
  { id: 'crimson', name: 'Crimson Beast', desc: 'Bloodhound Red & Ruby', gradient: 'from-rose-500 to-red-400', ring: 'ring-rose-500' },
  { id: 'amethyst', name: 'Royal Amethyst', desc: 'Deep Violet & Lavender', gradient: 'from-purple-500 to-indigo-300', ring: 'ring-purple-500' },
  { id: 'solar', name: 'Solar Flare', desc: 'Sunset Orange & Gold', gradient: 'from-orange-500 to-amber-300', ring: 'ring-orange-500' },
  { id: 'aurora', name: 'Midnight Aurora', desc: 'Deep Navy & Cyan', gradient: 'from-cyan-500 to-blue-400', ring: 'ring-cyan-500' },
];

export default function SettingsPage() {
  const router = useRouter();

  // Settings State
  const [weeklyGoal, setWeeklyGoal] = useState<number>(6);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [currentTheme, setCurrentTheme] = useState<string>('onyx');

  // Modals
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Change PIN inputs
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Delete inputs
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getSettingsAction();
      if (res.success && res.data) {
        setWeeklyGoal(res.data.weeklyGoal);
        setSoundEnabled(res.data.soundEnabled);
        sound.setSoundEnabled(res.data.soundEnabled);
        setHapticsEnabled(res.data.hapticsEnabled);
        if (res.data.theme) {
          setCurrentTheme(res.data.theme);
          document.documentElement.setAttribute('data-theme', res.data.theme);
        }
      }
      const localTheme = localStorage.getItem('discipline_theme');
      if (localTheme) {
        setCurrentTheme(localTheme);
        document.documentElement.setAttribute('data-theme', localTheme);
      }
    }
    load();
  }, []);

  const handleThemeSelect = async (themeId: string) => {
    sound.playClick();
    setCurrentTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('discipline_theme', themeId);
    await updateSettingsAction({ theme: themeId });
  };

  const handleGoalChange = async (newGoal: number) => {
    sound.playClick();
    setWeeklyGoal(newGoal);
    await updateSettingsAction({ weeklyGoal: newGoal });
  };

  const handleSoundToggle = async () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    sound.setSoundEnabled(nextVal);
    if (nextVal) sound.playClick();
    await updateSettingsAction({ soundEnabled: nextVal });
  };

  const handleHapticsToggle = async () => {
    sound.playClick();
    const nextVal = !hapticsEnabled;
    setHapticsEnabled(nextVal);
    await updateSettingsAction({ hapticsEnabled: nextVal });
  };

  const handleChangePin = async () => {
    setPinError(null);
    if (!currentPin || !newPin) {
      setPinError('Please enter both current and new PIN');
      return;
    }
    setIsSaving(true);
    const res = await changePinAction(currentPin, newPin);
    setIsSaving(false);
    if (res.success) {
      setPinSuccess(true);
      setTimeout(() => {
        setPinSuccess(false);
        setShowPinModal(false);
        setCurrentPin('');
        setNewPin('');
      }, 1500);
    } else {
      setPinError(res.error || 'Failed to change PIN');
    }
  };

  const handleExportData = async () => {
    const res = await exportUserDataAction();
    if (res.success && res.data) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `discipline_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteData = async () => {
    setDeleteError(null);
    if (deleteConfirmText.trim() !== 'DELETE EVERYTHING') {
      setDeleteError('You must type "DELETE EVERYTHING" exactly.');
      return;
    }

    setIsSaving(true);
    const res = await deleteAccountAction('DELETE EVERYTHING');
    setIsSaving(false);
    if (res.success) {
      router.push('/');
    } else {
      setDeleteError(res.error || 'Failed to delete account.');
    }
  };

  const handleLogout = async () => {
    await logoutAction();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#080b11] text-gray-100 pb-safe-nav">
      <Header currentRank="Settings" />

      <main className="flex-1 space-y-5 px-4 py-4">
        {/* Section: Security */}
        <section className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Security & Authentication
          </span>
          <div className="rounded-2xl bg-[#0f1422] border border-gray-800 divide-y divide-gray-800/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-900/40 active:bg-gray-800/60"
            >
              <div className="flex items-center space-x-3">
                <Key className="h-5 w-5 text-amber-400" />
                <div>
                  <span className="text-sm font-semibold text-gray-200">Change Master PIN</span>
                  <p className="text-xs text-gray-500">Update your access key</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-900/40 active:bg-gray-800/60"
            >
              <div className="flex items-center space-x-3">
                <LogOut className="h-5 w-5 text-rose-400" />
                <div>
                  <span className="text-sm font-semibold text-gray-200">Lock Session</span>
                  <p className="text-xs text-gray-500">Require PIN to re-enter</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </section>

        {/* Section: Weekly Discipline Target */}
        <section className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Discipline Target
          </span>
          <div className="rounded-2xl bg-[#0f1422] border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-amber-400" />
                <div>
                  <span className="text-sm font-semibold text-gray-200">Weekly Goal</span>
                  <p className="text-xs text-gray-500">Days per week needed for +100 XP bonus</p>
                </div>
              </div>
              <span className="font-mono text-base font-black text-amber-400">
                {weeklyGoal} / 7
              </span>
            </div>

            {/* Stepper Buttons 1 to 7 */}
            <div className="flex justify-between gap-1.5 mt-3">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleGoalChange(num)}
                  className={`flex-1 rounded-xl py-2 font-mono text-xs font-bold transition-all ${
                    weeklyGoal === num
                      ? 'bg-amber-500 text-gray-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {num}d
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Theme & Styling */}
        <section className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Theme &amp; Accent
          </span>
          <div className="rounded-2xl bg-[#0f1422] border border-gray-800 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Palette className="h-5 w-5 text-amber-400" />
              <div>
                <span className="text-sm font-semibold text-gray-200">Color Palette</span>
                <p className="text-xs text-gray-500">Select app theme and glow accents</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 sm:grid-cols-3">
              {THEME_OPTIONS.map((thm) => {
                const isSelected = currentTheme === thm.id;
                return (
                  <button
                    key={thm.id}
                    type="button"
                    onClick={() => handleThemeSelect(thm.id)}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? `border-white/40 bg-gray-800/80 shadow-md ring-2 ${thm.ring}`
                        : 'border-gray-800 bg-gray-950/60 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className={`h-4 w-4 rounded-full bg-gradient-to-r ${thm.gradient} shadow-sm`} />
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-gray-200">{thm.name}</span>
                    <span className="text-[10px] text-gray-400 leading-tight mt-0.5">{thm.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section: Sensory Feedback */}
        <section className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Sensory Feedback
          </span>
          <div className="rounded-2xl bg-[#0f1422] border border-gray-800 divide-y divide-gray-800/60 overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <Volume2 className="h-5 w-5 text-amber-400" />
                <div>
                  <span className="text-sm font-semibold text-gray-200">Audio Feedback</span>
                  <p className="text-xs text-gray-500">Milestone and check-in sounds</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={handleSoundToggle}
                className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-amber-400" />
                <div>
                  <span className="text-sm font-semibold text-gray-200">Haptic Impulses</span>
                  <p className="text-xs text-gray-500">Vibrations on iOS Safari</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hapticsEnabled}
                onChange={handleHapticsToggle}
                className="h-5 w-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Section: Data & Backup */}
        <section className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Data Portability
          </span>
          <div className="rounded-2xl bg-[#0f1422] border border-gray-800 overflow-hidden">
            <button
              type="button"
              onClick={handleExportData}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-900/40 active:bg-gray-800/60"
            >
              <div className="flex items-center space-x-3">
                <Download className="h-5 w-5 text-emerald-400" />
                <div>
                  <span className="text-sm font-semibold text-gray-200">Export All Data (JSON)</span>
                  <p className="text-xs text-gray-500">Download complete unencrypted backup</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </section>

        {/* Section: Danger Zone */}
        <section className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
            Danger Zone
          </span>
          <div className="rounded-2xl bg-rose-950/20 border border-rose-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-rose-900/30 active:bg-rose-900/50"
            >
              <div className="flex items-center space-x-3">
                <Trash2 className="h-5 w-5 text-rose-400" />
                <div>
                  <span className="text-sm font-semibold text-rose-300">Delete All Data</span>
                  <p className="text-xs text-rose-400/70">Wipe check-ins, XP, and streak permanently</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-rose-400" />
            </button>
          </div>
        </section>

        {/* Section: Information & Philosophy */}
        <div className="rounded-2xl bg-[#0f1422] border border-gray-800/80 p-4 text-xs text-gray-400 space-y-2">
          <div className="flex items-center space-x-2 text-gray-300">
            <Info className="h-4 w-4 text-amber-400" />
            <span className="font-bold uppercase tracking-wider">About Discipline</span>
          </div>
          <p className="leading-relaxed">
            Discipline is a private, client-encrypted, non-medical habit progression app designed for
            mental fortitude, consistency, and character leveling.
          </p>
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-800">
            <Shield className="h-4 w-4 text-blue-400" />
            <span>Zero ad trackers. Zero third-party analytics. Private server-validated storage.</span>
          </div>
          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="text-[11px] text-gray-600 hover:text-gray-400 underline"
            >
              Admin Portal →
            </button>
          </div>
        </div>
      </main>

      {/* Change PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-[#0f1422] border border-gray-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <span className="text-sm font-bold uppercase tracking-wider text-gray-100">
                Change PIN
              </span>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
                  Current PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="••••"
                  className="w-full rounded-xl bg-gray-900 border border-gray-800 p-2.5 text-center font-mono text-lg text-gray-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
                  New PIN (4-8 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="w-full rounded-xl bg-gray-900 border border-gray-800 p-2.5 text-center font-mono text-lg text-gray-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {pinError && (
                <div className="text-center text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-900">
                  {pinError}
                </div>
              )}

              {pinSuccess && (
                <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900">
                  <Check className="h-4 w-4" />
                  <span>PIN successfully changed!</span>
                </div>
              )}

              <button
                type="button"
                disabled={isSaving || pinSuccess}
                onClick={handleChangePin}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold uppercase text-xs text-gray-950 shadow-md active:scale-95 disabled:opacity-40"
              >
                {isSaving ? 'Updating...' : 'Save New PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Data Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-[#0f1422] border border-rose-800 p-5 shadow-2xl">
            <div className="flex items-center space-x-2 text-rose-400 pb-2 border-b border-rose-900/50">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-black uppercase tracking-wider">DELETE ALL DATA?</span>
            </div>

            <p className="mt-3 text-xs text-gray-300 leading-relaxed">
              This cannot be undone. All your streaks, check-in records, achievements, and XP will
              be completely erased from the database.
            </p>

            <div className="mt-4">
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Type <strong>DELETE EVERYTHING</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE EVERYTHING"
                className="w-full rounded-xl bg-gray-900 border border-rose-900/60 p-2.5 text-center text-xs font-mono text-rose-300 focus:border-rose-500 focus:outline-none"
              />
            </div>

            {deleteError && (
              <div className="mt-2 text-center text-xs text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-900">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="flex-1 rounded-xl bg-gray-900 border border-gray-800 py-3 text-xs font-bold text-gray-300 active:scale-95"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleDeleteData}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-black uppercase text-white shadow-lg shadow-rose-900/40 active:scale-95 disabled:opacity-40"
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
