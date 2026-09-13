'use client';

import React from 'react';
import Image from 'next/image';
import { RankDefinition } from '@/lib/gamification/ranks';

interface RankPreviewCardProps {
  rank: Partial<RankDefinition>;
  previewXp?: number;
}

export function RankPreviewCard({ rank, previewXp }: RankPreviewCardProps) {
  const currentXp = previewXp ?? rank.minXp ?? 750;
  const minXp = rank.minXp ?? 0;
  const badgeColor = rank.badgeColor || 'text-amber-400 bg-amber-950/80 border-amber-700';
  const glowColor = rank.glowColor || 'shadow-amber-500/20';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/90 to-[#080b11] p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between border-b border-gray-800/80 pb-2">
        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
          LIVE RANK PREVIEW
        </span>
        <span className="text-[10px] font-mono text-amber-400">Order #{rank.displayOrder ?? 1}</span>
      </div>

      <div className="flex flex-col items-center text-center">
        {/* Logo / Icon Container */}
        <div className={`relative mb-3 flex h-20 w-20 items-center justify-center rounded-2xl border ${badgeColor} shadow-lg ${glowColor} transition-transform`}>
          {rank.logoUrl ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-lg">
              <Image
                src={rank.logoUrl}
                alt={rank.name || 'Rank Logo'}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <span className="text-4xl">{rank.icon || '🗿'}</span>
          )}
        </div>

        {/* Rank Title */}
        <h3 className="text-lg font-black tracking-wider text-gray-100 uppercase">
          {rank.name || 'GIGA CHAD'}
        </h3>

        {/* Description */}
        <p className="mt-1 text-xs italic text-gray-400 max-w-xs">
          &ldquo;{rank.description || 'Serious discipline.'}&rdquo;
        </p>

        {/* Min XP Threshold */}
        <div className="mt-4 flex items-center space-x-2 text-xs font-mono font-bold text-amber-300">
          <span>Threshold:</span>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300 border border-amber-500/30">
            {minXp.toLocaleString()} XP
          </span>
        </div>

        {/* Visual Progress Bar representation */}
        <div className="mt-4 w-full">
          <div className="mb-1 flex justify-between text-[11px] font-mono text-gray-400">
            <span>Tier Progress</span>
            <span className="text-amber-400">80%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: '80%' }}
            />
          </div>
          <div className="mt-2 text-[10px] font-mono text-gray-500">
            ████████░░ (Current XP: {currentXp})
          </div>
        </div>

        {rank.rankUpMessage && (
          <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-1.5 text-[11px] text-amber-200/90">
            <span className="font-semibold text-gray-400">Rank-up: </span>
            &ldquo;{rank.rankUpMessage}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
