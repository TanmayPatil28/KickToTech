import type { FC } from 'react';
import { Compass } from 'lucide-react';
import type { CaseState, ValidationState } from '../types/index.ts';
import { HypothesisCard } from './sidebar/HypothesisCard.tsx';
import { AssumptionSummary } from './sidebar/AssumptionSummary.tsx';
import { EvidenceLedger } from './sidebar/EvidenceLedger.tsx';

export interface SecondaryColumnProps {
  state: CaseState | ValidationState;
  onReanalyze: () => void;
  onRemoveFinding?: (id: string) => void;
  className?: string;
}

export const SecondaryColumn: FC<SecondaryColumnProps> = ({
  state,
  onReanalyze,
  onRemoveFinding,
  className = '',
}) => {
  const isDirty = Boolean(state.isDirty || state.isProblemStale);
  const assumptions = state.analysis?.assumptions || [];
  const findings = state.findings || [];
  const ledger = state.ledger || [];
  const currentStage = state.stage || ('currentStage' in state ? String((state as unknown as { currentStage: string }).currentStage) : 'DRAFT');

  return (
    <aside className={`space-y-5 ${className}`}>
      {/* Stage 1 Protocol Framework Callout */}
      {currentStage === 'DRAFT' && (
        <div className="bg-white border border-zinc-200/90 rounded-xl p-4 shadow-premium-card space-y-2.5 animate-stage-enter">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-teal-800 font-semibold tracking-wider">
            <div className="w-5 h-5 rounded bg-teal-50 text-teal-700 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span>Evidence Framework</span>
          </div>
          <div className="space-y-2 text-xs text-zinc-600 font-sans">
            <p className="font-semibold text-zinc-900 leading-snug">
              Three simple rules to test your idea:
            </p>
            <ul className="space-y-1.5 text-[11px] text-zinc-600">
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-zinc-900 font-medium">Focus on real pain:</strong> Describe who gets stuck and why, instead of pitching app features.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-zinc-900 font-medium">Spot your biggest guesses:</strong> Find the hidden assumptions that would break your startup if wrong.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <span>
                  <strong className="text-zinc-900 font-medium">Watch real actions:</strong> Trust what users actually do, not polite compliments, before writing code.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 1. Persistent Core Hypothesis */}
      <HypothesisCard
        problem={state.problem}
        isDirty={isDirty}
        onEditProblem={onReanalyze}
        onReanalyze={onReanalyze}
      />

      {/* 2. Assumption Status Matrix */}
      <AssumptionSummary assumptions={assumptions} />

      {/* 3. Chronological Findings & Audit Ledger */}
      <EvidenceLedger
        findings={findings}
        ledger={ledger}
        onRemoveFinding={onRemoveFinding}
      />
    </aside>
  );
};

export default SecondaryColumn;
