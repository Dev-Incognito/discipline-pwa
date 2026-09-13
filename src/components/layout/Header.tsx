'use client';

import { Flame, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderProps {
  currentRank?: string;
  username?: string;
  onUrgeClick?: () => void;
}

export function Header({ currentRank = 'Beginner', username }: HeaderProps) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-800/60 bg-[#080b11]/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md">
      <div className="flex items-center space-x-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Flame className="h-5 w-5 text-amber-500 animate-flame" />
        </div>
        <div>
          <span className="font-extrabold tracking-widest text-base text-gray-100 uppercase">
            DISCIPLINE
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {isOffline && (
          <div className="flex items-center space-x-1 rounded-full bg-red-950/80 border border-red-800/80 px-2.5 py-0.5 text-[11px] text-red-300 font-medium">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </div>
        )}
        {username && (
          <span className="hidden xs:inline-block font-mono text-[11px] text-gray-400 bg-gray-950/80 border border-gray-800 rounded-full px-2.5 py-0.5">
            @{username}
          </span>
        )}
        <div className="flex items-center rounded-full bg-gray-900 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
          <span>{currentRank}</span>
        </div>
      </div>
    </header>
  );
}
