'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Award,
  Zap,
  Target,
  Trophy,
  Sliders,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Flame,
} from 'lucide-react';
import { logoutAdminAction } from '@/actions/adminActions';
import { sound } from '@/lib/sound/sound';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Ranks & Logos', href: '/admin/ranks', icon: Award },
  { label: 'XP Economy', href: '/admin/xp', icon: Zap },
  { label: 'Weekly Goals', href: '/admin/goals', icon: Target },
  { label: 'Achievements', href: '/admin/achievements', icon: Trophy },
  { label: 'App Settings', href: '/admin/settings', icon: Sliders },
  { label: 'Security & Audit', href: '/admin/security', icon: ShieldCheck },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    sound.playClick();
    await logoutAdminAction();
    router.push('/admin');
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="lg:hidden flex items-center justify-between border-b border-gray-800 bg-[#080b11] px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Flame className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-sm text-gray-100 uppercase">
              DISCIPLINE <span className="text-amber-400 font-mono text-xs">CMS</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            setMobileOpen(!mobileOpen);
          }}
          className="rounded-lg border border-gray-800 p-1.5 text-gray-400 hover:text-white"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Desktop Sidebar & Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800 bg-[#080b11] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-5">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
            </div>
            <div>
              <span className="font-black text-sm tracking-wider text-gray-100 uppercase block leading-none">
                DISCIPLINE
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest">
                ADMIN CMS
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
            Configuration
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  sound.playClick();
                  setMobileOpen(false);
                }}
                className={`flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-sm'
                    : 'text-gray-300 hover:bg-gray-900/60 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
            Direct Access
          </div>
          <Link
            href="/"
            target="_blank"
            onClick={() => sound.playClick()}
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-900/60 hover:text-white"
          >
            <div className="flex items-center space-x-3">
              <ExternalLink className="h-4 w-4 text-emerald-400" />
              <span>Live Application</span>
            </div>
            <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800">
              PWA
            </span>
          </Link>
        </nav>

        {/* Footer with Logout */}
        <div className="border-t border-gray-800 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Lock &amp; Exit CMS</span>
          </button>
        </div>
      </aside>
    </>
  );
}
