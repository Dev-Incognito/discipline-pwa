'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getAdminDataAction } from '@/actions/adminActions';
import {
  Users,
  CheckCircle2,
  CalendarCheck,
  Trophy,
  Zap,
  Award,
  Sliders,
  ShieldCheck,
  Target,
  ArrowUpRight,
  Activity,
  Flame,
} from 'lucide-react';
import { sound } from '@/lib/sound/sound';

interface AdminAggregates {
  totalUsers: number;
  activeUsers: number;
  totalCheckins: number;
  checkinsToday: number;
  totalWeeksCompleted: number;
  weeklyCompletionRate: number;
  mostCommonRank: string;
  totalXpAwarded: number;
  achievementsUnlocked: number;
  rankDistribution: Record<string, number>;
  achievementStats: Record<string, number>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminAggregates | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getAdminDataAction();
    if (res.success && res.data) {
      setData(res.data as AdminAggregates);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs font-mono">Loading CMS Metrics...</span>
        </div>
      </div>
    );
  }

  const aggregates = data || {
    totalUsers: 0,
    activeUsers: 0,
    totalCheckins: 0,
    checkinsToday: 0,
    totalWeeksCompleted: 0,
    weeklyCompletionRate: 0,
    mostCommonRank: 'Beginner',
    totalXpAwarded: 0,
    achievementsUnlocked: 0,
    rankDistribution: {},
    achievementStats: {},
  };

  const OVERVIEW_CARDS = [
    { label: 'Total Users', val: aggregates.totalUsers.toLocaleString(), sub: 'Registered accounts', icon: Users, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-950/20' },
    { label: 'Active Users (7d)', val: aggregates.activeUsers.toLocaleString(), sub: 'Checked in recently', icon: Activity, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-950/20' },
    { label: 'Total Check-Ins', val: aggregates.totalCheckins.toLocaleString(), sub: 'All-time completions', icon: CheckCircle2, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-950/20' },
    { label: 'Check-Ins Today', val: aggregates.checkinsToday.toLocaleString(), sub: 'Completed today', icon: Flame, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-950/20' },
    { label: 'Weekly Completion', val: `${aggregates.weeklyCompletionRate}%`, sub: `${aggregates.totalWeeksCompleted} weeks completed`, icon: CalendarCheck, color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-950/20' },
    { label: 'Most Common Rank', val: aggregates.mostCommonRank, sub: 'Dominant tier', icon: Award, color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-950/20' },
    { label: 'Total XP Awarded', val: aggregates.totalXpAwarded.toLocaleString(), sub: 'Across community', icon: Zap, color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-950/20' },
    { label: 'Achievements Unlocked', val: aggregates.achievementsUnlocked.toLocaleString(), sub: 'Trophies claimed', icon: Trophy, color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-950/20' },
  ];

  const QUICK_ACTIONS = [
    { label: 'Manage Ranks', href: '/admin/ranks', desc: 'Configure rank ladder, XP thresholds, custom logos & rank-up messages', icon: Award, color: 'text-amber-400' },
    { label: 'Manage XP', href: '/admin/xp', desc: 'Configure daily check-in, weekly completion & milestone XP rewards', icon: Zap, color: 'text-yellow-400' },
    { label: 'Manage Achievements', href: '/admin/achievements', desc: 'Create, edit & reorder achievements and requirement types', icon: Trophy, color: 'text-emerald-400' },
    { label: 'Manage Goals', href: '/admin/goals', desc: 'Configure default, min & max weekly goal requirements and days', icon: Target, color: 'text-blue-400' },
    { label: 'App Settings', href: '/admin/settings', desc: 'App title, motivational text overrides & feature toggles', icon: Sliders, color: 'text-purple-400' },
    { label: 'Admin Security', href: '/admin/security', desc: 'Master Admin PIN, session timeouts & immutable security audit logs', icon: ShieldCheck, color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-gray-100">
            System Overview &amp; Telemetry
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time gamification performance &amp; database configuration
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-mono text-emerald-400 font-semibold">CMS Dynamic Mode Active</span>
        </div>
      </div>

      {/* 8 Overview Telemetry Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {OVERVIEW_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-2xl border ${card.border} ${card.bg} p-4 transition-transform hover:scale-[1.01]`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="text-2xl font-black tracking-tight text-white font-mono">
                {card.val}
              </div>
              <p className="mt-1 text-[11px] text-gray-400 truncate">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 font-mono">
          Administrative Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => sound.playClick()}
                className="group flex flex-col justify-between rounded-2xl border border-gray-800 bg-[#0f1422] p-5 hover:border-gray-700 hover:bg-gray-900/60 transition-all shadow-sm active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 border border-gray-800 shadow-sm">
                      <Icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-gray-100 group-hover:text-amber-400 transition-colors">
                    {action.label}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                    {action.desc}
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-amber-400/90 group-hover:text-amber-300">
                  <span>Configure</span>
                  <span className="ml-1">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Rank Distribution Breakdown */}
      <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 font-mono mb-4">
          Community Rank Distribution
        </h2>
        {Object.keys(aggregates.rankDistribution).length === 0 ? (
          <p className="text-xs text-gray-500 italic">No users recorded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(aggregates.rankDistribution).map(([rank, countVal]) => (
              <div
                key={rank}
                className="flex items-center justify-between rounded-xl border border-gray-800/80 bg-gray-950/60 px-3 py-2.5"
              >
                <span className="text-xs font-semibold text-gray-300">{rank}</span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {countVal} user{countVal !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
