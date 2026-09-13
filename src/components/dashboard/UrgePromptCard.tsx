'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export function UrgePromptCard({ goalTitle }: { goalTitle?: string }) {
  return (
    <Link
      href="/urge"
      className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-gray-900/60 border border-red-900/50 p-4 transition-all duration-150 hover:border-red-700/60 active:scale-[0.99]"
    >
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 group-hover:scale-105 transition-transform">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-red-300">
            {goalTitle ? `URGE FOR ${goalTitle.toUpperCase()}` : "I'M HAVING AN URGE"}
          </span>
          <p className="text-[11px] text-gray-400">
            {goalTitle ? `Take 5 minutes before breaking your ${goalTitle} streak.` : 'Take 5 minutes before making a decision.'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1 text-xs font-bold text-red-400 group-hover:translate-x-0.5 transition-transform">
        <span>Pause</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
