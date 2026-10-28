import type { FC } from 'react';
import type { AnalysisResult, ProblemInput } from '../types/index.ts';
import { Stage2Assumptions } from './stages/Stage2Assumptions.tsx';

export interface AssumptionCritiquePanelProps {
  problem: ProblemInput;
  analysis: AnalysisResult;
  onProceedToTest: () => void;
  onEditProblem: () => void;
  isProblemStale?: boolean;
  isDirty?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const AssumptionCritiquePanel: FC<AssumptionCritiquePanelProps> = ({
  isProblemStale,
  isDirty,
  ...rest
}) => {
  return (
    <Stage2Assumptions
      isDirty={isDirty ?? isProblemStale ?? false}
      {...rest}
    />
  );
};

export default AssumptionCritiquePanel;
