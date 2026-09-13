'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, Delete, ArrowRight, CheckCircle2, User, UserPlus, LogIn } from 'lucide-react';
import { registerUserAction, loginUserAction } from '@/actions/authActions';
import { sound } from '@/lib/sound/sound';

interface PinAuthScreenProps {
  mode?: 'setup' | 'login';
  onAuthenticated: () => void;
}

export function PinAuthScreen({ mode: initialPropMode = 'login', onAuthenticated }: PinAuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    initialPropMode === 'setup' ? 'register' : 'login'
  );
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [registerStep, setRegisterStep] = useState<'details' | 'confirm'>('details');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load last remembered username
  useEffect(() => {
    try {
      const saved = localStorage.getItem('discipline_last_username');
      if (saved) {
        setUsername(saved);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const handleDigit = (digit: string) => {
    if (isLoading) return;
    sound.playClick();
    setError(null);

    if (activeTab === 'register' && registerStep === 'confirm') {
      if (confirmPin.length < 8) {
        setConfirmPin((prev) => prev + digit);
      }
    } else {
      if (pin.length < 8) {
        setPin((prev) => prev + digit);
      }
    }
  };

  const handleBackspace = () => {
    if (isLoading) return;
    sound.playClick();
    setError(null);
    if (activeTab === 'register' && registerStep === 'confirm') {
      setConfirmPin((prev) => prev.slice(0, -1));
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (isLoading) return;
    sound.playClick();
    setError(null);
    if (activeTab === 'register' && registerStep === 'confirm') {
      setConfirmPin('');
    } else {
      setPin('');
    }
  };

  const handleTabSwitch = (tab: 'login' | 'register') => {
    sound.playClick();
    setActiveTab(tab);
    setPin('');
    setConfirmPin('');
    setRegisterStep('details');
    setError(null);
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setError('Please enter a username');
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      setError('Username must be 3-20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setError('Username can only contain letters, numbers, & _');
      return;
    }

    if (activeTab === 'register') {
      if (registerStep === 'details') {
        if (pin.length < 4) {
          setError('PIN must be at least 4 digits');
          return;
        }
        setRegisterStep('confirm');
        return;
      }

      if (registerStep === 'confirm') {
        if (confirmPin !== pin) {
          setError('PINs do not match. Try again.');
          setConfirmPin('');
          return;
        }

        setIsLoading(true);
        const res = await registerUserAction(cleanUsername, pin);
        setIsLoading(false);
        if (res.success) {
          try {
            localStorage.setItem('discipline_last_username', cleanUsername);
          } catch {}
          sound.playSuccess();
          onAuthenticated();
        } else {
          setError(res.error || 'Failed to create account');
          setConfirmPin('');
          setRegisterStep('details');
        }
      }
    } else {
      // Login mode
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }

      setIsLoading(true);
      const res = await loginUserAction(cleanUsername, pin);
      setIsLoading(false);
      if (res.success) {
        try {
          localStorage.setItem('discipline_last_username', cleanUsername);
        } catch {}
        sound.playSuccess();
        onAuthenticated();
      } else {
        setError(res.error || 'Invalid username or PIN');
        setPin('');
      }
    }
  };

  const activePin = activeTab === 'register' && registerStep === 'confirm' ? confirmPin : pin;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#080b11] px-5 pt-safe pb-safe select-none">
      {/* Top Header & Branding */}
      <div className="flex flex-col items-center pt-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          {activeTab === 'register' ? (
            <Shield className="h-7 w-7 text-amber-400" />
          ) : (
            <Lock className="h-7 w-7 text-amber-400" />
          )}
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-wider text-gray-100 uppercase">
          Discipline
        </h1>
        <p className="mt-0.5 text-xs text-gray-400">
          Private Habit & Progression Tracker
        </p>

        {/* Tab Switcher: Log In vs Create Account */}
        <div className="mt-4 flex w-full max-w-xs items-center rounded-2xl border border-gray-800 bg-gray-950/60 p-1">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex flex-1 items-center justify-center space-x-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === 'login'
                ? 'bg-amber-500 text-gray-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Log In</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register')}
            className={`flex flex-1 items-center justify-center space-x-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === 'register'
                ? 'bg-amber-500 text-gray-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {/* Username & PIN Section */}
      <div className="w-full max-w-xs mx-auto my-3 space-y-3">
        {/* Username Input Field */}
        <div className="flex flex-col space-y-1">
          <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center justify-between">
            <span>Username</span>
            {activeTab === 'register' && (
              <span className="text-[10px] text-gray-500">3-20 chars</span>
            )}
          </label>
          <div className="relative flex items-center">
            <User className="absolute left-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              placeholder="e.g. warrior_99"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setError(null);
              }}
              disabled={isLoading || (activeTab === 'register' && registerStep === 'confirm')}
              className="w-full rounded-xl border border-gray-800 bg-[#0f1422] py-2.5 pl-9 pr-3 text-sm font-mono text-gray-100 placeholder-gray-600 outline-none transition-all focus:border-amber-500/80 focus:shadow-[0_0_12px_rgba(245,158,11,0.2)] disabled:opacity-60"
            />
          </div>
        </div>

        {/* PIN Prompt / Title */}
        <div className="text-center pt-1">
          <span className="text-xs font-semibold text-gray-300">
            {activeTab === 'register'
              ? registerStep === 'details'
                ? 'Create Your 4-8 Digit PIN'
                : 'Confirm Your PIN'
              : 'Enter Your Private PIN'}
          </span>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center space-x-2.5 py-1">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < activePin.length;
              return (
                <div
                  key={index}
                  className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                    isFilled
                      ? 'border-amber-400 bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                      : 'border-gray-700 bg-gray-900'
                  }`}
                />
              );
            })}
            {activePin.length > 4 && (
              <span className="text-xs font-mono text-amber-400 ml-1">
                +{activePin.length - 4}
              </span>
            )}
          </div>

          {error && (
            <div className="mt-2 text-center text-xs font-medium text-rose-400 bg-rose-950/50 border border-rose-900/60 rounded-lg px-3 py-1 animate-shake">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs mx-auto pb-4">
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-gray-900/80 border border-gray-800 text-xl font-bold text-gray-100 shadow-sm transition-all duration-100 hover:border-gray-700 active:scale-95 active:bg-amber-500/20 active:text-amber-300"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-gray-900/40 border border-gray-800/60 text-xs font-semibold text-gray-400 transition-all duration-100 active:scale-95 active:bg-gray-800"
          >
            CLEAR
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-gray-900/80 border border-gray-800 text-xl font-bold text-gray-100 shadow-sm transition-all duration-100 hover:border-gray-700 active:scale-95 active:bg-amber-500/20 active:text-amber-300"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-gray-900/40 border border-gray-800/60 text-gray-400 transition-all duration-100 active:scale-95 active:bg-gray-800 active:text-gray-200"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={!username.trim() || activePin.length < 4 || isLoading}
          onClick={handleSubmit}
          className="mt-3.5 flex h-13 w-full items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-gray-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-150 disabled:opacity-30 disabled:shadow-none active:scale-[0.98]"
        >
          {isLoading ? (
            <span className="text-sm">Verifying...</span>
          ) : (
            <>
              <span className="text-sm uppercase tracking-wider">
                {activeTab === 'register'
                  ? registerStep === 'details'
                    ? 'Next (Confirm PIN)'
                    : 'Create Account'
                  : 'Unlock Progression'}
              </span>
              {activeTab === 'register' && registerStep === 'details' ? (
                <ArrowRight className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
