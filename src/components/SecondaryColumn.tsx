import type { FC } from 'react';
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

  return (
    <aside className={`space-y-6 ${className}`}>
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
