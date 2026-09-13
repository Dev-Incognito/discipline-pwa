'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { checkAdminAuthState, verifyAdminPinAction } from '@/actions/adminActions';
import { AdminNav } from '@/components/admin/AdminNav';
import { ShieldAlert, AlertCircle } from 'lucide-react';
import { sound } from '@/lib/sound/sound';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    const res = await checkAdminAuthState();
    setIsAuthenticated(res.isAuthenticated);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin) return;

    sound.playClick();
    setIsLoading(true);
    const res = await verifyAdminPinAction(pin);
    setIsLoading(false);

    if (res.success) {
      sound.playSuccess();
      setIsAuthenticated(true);
    } else {
      setError(res.error || 'Invalid Admin PIN');
      setPin('');
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b11] text-gray-400">
        <div className="flex items-center space-x-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs font-mono tracking-widest uppercase">Verifying Admin Access...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, show PIN gate
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b11] p-4">
        <div className="w-full max-w-sm rounded-3xl border border-gray-800 bg-[#0f1422] p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <ShieldAlert className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-extrabold tracking-wider text-gray-100 uppercase">
              Admin CMS Portal
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              Enter master administrator PIN to configure system
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={10}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-amber-400 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
              </div>
              {error && (
                <div className="mt-2 flex items-center space-x-1.5 text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || pin.length < 4}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50 uppercase"
            >
              {isLoading ? 'Verifying...' : 'Unlock CMS'}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-800/80 pt-4 text-center">
            <span className="text-[11px] text-gray-500 font-mono">Default Dev PIN: 9999</span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated: Render Desktop Sidebar + CMS Content Area
  return (
    <div className="min-h-screen bg-[#080b11] text-gray-100 flex flex-col">
      <AdminNav />
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
