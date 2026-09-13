'use client';

import { useState } from 'react';
import { Shield, Lock, Delete, ArrowRight, CheckCircle2 } from 'lucide-react';
import { setupPinAction, loginWithPinAction } from '@/actions/authActions';

interface PinAuthScreenProps {
  mode: 'setup' | 'login';
  onAuthenticated: () => void;
}

export function PinAuthScreen({ mode, onAuthenticated }: PinAuthScreenProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter_pin' | 'confirm_pin'>('enter_pin');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (isLoading) return;
    setError(null);

    if (mode === 'setup' && step === 'confirm_pin') {
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
    setError(null);
    if (mode === 'setup' && step === 'confirm_pin') {
      setConfirmPin((prev) => prev.slice(0, -1));
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (isLoading) return;
    setError(null);
    if (mode === 'setup' && step === 'confirm_pin') {
      setConfirmPin('');
    } else {
      setPin('');
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;

    if (mode === 'setup') {
      if (step === 'enter_pin') {
        if (pin.length < 4) {
          setError('PIN must be at least 4 digits');
          return;
        }
        setStep('confirm_pin');
        return;
      }

      if (step === 'confirm_pin') {
        if (confirmPin !== pin) {
          setError('PINs do not match. Try again.');
          setConfirmPin('');
          return;
        }

        setIsLoading(true);
        const res = await setupPinAction(pin);
        setIsLoading(false);
        if (res.success) {
          onAuthenticated();
        } else {
          setError(res.error || 'Failed to create account');
        }
      }
    } else {
      // Login mode
      if (pin.length < 4) {
        setError('Enter at least 4 digits');
        return;
      }

      setIsLoading(true);
      const res = await loginWithPinAction(pin);
      setIsLoading(false);
      if (res.success) {
        onAuthenticated();
      } else {
        setError(res.error || 'Invalid PIN');
        setPin('');
      }
    }
  };

  const activeInput = mode === 'setup' && step === 'confirm_pin' ? confirmPin : pin;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#080b11] px-6 pt-safe pb-safe select-none">
      {/* Top Header & Branding */}
      <div className="flex flex-col items-center pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          {mode === 'setup' ? (
            <Shield className="h-8 w-8 text-amber-400" />
          ) : (
            <Lock className="h-8 w-8 text-amber-400" />
          )}
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-wider text-gray-100 uppercase">
          {mode === 'setup'
            ? step === 'enter_pin'
              ? 'Create Master PIN'
              : 'Confirm Master PIN'
            : 'Discipline'}
        </h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xs">
          {mode === 'setup'
            ? step === 'enter_pin'
              ? 'Your private key to habit progression. Stored securely.'
              : 'Re-enter your PIN to ensure accuracy.'
            : 'Enter your private PIN to access your progression.'}
        </p>
      </div>

      {/* PIN Dots Indicator */}
      <div className="flex flex-col items-center my-6">
        <div className="flex items-center justify-center space-x-3 py-4">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < activeInput.length;
            return (
              <div
                key={index}
                className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'border-amber-400 bg-amber-400 shadow-[0_0_10px_#f59e0b]'
                    : 'border-gray-700 bg-gray-900'
                }`}
              />
            );
          })}
          {activeInput.length > 4 && (
            <span className="text-xs font-mono text-amber-400 ml-2">
              +{activeInput.length - 4}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-2 text-center text-xs font-medium text-rose-400 bg-rose-950/50 border border-rose-900/60 rounded-lg px-3 py-1.5 animate-shake">
            {error}
          </div>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs mx-auto pb-4">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-16 w-full items-center justify-center rounded-2xl bg-gray-900/80 border border-gray-800 text-2xl font-bold text-gray-100 shadow-sm transition-all duration-100 hover:border-gray-700 active:scale-95 active:bg-amber-500/20 active:text-amber-300"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-gray-900/40 border border-gray-800/60 text-xs font-semibold text-gray-400 transition-all duration-100 active:scale-95 active:bg-gray-800"
          >
            CLEAR
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-gray-900/80 border border-gray-800 text-2xl font-bold text-gray-100 shadow-sm transition-all duration-100 hover:border-gray-700 active:scale-95 active:bg-amber-500/20 active:text-amber-300"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete"
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-gray-900/40 border border-gray-800/60 text-gray-400 transition-all duration-100 active:scale-95 active:bg-gray-800 active:text-gray-200"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={activeInput.length < 4 || isLoading}
          onClick={handleSubmit}
          className="mt-5 flex h-14 w-full items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-gray-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-150 disabled:opacity-30 disabled:shadow-none active:scale-[0.98]"
        >
          {isLoading ? (
            <span className="text-sm">Verifying...</span>
          ) : (
            <>
              <span className="text-sm uppercase tracking-wider">
                {mode === 'setup' && step === 'enter_pin' ? 'Next' : 'Unlock'}
              </span>
              {mode === 'setup' && step === 'enter_pin' ? (
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
