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
    <div className={`bg-[#101524] border border-[#212a45] rounded-xl p-4 shadow-premium-card space-y-3.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#212a45]">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
          <div className="w-5 h-5 rounded bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold tracking-wider text-slate-200">Core Hypothesis</span>
        </div>

        {onEditProblem && (
          <button
            type="button"
            onClick={onEditProblem}
            title="Edit problem definition"
            aria-label="Edit problem definition"
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-900 transition-colors px-2 py-1 rounded-md hover:bg-zinc-100 cursor-pointer active:scale-[0.97]"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* Outdated Flag if Dirty */}
      {isDirty && (
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/60 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] font-mono uppercase text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Problem Modified (Analysis Outdated)</span>
          </div>
          <p className="text-[11px] text-amber-800/90 leading-relaxed font-sans">
            Formulation was edited. Re-run analysis to synchronize evidence with your new statement.
          </p>
          {onReanalyze && (
            <TactileButton
              size="sm"
              variant="secondary"
              onClick={onReanalyze}
              className="w-full text-xs py-1 min-h-[34px] border-amber-700/80 bg-amber-950/60 text-amber-900 hover:bg-amber-100"
            >
              Re-analyze Now
            </TactileButton>
          )}
        </div>
      )}

      {/* Target User */}
      <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#151b2e] px-3 py-2 rounded-lg border border-[#212a45]">
        <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span className="text-slate-400 font-mono text-[11px]">User:</span>
        <span className="font-semibold truncate text-slate-900 font-sans">
          {problem?.targetUser?.trim() || 'Undefined target cohort'}
        </span>
      </div>

      {/* Main Statement */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold block">
          Proposed Friction / Premise:
        </span>
        <div className="text-xs text-slate-200 leading-relaxed font-sans bg-[#151b2e] p-3 rounded-lg border border-[#212a45] shadow-2xs">
          {hasIdea ? (
            <p className="text-zinc-800 font-normal">{problem.idea}</p>
          ) : (
            <span className="text-slate-500 italic">No problem statement defined yet.</span>
          )}
        </div>
      </div>

      {/* Context if present */}
      {problem?.context && (
        <div className="flex items-start gap-1.5 text-xs text-slate-300 pt-1 font-sans">
          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-snug text-slate-600">
            <strong className="text-slate-900 font-medium">Context:</strong> {problem.context}
          </span>
        </div>
      )}

      {/* Existing Observations if present */}
      {existingObs && (
        <div className="text-[11px] text-slate-300 bg-[#151b2e] p-2.5 rounded-lg border border-[#212a45] font-sans">
          <span className="font-mono text-slate-400 uppercase text-[10px] block mb-0.5 font-semibold">
            Initial Observations:
          </span>
          <span className="text-slate-700 leading-relaxed">{existingObs}</span>
        </div>
      )}

      {/* Constraints if present */}
      {problem?.constraints && (
        <div className="flex items-start gap-1.5 text-xs text-slate-400 font-sans">
          <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-snug text-slate-600">
            <strong className="text-slate-900 font-medium">Constraints:</strong> {problem.constraints}
          </span>
        </div>
      )}
    </div>
  );
};

export default HypothesisCard;