'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Play, Pause, RotateCcw, ArrowLeft, Heart, CheckCircle, Wind } from 'lucide-react';

const ACTIONS = [
  { id: 'walk', label: 'Take a walk', emoji: '🚶', desc: 'Change your physical environment for 5 minutes.' },
  { id: 'water', label: 'Drink water', emoji: '💧', desc: 'Hydrate slowly. Focus on the temperature and sensation.' },
  { id: 'pushups', label: 'Do 15 push-ups', emoji: '🏋️', desc: 'Burn off immediate restlessness with exertion.' },
  { id: 'phone', label: 'Put phone away', emoji: '📵', desc: 'Place device face down in another room.' },
  { id: 'breathe', label: 'Box Breathing', emoji: '🫁', desc: 'Inhale 4s, Hold 4s, Exhale 4s, Hold 4s.' },
  { id: 'focus', label: 'Focus on 1 task', emoji: '🎯', desc: 'Pick one small tangible chore and do it immediately.' },
];

export default function UrgeEmergencyPage() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes
  const [isActive, setIsActive] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Pause'>('Inhale');

  // 5-minute countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsFinished(true);
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  // Breathing box timer cycle (4s each)
  useEffect(() => {
    if (selectedAction !== 'breathe') return;
    const cycle = ['Inhale', 'Hold', 'Exhale', 'Pause'] as const;
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % cycle.length;
      setBreathPhase(cycle[step]);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedAction]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = Math.round(((300 - secondsLeft) / 300) * 100);

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#080b11] text-gray-100 p-5 pt-safe pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-red-400 uppercase">
          <ShieldAlert className="h-4 w-4" />
          <span>5-Minute Pause</span>
        </div>

        <div className="w-10" />
      </div>

      {/* Main Center Area */}
      <div className="my-auto flex flex-col items-center text-center">
        {!isFinished ? (
          <>
            <h1 className="text-xl font-black uppercase tracking-wider text-gray-100">
              Take 5 Minutes
            </h1>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Create a pause between the urge and the action. Do not make any hasty decisions right now.
            </p>

            {/* Circular Timer Display */}
            <div className="relative my-6 flex h-48 w-48 items-center justify-center">
              {/* Outer SVG ring */}
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="stroke-gray-800/80"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="stroke-red-500 transition-all duration-500"
                  strokeWidth="6"
                  strokeDasharray={276}
                  strokeDashoffset={276 - (276 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center font-mono">
                <span className="text-4xl font-black text-gray-100 tracking-tight">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">
                  Remaining
                </span>
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className="flex h-11 items-center space-x-2 rounded-xl bg-gray-900 border border-gray-800 px-5 text-xs font-bold uppercase text-gray-200 active:scale-95"
              >
                {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isActive ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSecondsLeft(300);
                  setIsActive(true);
                  setIsFinished(false);
                }}
                aria-label="Reset Timer"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-400 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Breathing Animation overlay if selected */}
            {selectedAction === 'breathe' && (
              <div className="mt-6 flex flex-col items-center rounded-2xl bg-blue-950/40 border border-blue-800/60 p-5 w-full max-w-xs">
                <div className="flex items-center space-x-2 text-blue-400 mb-3">
                  <Wind className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Box Breathing</span>
                </div>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-500/20 border border-blue-400/40 animate-breathe">
                  <span className="text-xs font-bold font-mono text-blue-200 uppercase">
                    {breathPhase}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-blue-300">Inhale 4s • Hold 4s • Exhale 4s</p>
              </div>
            )}

            {/* Action Cards */}
            <div className="mt-6 w-full max-w-sm text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                Choose a physical distraction:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map((a) => {
                  const isSelected = selectedAction === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAction(isSelected ? null : a.id)}
                      className={`flex flex-col rounded-xl p-3 border text-left transition-all ${
                        isSelected
                          ? 'border-red-500/80 bg-red-950/40 shadow-sm'
                          : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{a.emoji}</span>
                        <span className="text-xs font-bold text-gray-200">{a.label}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400 line-clamp-2">{a.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Timer Finished Resolution State */
          <div className="flex flex-col items-center text-center p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-gray-100">
              Still feeling the urge?
            </h2>
            <p className="mt-2 text-xs text-gray-400 max-w-xs leading-relaxed">
              The pause created space between impulse and action. You are in control of your choices.
            </p>

            <div className="mt-8 flex w-full max-w-xs flex-col space-y-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 font-extrabold uppercase tracking-wider text-gray-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"
              >
                I&apos;m Good (Return to Home)
              </button>

              <button
                type="button"
                onClick={() => {
                  setSecondsLeft(300);
                  setIsActive(true);
                  setIsFinished(false);
                }}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-gray-900 border border-gray-800 text-xs font-bold uppercase text-gray-300 hover:border-gray-700 active:scale-95"
              >
                Need another 5 minutes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Non-Medical Disclaimer Footer */}
      <footer className="pt-4 text-center">
        <div className="flex items-center justify-center space-x-1 text-[10px] text-gray-400 max-w-xs mx-auto">
          <Heart className="h-3 w-3 text-red-500/70" />
          <span>Non-medical tool. Designed for pause, self-control, and mindfulness.</span>
        </div>
      </footer>
    </div>
  );
}
