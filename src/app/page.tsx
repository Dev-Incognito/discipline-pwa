'use client';

import { useState, useEffect, useCallback } from 'react';
import { checkAuthState, AuthStateResponse } from '@/actions/authActions';
import { getDashboardAction } from '@/actions/checkinActions';
import { PinAuthScreen } from '@/components/auth/PinAuthScreen';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { StreakHero } from '@/components/dashboard/StreakHero';
import { CheckinButton } from '@/components/dashboard/CheckinButton';
import { WeeklyProgressCard } from '@/components/dashboard/WeeklyProgressCard';
import { UrgePromptCard } from '@/components/dashboard/UrgePromptCard';
import { CheckinModal } from '@/components/dashboard/CheckinModal';
import { RankUpModal } from '@/components/celebration/RankUpModal';
import { CheckinResult } from '@/services/dataService';
import { RankDefinition } from '@/lib/gamification/ranks';
import { Loader2 } from 'lucide-react';

interface DashboardData {
  user: {
    id: string;
    currentXp: number;
    currentStreak: number;
    longestStreak: number;
    totalSuccessfulDays: number;
    currentRank: string;
    weeklyGoal: number;
  };
  rankInfo: {
    currentRank: {
      name: string;
      minXp: number;
      icon: string;
      logoUrl?: string | null;
      description: string;
      badgeColor: string;
      glowColor: string;
      rankUpMessage?: string;
      celebrationVideoUrl?: string | null;
    };
    nextRank: {
      name: string;
      minXp: number;
      icon: string;
      logoUrl?: string | null;
      description: string;
      badgeColor: string;
      glowColor: string;
    } | null;
    currentXp: number;
    xpInCurrentTier: number;
    xpNeededForNext: number;
    tierTotalXp: number;
    progressPercent: number;
  };
  appSettings?: Record<string, string>;
  isTodayCheckedIn: boolean;
  todayMood: string | null;
  todayJournal: string | null;
  weeklyStatus: {
    weekStart: string;
    days: Array<{
      date: string;
      dayName: string;
      dayLetter: string;
      completed: boolean;
      isToday: boolean;
      isPast: boolean;
      isFuture: boolean;
    }>;
    completedCount: number;
    weeklyGoal: number;
    goalMet: boolean;
    bonusAwarded: boolean;
    bonusXp: number;
  };
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HomePage() {
  const [authState, setAuthState] = useState<AuthStateResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [latestResult, setLatestResult] = useState<CheckinResult | null>(null);
  const [rankUpModal, setRankUpModal] = useState<{
    isOpen: boolean;
    rank?: RankDefinition | null;
    message?: string;
    videoUrl?: string | null;
  }>({ isOpen: false });

  const todayDate = getTodayString();

  const loadDashboard = useCallback(async () => {
    try {
      const res = await getDashboardAction(todayDate);
      if (res.success && res.data) {
        setDashboardData(res.data as unknown as DashboardData);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  }, [todayDate]);

  const loadAuthAndData = useCallback(async () => {
    setIsLoading(true);
    try {
      const auth = await checkAuthState();
      setAuthState(auth);
      if (auth.isAuthenticated) {
        await loadDashboard();
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadDashboard]);

  useEffect(() => {
    loadAuthAndData();
  }, [loadAuthAndData]);

  const handleCheckinSuccess = (result: CheckinResult) => {
    setLatestResult(result);
    if (result.didRankUp) {
      setRankUpModal({
        isOpen: true,
        rank: result.newRankDetails,
        message: result.rankUpMessage,
        videoUrl: result.celebrationVideoUrl,
      });
    } else {
      setIsModalOpen(true);
    }
    loadDashboard();
  };

  const handleSaveReflection = (mood: 'difficult' | 'normal' | 'easy' | null, note: string) => {
    if (dashboardData) {
      setDashboardData({
        ...dashboardData,
        todayMood: mood,
        todayJournal: note,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b11]">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="text-xs font-mono tracking-widest text-gray-400 uppercase">
            LOADING DISCIPLINE...
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated: render PIN screen
  if (!authState?.isAuthenticated) {
    return (
      <PinAuthScreen
        onAuthenticated={loadAuthAndData}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#080b11] text-gray-100 pb-safe-nav">
      {/* Header */}
      <Header
        currentRank={dashboardData?.rankInfo?.currentRank?.name || 'Beginner'}
        username={authState?.username}
      />

      {/* Main Content Scroll Area */}
      <main className="flex-1 space-y-4 px-4 py-4">
        {dashboardData && (
          <>
            {/* Streak & Rank Hero Card */}
            <StreakHero
              currentStreak={dashboardData.user.currentStreak}
              longestStreak={dashboardData.user.longestStreak}
              totalSuccessfulDays={dashboardData.user.totalSuccessfulDays}
              rankInfo={dashboardData.rankInfo}
              streakResetMessage={dashboardData.appSettings?.streak_reset_message}
            />

            {/* Daily Tactile Check-In Button */}
            <CheckinButton
              todayDate={todayDate}
              isCompleted={dashboardData.isTodayCheckedIn}
              todayMood={dashboardData.todayMood}
              onCheckinSuccess={handleCheckinSuccess}
              onOpenReflectionModal={() => setIsModalOpen(true)}
            />

            {/* Weekly Progress Card (Mon-Sun) */}
            <WeeklyProgressCard weeklyStatus={dashboardData.weeklyStatus} />

            {/* Emergency Urge Tool Access */}
            <UrgePromptCard />
          </>
        )}
      </main>

      {/* Rank-Up Celebration Modal with Video & Fanfare */}
      <RankUpModal
        isOpen={rankUpModal.isOpen}
        onClose={() => {
          setRankUpModal({ isOpen: false });
          setIsModalOpen(true);
        }}
        newRank={rankUpModal.rank}
        rankUpMessage={rankUpModal.message}
        videoUrl={rankUpModal.videoUrl}
      />

      {/* Post-Checkin Modal */}
      {dashboardData && (
        <CheckinModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setLatestResult(null);
          }}
          todayDate={todayDate}
          checkinResult={latestResult}
          initialMood={dashboardData.todayMood}
          initialJournal={dashboardData.todayJournal}
          successMessage={dashboardData.appSettings?.checkin_success_message}
          onSaveReflection={handleSaveReflection}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
