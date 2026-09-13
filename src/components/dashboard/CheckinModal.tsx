'use client';

import { useState } from 'react';
import { X, Flame, Sparkles, Trophy, Check } from 'lucide-react';
import { submitCheckinAction } from '@/actions/checkinActions';
import { CheckinResult } from '@/services/dataService';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayDate: string;
  checkinResult?: CheckinResult | null;
  initialMood?: string | null;
  initialJournal?: string | null;
  successMessage?: string;
  onSaveReflection: (mood: 'difficult' | 'normal' | 'easy' | null, note: string) => void;
}

const MOODS = [
  { id: 'difficult' as const, emoji: '😫', label: 'Difficult' },
  { id: 'normal' as const, emoji: '😐', label: 'Normal' },
  { id: 'easy' as const, emoji: '😎', label: 'Easy' },
];

export function CheckinModal({
  isOpen,
  onClose,
  todayDate,
  checkinResult,
  initialMood,
  initialJournal,
  successMessage,
  onSaveReflection,
}: CheckinModalProps) {
  const [selectedMood, setSelectedMood] = useState<'difficult' | 'normal' | 'easy' | null>(
    (initialMood as 'difficult' | 'normal' | 'easy') || null
  );
  const [journalNote, setJournalNote] = useState(initialJournal || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await submitCheckinAction({
        date: todayDate,
        mood: selectedMood,
        journalNote: journalNote.trim() ? journalNote.trim() : null,
      });
      onSaveReflection(selectedMood, journalNote.trim());
      onClose();
    } catch (err) {
      console.error('Failed to save reflection:', err);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1422] border border-gray-800 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800/60 text-gray-400 hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Celebration Header */}
        {checkinResult && (
          <div className="flex flex-col items-center text-center pb-4 border-b border-gray-800/80">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <Flame className="h-7 w-7 text-amber-500 animate-flame" />
            </div>

            <h2 className="mt-3 text-lg font-black uppercase tracking-wider text-gray-100">
              DAY COMPLETE!
            </h2>

            {successMessage && (
              <p className="mt-1 text-xs text-amber-200/80 italic font-medium max-w-[260px]">
                &ldquo;{successMessage}&rdquo;
              </p>
            )}

            <div className="mt-1 flex items-center space-x-2">
              <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300">
                +{checkinResult.xpEarned} XP
              </span>
              <span className="text-xs font-bold text-gray-400 font-mono">
                🔥 {checkinResult.newStreak} DAY STREAK
              </span>
            </div>

            {/* Rank-up notification */}
            {checkinResult.didRankUp && (
              <div className="mt-3 flex items-center space-x-2 rounded-xl bg-amber-950/60 border border-amber-600/60 px-3 py-1.5 text-xs text-amber-300">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>
                  RANK UP! You are now <strong>{checkinResult.currentRank}</strong>!
                </span>
              </div>
            )}

            {/* Unlocked Achievements */}
            {checkinResult.unlockedAchievements.length > 0 && (
              <div className="mt-3 w-full space-y-1.5">
                {checkinResult.unlockedAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="flex items-center justify-between rounded-xl bg-purple-950/40 border border-purple-800/60 px-3 py-1.5 text-xs text-purple-200"
                  >
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span>{ach.name}</span>
                    </div>
                    <span className="font-mono text-amber-400 font-bold">
                      +{ach.xpReward} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mood Check-In */}
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            How was today? (Optional)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MOODS.map((m) => {
              const isSelected = selectedMood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMood(isSelected ? null : m.id)}
                  className={`flex flex-col items-center justify-center rounded-2xl py-3 border transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? 'border-amber-500/80 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)] text-gray-100'
                      : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="mt-1 text-[11px] font-semibold">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Journal Note */}
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            Private Reflection (Optional)
          </label>
          <textarea
            value={journalNote}
            onChange={(e) => setJournalNote(e.target.value.slice(0, 280))}
            placeholder="Today was challenging because... or Win of the day..."
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-800 bg-gray-950/80 p-3 text-xs text-gray-200 placeholder-gray-600 focus:border-amber-500/80 focus:outline-none"
          />
          <div className="mt-1 text-right text-[10px] text-gray-500 font-mono">
            {journalNote.length}/280
          </div>
        </div>

        {/* Save & Dismiss */}
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="mt-4 flex h-12 w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-extrabold uppercase tracking-wider text-gray-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all active:scale-[0.99]"
        >
          <Check className="h-4 w-4 stroke-[3]" />
          <span>{isSaving ? 'Saving...' : 'Save & Continue'}</span>
        </button>
      </div>
    </div>
  );
}
