import type { FC } from 'react';
import { Lightbulb, AlertTriangle, Edit3, User, MapPin, Shield } from 'lucide-react';
import type { ProblemInput } from '../../types/index.ts';
import { TactileButton } from '../common/TactileButton.tsx';

export interface HypothesisCardProps {
  problem: ProblemInput;
  isDirty?: boolean;
  onEditProblem?: () => void;
  onReanalyze?: () => void;
  className?: string;
}

export const HypothesisCard: FC<HypothesisCardProps> = ({
  problem,
  isDirty = false,
  onEditProblem,
  onReanalyze,
  className = '',
}) => {
  const hasIdea = Boolean(problem?.idea && problem.idea.trim().length > 0);
  const existingObs = problem?.existingObservations || problem?.existingEvidence;

  return (
    <div className={`bg-[#181c2a] border border-[#242a3e] rounded-xl p-4 sm:p-5 shadow-sm space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#242a3e]/80">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-300">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="font-semibold tracking-wider">Core Hypothesis</span>
        </div>

        {onEditProblem && (
          <button
            type="button"
            onClick={onEditProblem}
            title="Edit problem definition"
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-[#12151f]"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* Outdated Flag if Dirty */}
      {isDirty && (
        <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] font-mono uppercase text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Problem Modified (Analysis Outdated)</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Formulation was edited. Re-run analysis to synchronize evidence with your new statement.
          </p>
          {onReanalyze && (
            <TactileButton
              size="sm"
              variant="secondary"
              onClick={onReanalyze}
              className="w-full text-xs py-1 min-h-[34px] border-amber-700/80 text-amber-200 hover:bg-amber-900/50"
            >
              Re-analyze Now
            </TactileButton>
          )}
        </div>
      )}

      {/* Target User */}
      <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#12151f] px-2.5 py-1.5 rounded-lg border border-[#242a3e]/60">
        <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-slate-500 font-mono text-[11px]">User:</span>
        <span className="font-medium truncate text-slate-200">
          {problem?.targetUser?.trim() || 'Undefined target cohort'}
        </span>
      </div>

      {/* Main Statement */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
          Proposed Friction / Premise:
        </span>
        <p className="text-xs text-slate-200 leading-relaxed font-medium bg-[#12151f]/50 p-2.5 rounded-lg border border-[#242a3e]/40">
          {hasIdea ? (
            problem.idea
          ) : (
            <span className="text-slate-500 italic">No problem statement defined yet.</span>
          )}
        </p>
      </div>

      {/* Context if present */}
      {problem?.context && (
        <div className="flex items-start gap-1.5 text-xs text-slate-400 pt-1">
          <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-snug">
            <strong className="text-slate-300 font-normal">Context:</strong> {problem.context}
          </span>
        </div>
      )}

      {/* Existing Observations if present */}
      {existingObs && (
        <div className="text-[11px] text-slate-400 bg-[#12151f]/70 p-2 rounded border border-[#242a3e]/40">
          <span className="font-mono text-slate-500 uppercase text-[10px] block mb-0.5">
            Initial Observations:
          </span>
          <span className="text-slate-300">{existingObs}</span>
        </div>
      )}

      {/* Constraints if present */}
      {problem?.constraints && (
        <div className="flex items-start gap-1.5 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-snug text-slate-400">
            <strong className="text-slate-300 font-normal">Constraints:</strong> {problem.constraints}
          </span>
        </div>
      )}
    </div>
  );
};

export default HypothesisCard;
