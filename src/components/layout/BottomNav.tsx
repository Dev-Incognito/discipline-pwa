'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, BarChart3, Trophy, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { sound } from '@/lib/sound/sound';

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'History', href: '/history', icon: Calendar },
  { label: 'Stats', href: '/stats', icon: BarChart3 },
  { label: 'Badges', href: '/achievements', icon: Trophy },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  // Don't render bottom nav in admin or emergency urge full-screen mode
  if (pathname.startsWith('/admin') || pathname === '/urge') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-md border-t border-gray-800/80 bg-[#080b11]/95 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => sound.playClick()}
              className={clsx(
                'group flex flex-1 flex-col items-center justify-center py-1 transition-all duration-150 active:scale-95',
                isActive ? 'text-amber-400 font-medium' : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={clsx(
                    'h-5 w-5 transition-transform duration-200',
                    isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'group-hover:scale-105'
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                )}
              </div>
              <span className="mt-1 text-[11px] tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
