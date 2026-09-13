'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAdminAchievementsAction,
  saveAchievementAction,
  deleteAchievementAction,
  reorderAchievementsAction,
} from '@/actions/adminActions';
import { AchievementDefinition } from '@/lib/gamification/achievements';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { sound } from '@/lib/sound/sound';

const REQUIREMENT_TYPES = [
  { id: 'streak', label: 'Current Streak (Days)', placeholder: 'e.g. 7' },
  { id: 'longest_streak', label: 'Longest Streak (Days)', placeholder: 'e.g. 30' },
  { id: 'total_days', label: 'Total Successful Days', placeholder: 'e.g. 100' },
  { id: 'weekly_goals', label: 'Weekly Goals Completed', placeholder: 'e.g. 4' },
  { id: 'total_xp', label: 'Total XP Earned', placeholder: 'e.g. 5000' },
  { id: 'rank', label: 'Rank Reached', placeholder: 'e.g. Chad, Hercules, Legend' },
];

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalAch, setModalAch] = useState<Partial<AchievementDefinition>>({
    id: '',
    name: '',
    description: '',
    icon: '🏆',
    requirementType: 'streak',
    requirementValue: '7',
    xpReward: 50,
    displayOrder: 1,
    enabled: true,
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const res = await getAdminAchievementsAction();
    if (res.success && res.data) {
      setAchievements(res.data);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenCreate = () => {
    sound.playClick();
    setIsEditing(false);
    setModalError(null);
    setModalAch({
      id: '',
      name: '',
      description: '',
      icon: '🏆',
      requirementType: 'streak',
      requirementValue: '7',
      xpReward: 50,
      displayOrder: achievements.length + 1,
      enabled: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (ach: AchievementDefinition) => {
    sound.playClick();
    setIsEditing(true);
    setModalError(null);
    setModalAch({ ...ach });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete achievement "${name}"?`)) return;
    sound.playClick();
    const res = await deleteAchievementAction(id);
    if (res.success) {
      showSuccess(`Achievement "${name}" deleted.`);
      await loadData();
    } else {
      setError(res.error || 'Failed to delete achievement');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    sound.playClick();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= achievements.length) return;

    const newAchs = [...achievements];
    const temp = newAchs[index];
    newAchs[index] = newAchs[targetIdx];
    newAchs[targetIdx] = temp;

    setAchievements(newAchs);
    const ids = newAchs.map((a) => a.id);
    const res = await reorderAchievementsAction(ids);
    if (res.success) {
      showSuccess('Achievement order updated.');
    } else {
      await loadData();
    }
  };

  const handleToggleEnabled = async (ach: AchievementDefinition) => {
    sound.playClick();
    const updated = { ...ach, enabled: ach.enabled === false };
    const res = await saveAchievementAction(updated);
    if (res.success) {
      showSuccess(`Achievement "${ach.name}" ${updated.enabled ? 'enabled' : 'disabled'}.`);
      await loadData();
    } else {
      setError(res.error || 'Failed to update status.');
    }
  };

  const handleSaveAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalAch.name || modalAch.name.trim() === '') {
      setModalError('Achievement name is required.');
      return;
    }
    if (!modalAch.requirementValue || modalAch.requirementValue.trim() === '') {
      setModalError('Requirement value is required.');
      return;
    }
    if (modalAch.xpReward === undefined || modalAch.xpReward < 0) {
      setModalError('XP reward must be 0 or higher.');
      return;
    }

    const achId = isEditing && modalAch.id
      ? modalAch.id
      : modalAch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    sound.playClick();
    setIsSubmitting(true);
    const res = await saveAchievementAction({
      ...modalAch,
      id: achId,
      displayOrder: modalAch.displayOrder ?? achievements.length + 1,
      enabled: modalAch.enabled ?? true,
    } as AchievementDefinition);
    setIsSubmitting(false);

    if (res.success) {
      sound.playSuccess();
      setShowModal(false);
      showSuccess(`Achievement "${modalAch.name}" saved successfully.`);
      await loadData();
    } else {
      setModalError(res.error || 'Failed to save achievement.');
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 rounded-xl border border-emerald-500/50 bg-emerald-950 px-4 py-3 text-sm text-emerald-200 shadow-2xl animate-in slide-in-from-bottom">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-gray-100">
            Achievement &amp; Badge Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Create trophies, configure requirements (streak, days, weeks, XP, rank) and rewards
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-all uppercase tracking-wider active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Achievement</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-800 bg-[#0f1422] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-950/50 text-[11px] font-mono uppercase tracking-wider text-gray-400">
              <tr>
                <th className="py-3.5 pl-4 pr-2">Order</th>
                <th className="px-3 py-3.5">Icon</th>
                <th className="px-3 py-3.5">Achievement</th>
                <th className="px-3 py-3.5">Condition</th>
                <th className="px-3 py-3.5">XP Reward</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="py-3.5 pl-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-sans">
              {achievements.map((ach, idx) => (
                <tr
                  key={ach.id}
                  className={`hover:bg-gray-900/30 transition-colors ${
                    ach.enabled === false ? 'opacity-50' : ''
                  }`}
                >
                  <td className="py-3 pl-4 pr-2 font-mono text-xs font-bold text-gray-500">
                    <div className="flex items-center space-x-1">
                      <span>#{ach.displayOrder ?? idx + 1}</span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveOrder(idx, 'up')}
                          className="text-gray-500 hover:text-white disabled:opacity-20"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === achievements.length - 1}
                          onClick={() => handleMoveOrder(idx, 'down')}
                          className="text-gray-500 hover:text-white disabled:opacity-20"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 border border-gray-800 text-lg">
                      {ach.icon || '🏆'}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-bold text-white tracking-wide">{ach.name}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{ach.description}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    <span className="rounded bg-gray-900 border border-gray-800 px-2 py-1 text-gray-300">
                      {ach.requirementType}: {ach.requirementValue}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-amber-400">
                    +{ach.xpReward} XP
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(ach)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-bold border transition-colors ${
                        ach.enabled !== false
                          ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {ach.enabled !== false ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ach)}
                        className="rounded-lg border border-gray-800 p-1.5 text-gray-400 hover:border-gray-700 hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ach.id, ach.name)}
                        className="rounded-lg border border-gray-800 p-1.5 text-rose-400 hover:border-rose-900 hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-800 bg-[#0f1422] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-5">
              <h2 className="text-lg font-black tracking-wide text-white uppercase">
                {isEditing ? `Edit: ${modalAch.name}` : 'Create Achievement'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 flex items-center space-x-2 rounded-xl border border-rose-800 bg-rose-950/50 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAchievement} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                  Achievement Name
                </label>
                <input
                  type="text"
                  value={modalAch.name || ''}
                  onChange={(e) => setModalAch({ ...modalAch, name: e.target.value })}
                  placeholder="e.g. Century Slayer"
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={modalAch.description || ''}
                  onChange={(e) => setModalAch({ ...modalAch, description: e.target.value })}
                  placeholder="e.g. Reach 100 consecutive successful days"
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                    Icon / Emoji
                  </label>
                  <input
                    type="text"
                    value={modalAch.icon || ''}
                    onChange={(e) => setModalAch({ ...modalAch, icon: e.target.value })}
                    placeholder="🏆 or ⚔️"
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-center text-lg focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                    XP Reward
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={modalAch.xpReward ?? 50}
                    onChange={(e) =>
                      setModalAch({ ...modalAch, xpReward: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 font-mono text-sm text-amber-400 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                    Requirement Type
                  </label>
                  <select
                    value={modalAch.requirementType || 'streak'}
                    onChange={(e) =>
                      setModalAch({
                        ...modalAch,
                        requirementType: e.target.value as AchievementDefinition['requirementType'],
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-200 focus:border-amber-500 focus:outline-none"
                  >
                    {REQUIREMENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                    Requirement Value
                  </label>
                  <input
                    type="text"
                    value={modalAch.requirementValue || ''}
                    onChange={(e) => setModalAch({ ...modalAch, requirementValue: e.target.value })}
                    placeholder="e.g. 30"
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 font-mono text-xs text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="achEnabled"
                  checked={modalAch.enabled !== false}
                  onChange={(e) => setModalAch({ ...modalAch, enabled: e.target.checked })}
                  className="h-4 w-4 accent-amber-500 rounded"
                />
                <label htmlFor="achEnabled" className="text-xs font-semibold text-gray-300">
                  Achievement Unlocked &amp; Available in Badges
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-800 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-black shadow-md hover:bg-amber-400 uppercase tracking-wider disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Achievement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
