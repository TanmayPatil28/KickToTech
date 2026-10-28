import type { CaseState, ProblemInput, WorkflowStage } from '../types';

export const STAGE_ORDER: WorkflowStage[] = [
  'DRAFT',
  'ANALYZED',
  'TEST_DEFINED',
  'FINDINGS_ENTERED',
  'EVIDENCE_REVIEWED',
];

export interface ValidationTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Checks if a problem definition input is minimally valid to proceed to analysis.
 */
export function validateProblemInput(input: ProblemInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.idea || input.idea.trim().length < 10) {
    errors.push('Idea must contain at least 10 characters describing the proposed problem or concept.');
  }
  if (!input.targetUser || input.targetUser.trim().length < 3) {
    errors.push('Target user must be specified (at least 3 characters).');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if changing the problem statement invalidates existing analysis or tests.
 */
export function isProblemDirty(current: ProblemInput, lastAnalyzed?: ProblemInput): boolean {
  if (!lastAnalyzed) return false;
  const ideaChanged = current.idea.trim() !== lastAnalyzed.idea.trim();
  const userChanged = current.targetUser.trim() !== lastAnalyzed.targetUser.trim();
  const contextChanged = current.context.trim() !== lastAnalyzed.context.trim();
  return ideaChanged || userChanged || contextChanged;
}

/**
 * Enforces transition guard rules between workflow stages.
 */
export function canTransitionTo(state: CaseState, targetStage: WorkflowStage): ValidationTransitionResult {
  const currentIndex = STAGE_ORDER.indexOf(state.stage);
  const targetIndex = STAGE_ORDER.indexOf(targetStage);

  // Backward navigation is always permitted
  if (targetIndex <= currentIndex) {
    return { allowed: true };
  }

  // Jumping ahead more than 1 step without completing intermediate stages is strictly disallowed
  if (targetIndex > currentIndex + 1) {
    return {
      allowed: false,
      reason: `Cannot jump from ${state.stage} directly to ${targetStage}. Required intermediate steps must be completed.`,
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
      if (state.isProblemStale) {
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
      if (!state.verdict) {
        return { allowed: false, reason: 'An evidence-based verdict must be generated before entering this stage.' };
      }
      if (state.isProblemStale) {
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
