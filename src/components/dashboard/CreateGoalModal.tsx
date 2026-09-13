'use client';

import { useState, useEffect } from 'react';
import { createGoalAction, updateGoalAction, deleteGoalAction } from '@/actions/goalActions';
import { sound } from '@/lib/sound/sound';
import { X, Loader2, Trash2 } from 'lucide-react';
import { Goal } from '@/db/schema';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal | null;
  onSuccess: (goal: Goal) => void;
  onDeleteSuccess?: (deletedGoalId: string) => void;
  canDelete?: boolean;
}

const PRESET_EMOJIS = [
  '⚔️', '🏋️', '🚭', '💧', '🧘', '📚', '💻', '🥗', '🏃', '💤', '⚡', '🎯', '🛡️', '🥊', '🧠', '📵'
];

const PRESET_COLORS = [
  { id: 'amber', label: 'Amber', border: 'border-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  { id: 'emerald', label: 'Emerald', border: 'border-emerald-500', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  { id: 'rose', label: 'Crimson', border: 'border-rose-500', bg: 'bg-rose-500/20', text: 'text-rose-400' },
  { id: 'cyan', label: 'Cyan', border: 'border-cyan-500', bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  { id: 'violet', label: 'Amethyst', border: 'border-violet-500', bg: 'bg-violet-500/20', text: 'text-violet-400' },
  { id: 'blue', label: 'Cobalt', border: 'border-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-400' },
];

const SUGGESTIONS = [
  { title: 'Morning Cold Shower', icon: '💧', color: 'cyan', target: 7 },
  { title: 'Gym Workout', icon: '🏋️', color: 'amber', target: 5 },
  { title: 'No Smoking / Urge Control', icon: '🚭', color: 'rose', target: 7 },
  { title: 'Daily Meditation', icon: '🧘', color: 'emerald', target: 6 },
  { title: 'Deep Work 3h', icon: '💻', color: 'violet', target: 5 },
  { title: 'Read 20 Pages', icon: '📚', color: 'blue', target: 6 },
];

export function CreateGoalModal({
  isOpen,
  onClose,
  goalToEdit,
  onSuccess,
  onDeleteSuccess,
  canDelete = false,
}: CreateGoalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⚔️');
  const [color, setColor] = useState('amber');
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title);
      setDescription(goalToEdit.description || '');
      setIcon(goalToEdit.icon || '⚔️');
      setColor(goalToEdit.color || 'amber');
      setTargetDaysPerWeek(goalToEdit.targetDaysPerWeek || 6);
    } else {
      setTitle('');
      setDescription('');
      setIcon('⚔️');
      setColor('amber');
      setTargetDaysPerWeek(6);
    }
    setError(null);
  }, [goalToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a goal title.');
      return;
    }

    sound.playClick();
    setIsSubmitting(true);

    try {
      if (goalToEdit) {
        const res = await updateGoalAction(goalToEdit.id, {
          title: title.trim(),
          description: description.trim() || null,
          icon,
          color,
          targetDaysPerWeek,
        });
        if (res.success && res.data) {
          sound.playLevelUp();
          onSuccess(res.data as Goal);
          onClose();
        } else {
          setError(res.error || 'Failed to update goal.');
        }
      } else {
        const res = await createGoalAction({
          title: title.trim(),
          description: description.trim() || null,
          icon,
          color,
          targetDaysPerWeek,
        });
        if (res.success && res.data) {
          sound.playFanfare();
          onSuccess(res.data as Goal);
          onClose();
        } else {
          setError(res.error || 'Failed to create goal.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!goalToEdit) return;
    if (!confirm(`Are you sure you want to delete "${goalToEdit.title}"?`)) return;

    sound.playClick();
    setIsDeleting(true);
    try {
      const res = await deleteGoalAction(goalToEdit.id);
      if (res.success) {
        if (onDeleteSuccess) onDeleteSuccess(goalToEdit.id);
        onClose();
      } else {
        setError(res.error || 'Failed to delete goal.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const applySuggestion = (s: typeof SUGGESTIONS[0]) => {
    sound.playClick();
    setTitle(s.title);
    setIcon(s.icon);
    setColor(s.color);
    setTargetDaysPerWeek(s.target);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-lg rounded-2xl border border-gray-800 bg-[#0c1017] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 bg-[#090d13]">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-xl">
              {icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">
                {goalToEdit ? 'Edit Habit Goal' : 'Create New Goal'}
              </h3>
              <p className="text-xs text-gray-400">
                {goalToEdit ? 'Update details, frequency or icon' : 'Track an independent habit streak'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-800/80 bg-rose-950/60 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Suggestions (Only when creating) */}
          {!goalToEdit && (
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 block mb-2">
                Quick Inspiration
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="inline-flex items-center space-x-1 rounded-lg border border-gray-800 bg-gray-900/80 px-2.5 py-1 text-xs text-gray-300 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 transition-all active:scale-95"
                  >
                    <span>{s.icon}</span>
                    <span>{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Goal Title */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-1.5">
              Habit / Goal Title <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily Meditation, Cold Shower, No Sugar"
              maxLength={60}
              required
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Emoji / Icon Selector */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-2">
              Choose Habit Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIcon(emoji);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all ${
                    icon === emoji
                      ? 'border-2 border-amber-500 bg-amber-500/20 scale-110 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'border border-gray-800 bg-gray-950 hover:border-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Color Selector */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-2">
              Accent Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setColor(c.id);
                  }}
                  className={`flex flex-col items-center justify-center rounded-xl p-2 border transition-all ${
                    color === c.id
                      ? `${c.border} ${c.bg} scale-105 shadow-md`
                      : 'border-gray-800 bg-gray-950/80 hover:border-gray-700'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Days Per Week */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-wider text-gray-300">
                Weekly Target Days
              </label>
              <span className="text-xs font-bold font-mono text-amber-400">
                {targetDaysPerWeek} Days / Week
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={targetDaysPerWeek}
              onChange={(e) => setTargetDaysPerWeek(Number(e.target.value))}
              className="w-full accent-amber-500 bg-gray-800 rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1 px-1">
              <span>1 Day (Casual)</span>
              <span>4 Days</span>
              <span>7 Days (Iron Will)</span>
            </div>
          </div>

          {/* Optional Motivation / Description */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-gray-300 block mb-1.5">
              Why This Matters (Optional Reminder)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Master dopamine baseline and rebuild internal focus."
              maxLength={280}
              rows={2}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            {goalToEdit && canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="inline-flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Goal'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                disabled={isSubmitting}
                className="rounded-xl border border-gray-700 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-800 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{goalToEdit ? 'Save Changes' : 'Create Habit'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
