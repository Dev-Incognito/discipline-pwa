'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  changeAdminPinAction,
  getAdminAuditLogsAction,
  getAppSettingsAction,
  updateAppSettingsAction,
} from '@/actions/adminActions';
import {
  Key,
  History,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { sound } from '@/lib/sound/sound';

export default function AdminSecurityPage() {
  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Session timeout state
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(60);
  const [timeoutSaving, setTimeoutSaving] = useState(false);

  // Audit logs state
  const [logs, setLogs] = useState<Array<{
    id: string;
    adminAction: string;
    timestamp: string | Date;
    metadata?: Record<string, unknown> | null;
  }>>([]);

  const loadData = useCallback(async () => {
    const [settingsRes, logsRes] = await Promise.all([
      getAppSettingsAction(),
      getAdminAuditLogsAction(50),
    ]);

    if (settingsRes.success && settingsRes.data) {
      setTimeoutMinutes(Number(settingsRes.data.admin_session_timeout || 60));
    }
    if (logsRes.success && logsRes.data) {
      setLogs(logsRes.data as Array<{
        id: string;
        adminAction: string;
        timestamp: string | Date;
        metadata?: Record<string, unknown> | null;
      }>);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (newPin.length < 4) {
      setPinError('New PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation PIN do not match.');
      return;
    }

    sound.playClick();
    setIsChangingPin(true);
    const res = await changeAdminPinAction(currentPin, newPin);
    setIsChangingPin(false);

    if (res.success) {
      sound.playSuccess();
      setPinSuccess('Master Admin PIN successfully updated and rehashed.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      await loadData();
    } else {
      setPinError(res.error || 'Failed to update PIN.');
    }
  };

  const handleSaveTimeout = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setTimeoutSaving(true);
    await updateAppSettingsAction({ admin_session_timeout: String(timeoutMinutes) });
    setTimeoutSaving(false);
    sound.playSuccess();
    await loadData();
  };

  const failedLogins = logs.filter((l) => l.adminAction === 'FAILED_ADMIN_LOGIN_ATTEMPT');

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b border-gray-800 pb-5">
        <h1 className="text-2xl font-black uppercase tracking-wider text-gray-100">
          Admin Security &amp; Audit Logs
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Master administrative PIN hashing, session expiration policy, and immutable security audit log.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change PIN Box */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Key className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Change Master Admin PIN
            </h2>
          </div>

          <p className="text-xs text-gray-400">
            Admin PIN is cryptographically hashed with bcrypt (cost 10). Changing it requires your current PIN.
          </p>

          {pinError && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-800 bg-rose-950/50 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {pinSuccess && (
            <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/50 bg-emerald-950 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{pinSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-3">
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                Current Admin PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Current PIN"
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm font-mono tracking-widest text-white focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                  New Admin PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="New PIN"
                  className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm font-mono tracking-widest text-amber-400 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirm PIN"
                  className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm font-mono tracking-widest text-amber-400 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPin || !currentPin || !newPin}
              className="mt-2 w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-all uppercase tracking-wider disabled:opacity-50"
            >
              {isChangingPin ? 'Updating PIN Hash...' : 'Update Admin PIN'}
            </button>
          </form>
        </div>

        {/* Security Policy & Failed Attempts */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
              <Clock className="h-5 w-5 text-blue-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                Session Expiration Policy
              </h2>
            </div>

            <form onSubmit={handleSaveTimeout} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400 block mb-1">
                  Inactivity Timeout (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={timeoutMinutes}
                  onChange={(e) => setTimeoutMinutes(parseInt(e.target.value, 10) || 60)}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm font-mono text-white focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Admin session token cookie automatically expires after this window.
                </span>
              </div>
              <button
                type="submit"
                disabled={timeoutSaving}
                className="rounded-xl border border-gray-800 px-4 py-2 text-xs font-bold text-gray-300 hover:text-white hover:border-gray-700"
              >
                {timeoutSaving ? 'Saving...' : 'Save Policy'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-200 block uppercase tracking-wide">
                  Recent Failed Login Attempts
                </span>
                <span className="text-[11px] text-gray-400">Brute-force lockout triggers at 5 failed tries</span>
              </div>
              <span className={`font-mono text-lg font-bold ${failedLogins.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {failedLogins.length} recorded
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="rounded-2xl border border-gray-800 bg-[#0f1422] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              System Audit Logs
            </h2>
          </div>
          <span className="text-xs font-mono text-gray-500">{logs.length} entries</span>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-4">No audit logs recorded yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-800/60 font-mono text-xs">
            {logs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.adminAction.includes('FAILED')
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      : log.adminAction.includes('PIN')
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                      : 'bg-gray-900 text-gray-300 border border-gray-800'
                  }`}>
                    {log.adminAction}
                  </span>
                  {log.metadata && (
                    <span className="text-[11px] text-gray-400 truncate max-w-sm">
                      {JSON.stringify(log.metadata)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
