'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Monitor, Smartphone } from 'lucide-react';
import { sound } from '@/lib/sound/sound';

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');

  // Load saved theme and sound preferences on initial mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('discipline_theme') || 'onyx';
      document.documentElement.setAttribute('data-theme', savedTheme);

      const savedSound = localStorage.getItem('discipline_sound_enabled');
      if (savedSound !== null) {
        sound.setSoundEnabled(savedSound === 'true');
      }

      const savedDevice = localStorage.getItem('discipline_pc_view_mode') as 'mobile' | 'desktop' | null;
      if (savedDevice) {
        setDeviceMode(savedDevice);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const toggleDeviceMode = (mode: 'mobile' | 'desktop') => {
    sound.playClick();
    setDeviceMode(mode);
    try {
      localStorage.setItem('discipline_pc_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // If Admin route, render full-width desktop dashboard
  if (isAdminRoute) {
    return <div className="min-h-screen w-full bg-[#080b11] text-gray-100">{children}</div>;
  }

  // User-facing App on Desktop / PC
  return (
    <div className="relative min-h-screen w-full bg-[#030508] text-gray-100 flex flex-col justify-start items-center">
      {/* PC Testing Bar (Visible only on desktop screens md:flex) */}
      <aside className="hidden md:flex fixed top-3 right-4 z-50 items-center space-x-2 rounded-full border border-gray-800 bg-gray-950/80 px-3 py-1.5 backdrop-blur-md shadow-lg text-xs">
        <span className="text-gray-400 font-mono text-[11px]">PC Test View:</span>
        <button
          type="button"
          onClick={() => toggleDeviceMode('mobile')}
          className={`flex items-center space-x-1 rounded-full px-2.5 py-1 transition-all ${
            deviceMode === 'mobile'
              ? 'bg-amber-500 text-black font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Mobile (390px)</span>
        </button>
        <button
          type="button"
          onClick={() => toggleDeviceMode('desktop')}
          className={`flex items-center space-x-1 rounded-full px-2.5 py-1 transition-all ${
            deviceMode === 'desktop'
              ? 'bg-amber-500 text-black font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
          <span>Desktop (Fluid)</span>
        </button>
      </aside>

      {/* Main App Container */}
      <div
        className={`w-full flex min-h-screen flex-col bg-[#080b11] shadow-2xl transition-all duration-300 md:border-x md:border-gray-800/80 ${
          deviceMode === 'mobile'
            ? 'max-w-md my-0 md:my-4 md:rounded-3xl md:border md:overflow-y-auto md:min-h-[calc(100vh-2rem)]'
            : 'max-w-2xl'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
