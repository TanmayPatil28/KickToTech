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
    <div className={`bg-[#181c2a] border border-[#242a3e] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#242a3e]/80">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-700 font-bold">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="font-semibold tracking-wider">Core Hypothesis</span>
        </div>

        {onEditProblem && (
          <button
            type="button"
            onClick={onEditProblem}
            title="Edit problem definition"
            className="flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-800 transition-colors p-1 rounded hover:bg-slate-100"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* Outdated Flag if Dirty */}
      {isDirty && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] font-mono uppercase text-amber-900">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Problem Modified (Analysis Outdated)</span>
          </div>
          <p className="text-[11px] text-amber-900/90 leading-relaxed font-sans">
            Formulation was edited. Re-run analysis to synchronize evidence with your new statement.
          </p>
          {onReanalyze && (
            <TactileButton
              size="sm"
              variant="secondary"
              onClick={onReanalyze}
              className="w-full text-xs py-1 min-h-[34px] border-amber-300 bg-white text-amber-900 hover:bg-amber-100/50 shadow-2xs"
            >
              Re-analyze Now
            </TactileButton>
          )}
        </div>
      )}

      {/* Target User */}
      <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
        <User className="w-3.5 h-3.5 text-teal-700 shrink-0" />
        <span className="text-slate-500 font-mono text-[11px] font-medium">User:</span>
        <span className="font-semibold truncate text-slate-900 font-sans">
          {problem?.targetUser?.trim() || 'Undefined target cohort'}
        </span>
      </div>

      {/* Main Statement */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-semibold">
          Proposed Friction / Premise:
        </span>
        <p className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-200 font-sans">
          {hasIdea ? (
            problem.idea
          ) : (
            <span className="text-slate-400 italic">No problem statement defined yet.</span>
          )}
        </p>
      </div>

      {/* Context if present */}
      {problem?.context && (
        <div className="flex items-start gap-1.5 text-xs text-slate-600 pt-1 font-sans">
          <MapPin className="w-3.5 h-3.5 text-indigo-700 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-snug">
            <strong className="text-slate-800 font-medium">Context:</strong> {problem.context}
          </span>
        </div>
      )}

      {/* Existing Observations if present */}
      {existingObs && (
        <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-sans">
          <span className="font-mono text-slate-500 uppercase text-[10px] block mb-0.5 font-semibold">
            Initial Observations:
          </span>
          <span className="text-slate-800">{existingObs}</span>
        </div>
      )}

      {/* Constraints if present */}
      {problem?.constraints && (
        <div className="flex items-start gap-1.5 text-xs text-slate-600 font-sans">
          <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-snug text-slate-600">
            <strong className="text-slate-800 font-medium">Constraints:</strong> {problem.constraints}
          </span>
        </div>
      )}
    </div>
  );
};

export default HypothesisCard;
