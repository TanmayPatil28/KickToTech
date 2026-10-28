import type { CaseState, ProblemInput, WorkflowStage } from '../types/index.ts';
import {
  STAGE_ORDER as STORE_STAGE_ORDER,
  validateProblemInput as storeValidateProblemInput,
  isProblemDirty as storeIsProblemDirty,
  computeProblemHash,
  canTransitionTo as canTransitionToCanonical,
} from '../store/stateMachine.ts';

export const STAGE_ORDER: WorkflowStage[] = [...STORE_STAGE_ORDER];

export interface ValidationTransitionResult {
  allowed: boolean;
  reason?: string;
}

export { computeProblemHash, canTransitionToCanonical };

/**
 * Checks if a problem definition input is minimally valid to proceed to analysis.
 */
export function validateProblemInput(input: ProblemInput): { valid: boolean; errors: string[] } {
  return storeValidateProblemInput(input);
}

/**
 * Checks if changing the problem statement invalidates existing analysis or tests.
 */
export function isProblemDirty(
  current: ProblemInput,
  lastAnalyzed?: ProblemInput | string | null
): boolean {
  return storeIsProblemDirty(current, lastAnalyzed);
}

/**
 * Enforces transition guard rules between workflow stages for domain models.
 */
export function canTransitionTo(
  state: CaseState,
  targetStage: WorkflowStage
): ValidationTransitionResult {
  const currentIndex = STAGE_ORDER.indexOf(state.stage || state.currentStage || 'DRAFT');
  const targetIndex = STAGE_ORDER.indexOf(targetStage);

  // Backward navigation is always permitted and non-destructive
  if (targetIndex <= currentIndex) {
    return { allowed: true };
  }

  // Jumping ahead more than 1 step without completing intermediate stages is strictly disallowed
  if (targetIndex > currentIndex + 1) {
    return {
      allowed: false,
      reason: `Cannot jump from ${state.stage || state.currentStage || 'DRAFT'} directly to ${targetStage}. Required intermediate steps must be completed.`,
    };
  }

  // Specific transition checks:
  switch (targetStage) {
    case 'ANALYZED': {
      const val = validateProblemInput(state.problem);
      if (!val.valid) {
        return { allowed: false, reason: val.errors.join(' ') };
      }
      if (!state.analysis) {
        return { allowed: false, reason: 'Analysis must be completed before advancing to the ANALYZED stage.' };
      }
      return { allowed: true };
    }

    case 'TEST_DEFINED': {
      if (!state.analysis) {
        return { allowed: false, reason: 'A valid problem analysis is required before selecting an experiment.' };
      }
      if (!state.experiment) {
        return { allowed: false, reason: 'A validation experiment must be selected or generated.' };
      }
      return { allowed: true };
    }

    case 'FINDINGS_ENTERED': {
      if (!state.experiment) {
        return { allowed: false, reason: 'An active experiment must be defined before recording findings.' };
      }
      if (!state.findings || state.findings.length === 0) {
        return { allowed: false, reason: 'At least one evidence finding must be recorded before proceeding.' };
      }
      if (state.isProblemStale || state.isDirty) {
        return {
          allowed: false,
          reason: 'The problem statement was modified after the initial analysis. Please re-run analysis to synchronize evidence.',
        };
      }
      return { allowed: true };
    }

    case 'EVIDENCE_REVIEWED': {
      if (!state.findings || state.findings.length === 0) {
        return { allowed: false, reason: 'Cannot review evidence with an empty findings ledger.' };
      }
      if (!state.verdict && !state.decisionBrief) {
        return { allowed: false, reason: 'An evidence-based verdict must be generated before entering this stage.' };
      }
      if (state.isProblemStale || state.isDirty) {
        return {
          allowed: false,
          reason: 'Cannot review verdict with a stale problem statement. Re-analyze first.',
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}
