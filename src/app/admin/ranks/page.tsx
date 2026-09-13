'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAdminRanksAction,
  saveRankAction,
  deleteRankAction,
  reorderRanksAction,
  getAvailableRankLogosAction,
  saveRawRanksJsonAction,
} from '@/actions/adminActions';
import { RankDefinition } from '@/lib/gamification/ranks';
import { RankPreviewCard } from '@/components/admin/RankPreviewCard';
import { RawJsonEditorModal } from '@/components/admin/RawJsonEditorModal';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  X,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import Image from 'next/image';
import { sound } from '@/lib/sound/sound';

export default function AdminRanksPage() {
  const [ranks, setRanks] = useState<RankDefinition[]>([]);
  const [availableLogos, setAvailableLogos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  // Edit / Create Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalRank, setModalRank] = useState<Partial<RankDefinition>>({
    name: '',
    minXp: 0,
    icon: '⚔️',
    logoUrl: null,
    description: '',
    badgeColor: 'text-zinc-400 bg-zinc-800/80 border-zinc-700',
    glowColor: 'shadow-zinc-500/20',
    rankUpMessage: '',
    celebrationVideoUrl: null,
    enabled: true,
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const [ranksRes, logosRes] = await Promise.all([
      getAdminRanksAction(),
      getAvailableRankLogosAction(),
    ]);

    if (ranksRes.success && ranksRes.data) {
      setRanks(ranksRes.data);
    }
    if (logosRes.success && logosRes.logos) {
      setAvailableLogos(logosRes.logos);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleOpenCreate = () => {
    sound.playClick();
    setIsEditing(false);
    setModalError(null);
    const nextOrder = ranks.length + 1;
    const lastMinXp = ranks.length > 0 ? Math.max(...ranks.map((r) => r.minXp)) : 0;
    setModalRank({
      name: '',
      description: '',
      icon: '🏆',
      logoUrl: null,
      minXp: lastMinXp + 500,
      displayOrder: nextOrder,
      enabled: true,
      badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-700',
      glowColor: 'shadow-amber-500/20',
      rankUpMessage: 'Elite consistency unlocked.',
      celebrationVideoUrl: null,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rank: RankDefinition) => {
    sound.playClick();
    setIsEditing(true);
    setModalError(null);
    setModalRank({ ...rank });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete rank "${name}"? This action cannot be undone.`)) {
      return;
    }
    sound.playClick();
    const res = await deleteRankAction(id);
    if (res.success) {
      showSuccess(`Rank "${name}" deleted.`);
      await loadData();
    } else {
      setError(res.error || 'Failed to delete rank');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    sound.playClick();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ranks.length) return;

    const newRanks = [...ranks];
    const temp = newRanks[index];
    newRanks[index] = newRanks[targetIdx];
    newRanks[targetIdx] = temp;

    setRanks(newRanks);
    const orderedIds = newRanks.map((r) => r.id!).filter(Boolean);
    const res = await reorderRanksAction(orderedIds);
    if (res.success) {
      showSuccess('Rank order updated.');
    } else {
      await loadData();
    }
  };

  const handleToggleEnabled = async (rank: RankDefinition) => {
    sound.playClick();
    const updated: RankDefinition = { ...rank, enabled: !rank.enabled };
    const res = await saveRankAction(updated);
    if (res.success) {
      showSuccess(`Rank "${rank.name}" ${updated.enabled ? 'enabled' : 'disabled'}.`);
      await loadData();
    } else {
      setError(res.error || 'Failed to update rank status.');
    }
  };

  const handleSaveRank = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalRank.name || modalRank.name.trim() === '') {
      setModalError('Please enter a rank name.');
      return;
    }
    if (modalRank.minXp === undefined || modalRank.minXp < 0) {
      setModalError('Minimum XP must be 0 or higher.');
      return;
    }

    sound.playClick();
    setIsSubmitting(true);
    const rankPayload = {
      ...modalRank,
      name: modalRank.name,
      minXp: modalRank.minXp,
      description: modalRank.description || '',
      icon: modalRank.icon || '⚔️',
    };
    const res = await saveRankAction(rankPayload);
    setIsSubmitting(false);

    if (res.success) {
      sound.playSuccess();
      setShowModal(false);
      showSuccess(`Rank "${modalRank.name}" saved successfully.`);
      await loadData();
    } else {
      setModalError(res.error || 'Failed to save rank.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 rounded-xl border border-emerald-500/50 bg-emerald-950 px-4 py-3 text-sm text-emerald-200 shadow-2xl animate-in slide-in-from-bottom">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-gray-100">
            Rank Ladder Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure dynamic progression ranks, XP thresholds, custom logos &amp; celebratory rank-up messages
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowJsonModal(true);
            }}
            className="inline-flex items-center space-x-2 rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-xs font-bold text-gray-200 hover:bg-gray-700 hover:text-white transition-all uppercase tracking-wider active:scale-95"
          >
            <Code2 className="h-4 w-4 text-amber-400" />
            <span>Raw JSON</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-all uppercase tracking-wider active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Rank</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Ranks Table */}
      <div className="rounded-2xl border border-gray-800 bg-[#0f1422] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-950/50 text-[11px] font-mono uppercase tracking-wider text-gray-400">
              <tr>
                <th className="py-3.5 pl-4 pr-2">Order</th>
                <th className="px-3 py-3.5">Logo / Icon</th>
                <th className="px-3 py-3.5">Rank Name</th>
                <th className="px-3 py-3.5">Min XP</th>
                <th className="px-3 py-3.5 hidden md:table-cell">Description</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="py-3.5 pl-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-sans">
              {ranks.map((rank, idx) => (
                <tr
                  key={rank.id || rank.name}
                  className={`hover:bg-gray-900/30 transition-colors ${
                    rank.enabled === false ? 'opacity-50' : ''
                  }`}
                >
                  <td className="py-3 pl-4 pr-2 font-mono text-xs font-bold text-gray-500">
                    <div className="flex items-center space-x-1">
                      <span>#{rank.displayOrder ?? idx + 1}</span>
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
                          disabled={idx === ranks.length - 1}
                          onClick={() => handleMoveOrder(idx, 'down')}
                          className="text-gray-500 hover:text-white disabled:opacity-20"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 border border-gray-800">
                      {rank.logoUrl ? (
                        <div className="relative h-7 w-7">
                          <Image
                            src={rank.logoUrl}
                            alt={rank.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <span className="text-xl">{rank.icon || '⚔️'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-bold text-white uppercase tracking-wide">
                    {rank.name}
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold text-amber-400">
                    {rank.minXp.toLocaleString()} XP
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400 hidden md:table-cell max-w-xs truncate">
                    {rank.description}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(rank)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-bold border transition-colors ${
                        rank.enabled !== false
                          ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {rank.enabled !== false ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rank)}
                        className="rounded-lg border border-gray-800 p-1.5 text-gray-400 hover:border-gray-700 hover:text-white transition-colors"
                        title="Edit Rank"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={rank.minXp === 0 || rank.displayOrder === 1}
                        onClick={() => handleDelete(rank.id!, rank.name)}
                        className="rounded-lg border border-gray-800 p-1.5 text-rose-400 hover:border-rose-900 hover:bg-rose-950/30 transition-colors disabled:opacity-20"
                        title={rank.minXp === 0 ? 'Cannot delete 0 XP base rank' : 'Delete Rank'}
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

      {/* Edit / Create Rank Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-gray-800 bg-[#0f1422] p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-5">
              <h2 className="text-lg font-black tracking-wide text-white uppercase">
                {isEditing ? `Edit Rank: ${modalRank.name}` : 'Create New Rank'}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Column */}
              <form onSubmit={handleSaveRank} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                    Rank Name
                  </label>
                  <input
                    type="text"
                    value={modalRank.name || ''}
                    onChange={(e) => setModalRank({ ...modalRank, name: e.target.value })}
                    placeholder="e.g. Sigma, Titan, Immortal"
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                      Min XP
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={modalRank.minXp ?? 0}
                      onChange={(e) =>
                        setModalRank({ ...modalRank, minXp: parseInt(e.target.value, 10) || 0 })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm font-mono text-amber-400 focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                      Icon / Emoji
                    </label>
                    <input
                      type="text"
                      value={modalRank.icon || ''}
                      onChange={(e) => setModalRank({ ...modalRank, icon: e.target.value })}
                      placeholder="🗿 or ⚔️"
                      className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-center text-base focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                    Custom Rank Logo
                  </label>
                  <input
                    type="text"
                    value={modalRank.logoUrl || ''}
                    onChange={(e) => setModalRank({ ...modalRank, logoUrl: e.target.value || null })}
                    placeholder="/ranks/filename.png or image URL"
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-mono text-gray-300 focus:border-amber-500 focus:outline-none"
                  />

                  {/* Preloaded Folder Images Picker */}
                  {availableLogos.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-gray-500 font-mono block mb-1">
                        Select from public/ranks/ folder:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-950/60 rounded-xl border border-gray-800/80">
                        {availableLogos.map((logoPath) => (
                          <button
                            key={logoPath}
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setModalRank({ ...modalRank, logoUrl: logoPath });
                            }}
                            className={`flex items-center space-x-1 rounded-lg border px-2 py-1 text-[11px] font-mono transition-all ${
                              modalRank.logoUrl === logoPath
                                ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                                : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-white'
                            }`}
                          >
                            <div className="relative h-3.5 w-3.5">
                              <Image src={logoPath} alt="logo" fill className="object-contain" unoptimized />
                            </div>
                            <span>{logoPath.replace('/ranks/', '')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={modalRank.description || ''}
                    onChange={(e) => setModalRank({ ...modalRank, description: e.target.value })}
                    placeholder="Short motivational lore for this rank"
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                    Custom Rank-Up Message
                  </label>
                  <input
                    type="text"
                    value={modalRank.rankUpMessage || ''}
                    onChange={(e) => setModalRank({ ...modalRank, rankUpMessage: e.target.value })}
                    placeholder="e.g. You're building serious momentum."
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-amber-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="rankEnabledCheck"
                    checked={modalRank.enabled !== false}
                    onChange={(e) => setModalRank({ ...modalRank, enabled: e.target.checked })}
                    className="h-4 w-4 accent-amber-500 rounded"
                  />
                  <label htmlFor="rankEnabledCheck" className="text-xs font-semibold text-gray-300">
                    Rank Active in Gamification Engine
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-800">
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
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>

              {/* Live Preview Column */}
              <div className="flex flex-col justify-center">
                <RankPreviewCard rank={modalRank} previewXp={modalRank.minXp} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON Editor Modal */}
      <RawJsonEditorModal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        title="Raw JSON Editor — Ranks Hierarchy"
        initialJson={JSON.stringify(ranks, null, 2)}
        onSave={async (json) => {
          const res = await saveRawRanksJsonAction(json);
          if (res.success) {
            showSuccess('Ranks JSON successfully applied to database!');
            await loadData();
          }
          return res;
        }}
      />
    </div>
  );
}
