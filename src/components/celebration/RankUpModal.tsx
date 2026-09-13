'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import { sound } from '@/lib/sound/sound';
import { Sparkles, Trophy, X } from 'lucide-react';
import { RankDefinition } from '@/lib/gamification/ranks';

interface RankUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newRank?: RankDefinition | null;
  rankUpMessage?: string;
  videoUrl?: string | null;
}

export function RankUpModal({
  isOpen,
  onClose,
  newRank,
  rankUpMessage,
  videoUrl,
}: RankUpModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Play triumphant fanfare
      sound.playRankUp();

      // Confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff', '#a855f7', '#3b82f6'],
      });

      const interval = setInterval(() => {
        confetti({
          particleCount: 30,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
        });
        confetti({
          particleCount: 30,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
        });
      }, 700);

      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 2500);

      // Try autoplaying video
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          // Autoplay policy prevented video playback
        });
      }

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rank: RankDefinition = newRank || {
    name: 'Chad',
    minXp: 300,
    icon: '💪',
    logoUrl: null,
    description: "You're building serious momentum.",
    badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-700',
    glowColor: 'shadow-amber-500/30',
    rankUpMessage: "Elite consistency unlocked. You've entered a higher tier of discipline.",
  };

  const celebrationMsg = rankUpMessage || rank.rankUpMessage || "Elite consistency unlocked. You've entered a higher tier of discipline.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-gray-900 via-[#0a0d14] to-[#040609] p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.25)]">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute right-4 top-4 rounded-full bg-gray-800/80 p-1.5 text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Celebration Video or Animated Radiant Halo */}
        <div className="relative mb-4 flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl border border-amber-500/30 bg-black shadow-inner">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-amber-950/40 via-purple-950/30 to-black">
              {/* Dynamic canvas / pulse glow celebration effect */}
              <div className="absolute h-28 w-28 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
              <div className="relative flex flex-col items-center">
                <Sparkles className="h-8 w-8 text-amber-400 animate-spin duration-1000" />
                <span className="mt-2 text-xs font-mono tracking-widest text-amber-300 font-bold uppercase">
                  RANK UNLOCKED
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Rank Logo & Title */}
        <div className="relative mx-auto -mt-10 mb-3 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/60 bg-gray-900 shadow-xl shadow-amber-500/30">
          {rank.logoUrl ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-xl">
              <Image
                src={rank.logoUrl}
                alt={rank.name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <span className="text-4xl">{rank.icon || '👑'}</span>
          )}
        </div>

        <div className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-400 uppercase tracking-widest">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          <span>PROMOTION ACHIEVED</span>
        </div>

        <h2 className="mt-2 text-2xl font-black uppercase tracking-wider text-white">
          {rank.name}
        </h2>

        <p className="mt-2 text-xs font-medium text-amber-200/90 leading-relaxed px-2">
          &ldquo;{celebrationMsg}&rdquo;
        </p>

        <p className="mt-1 text-[11px] text-gray-400 italic">
          {rank.description}
        </p>

        {/* Claim Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 py-3.5 text-sm font-extrabold tracking-wider text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95 uppercase"
        >
          Claim &amp; Continue
        </button>
      </div>
    </div>
  );
}
