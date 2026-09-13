'use client';

import { useState } from 'react';
import { Check, CheckCircle2, Flame, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitCheckinAction } from '@/actions/checkinActions';
import { CheckinResult } from '@/services/dataService';
import { sound } from '@/lib/sound/sound';

interface CheckinButtonProps {
  todayDate: string;
  isCompleted: boolean;
  todayMood?: string | null;
  goalId?: string | null;
  goalTitle?: string;
  onCheckinSuccess: (result: CheckinResult) => void;
  onOpenReflectionModal: () => void;
}

export function CheckinButton({
  todayDate,
  isCompleted,
  todayMood,
  goalId,
  goalTitle,
  onCheckinSuccess,
  onOpenReflectionModal,
}: CheckinButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckin = async () => {
    sound.playClick();
    if (isCompleted) {
      onOpenReflectionModal();
      return;
    }

    setIsLoading(true);
    try {
      const res = await submitCheckinAction({
        date: todayDate,
        goalId,
      });

      if (res.success && res.data) {
        sound.playSuccess();
        // Trigger refined celebratory particle burst
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981'],
          disableForReducedMotion: true,
        });

        onCheckinSuccess(res.data);
      }
    } catch (err) {
      console.error('Checkin error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <button
        type="button"
        onClick={handleCheckin}
        className="group relative flex h-16 w-full items-center justify-between overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 px-5 shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all duration-150 active:scale-[0.99]"
      >
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="text-left">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-extrabold tracking-wider text-emerald-300 uppercase">
                DAY COMPLETE
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-emerald-300">
                +10 XP
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {todayMood ? `Mood: ${todayMood}` : 'Tap to reflect or add note'}
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-emerald-400/80 group-hover:text-emerald-300">
          Reflect →
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={handleCheckin}
      className="group relative flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500 to-amber-600 px-6 font-black uppercase tracking-wider text-gray-950 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-950" />
          <span className="text-sm font-bold">RECORDING PROGRESS...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-950/10">
            <Check className="h-5 w-5 stroke-[3] text-gray-950" />
          </div>
          <span className="text-base font-extrabold tracking-widest text-gray-950">
            {goalTitle ? `LOG ${goalTitle.toUpperCase()}` : 'CHECK IN TODAY'}
          </span>
          <Flame className="h-5 w-5 text-gray-950/80 group-hover:scale-110 transition-transform" />
        </div>
      )}
    </button>
  );
}
