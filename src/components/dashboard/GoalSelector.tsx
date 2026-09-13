'use client';

import { useState } from 'react';
import { sound } from '@/lib/sound/sound';
import { Plus, Settings2, Flame } from 'lucide-react';
import { Goal } from '@/db/schema';
import { CreateGoalModal } from './CreateGoalModal';

interface GoalSelectorProps {
  goals: Goal[];
  activeGoalId: string;
  onSelectGoal: (goalId: string) => void;
  onGoalsChanged: () => void;
}

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  amber: { border: 'border-amber-500', bg: 'bg-amber-500/15', text: 'text-amber-400', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]' },
  rose: { border: 'border-rose-500', bg: 'bg-rose-500/15', text: 'text-rose-400', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]' },
  cyan: { border: 'border-cyan-500', bg: 'bg-cyan-500/15', text: 'text-cyan-400', glow: 'shadow-[0_0_12px_rgba(6,182,212,0.25)]' },
  violet: { border: 'border-violet-500', bg: 'bg-violet-500/15', text: 'text-violet-400', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.25)]' },
  blue: { border: 'border-blue-500', bg: 'bg-blue-500/15', text: 'text-blue-400', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]' },
};

export function GoalSelector({
  goals,
  activeGoalId,
  onSelectGoal,
  onGoalsChanged,
}: GoalSelectorProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);

  const activeGoal = goals.find((g) => g.id === activeGoalId) || goals[0];

  const handleOpenEdit = (goal: Goal, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    setGoalToEdit(goal);
    setShowCreateModal(true);
  };

  const handleOpenCreate = () => {
    sound.playClick();
    setGoalToEdit(null);
    setShowCreateModal(true);
  };

  return (
    <section aria-label="Habit Goals Switcher" className="w-full">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          ACTIVE HABIT TRACKS
        </span>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center space-x-1 text-[11px] font-mono uppercase font-bold text-amber-400 hover:text-amber-300 transition-colors active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Horizontal Scroll Strip */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar touch-pan-x">
        {goals.map((goal) => {
          const isActive = goal.id === activeGoal?.id;
          const styling = COLOR_MAP[goal.color || 'amber'] || COLOR_MAP.amber;

          return (
            <div
              key={goal.id}
              onClick={() => {
                if (!isActive) {
                  sound.playClick();
                  onSelectGoal(goal.id);
                }
              }}
              className={`group relative flex shrink-0 items-center space-x-2.5 rounded-2xl px-3.5 py-2.5 cursor-pointer transition-all duration-200 active:scale-95 border ${
                isActive
                  ? `${styling.border} ${styling.bg} ${styling.glow} text-white font-bold`
                  : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              {/* Icon */}
              <span className="text-base leading-none">{goal.icon || '⚔️'}</span>

              {/* Title & Streak */}
              <div className="flex flex-col text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold leading-tight line-clamp-1 max-w-[120px] sm:max-w-[160px]">
                    {goal.title}
                  </span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-400">
                  <span className="flex items-center text-amber-400 font-bold">
                    🔥 {goal.currentStreak}d streak
                  </span>
                  <span className="text-gray-600">•</span>
                  <span>{goal.targetDaysPerWeek}d/wk</span>
                </div>
              </div>

              {/* Edit / Config Icon for Active Goal */}
              {isActive && (
                <button
                  onClick={(e) => handleOpenEdit(goal, e)}
                  title="Configure Goal"
                  className="ml-1 rounded-lg p-1 text-gray-400 hover:bg-black/30 hover:text-white transition-colors"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Quick Add Pill */}
        <button
          onClick={handleOpenCreate}
          className="flex shrink-0 items-center space-x-1.5 rounded-2xl border border-dashed border-gray-800 bg-gray-950/40 px-3.5 py-2.5 text-xs text-gray-500 hover:border-amber-500/40 hover:text-amber-400 transition-all active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">Add Goal</span>
        </button>
      </div>

      {/* Create / Edit Goal Modal */}
      <CreateGoalModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setGoalToEdit(null);
        }}
        goalToEdit={goalToEdit}
        canDelete={goals.length > 1}
        onSuccess={(savedGoal) => {
          onGoalsChanged();
          onSelectGoal(savedGoal.id);
        }}
        onDeleteSuccess={(deletedId) => {
          const remaining = goals.filter((g) => g.id !== deletedId);
          if (remaining.length > 0) {
            onSelectGoal(remaining[0].id);
          }
          onGoalsChanged();
        }}
      />
    </section>
  );
}
