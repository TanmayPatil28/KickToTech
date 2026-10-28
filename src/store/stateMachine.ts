// ProblemPilot State Machine, Pure Transitions, FNV-1a Dirty Hashing & LocalStorage Persistence
// Compliant with tsconfig "erasableSyntaxOnly": true and "verbatimModuleSyntax": true

import { useState, useEffect, useCallback } from 'react';
import type {
  Stage,
  ProblemInput,
  AnalysisResult,
  ValidationExperiment,
  Finding,
  DecisionBrief,
  Verdict,
  LedgerEntry,
  ValidationState,
  CaseState,
} from '../types/index.ts';

// ============================================================================
// 1. Storage & Schema Constants
// ============================================================================

export const STORAGE_KEY = 'problempilot_state_v1';
export const STORAGE_SCHEMA_VERSION = 1;

export const STAGE_ORDER: readonly Stage[] = [
  'DRAFT',
  'ANALYZED',
  'TEST_DEFINED',
  'FINDINGS_ENTERED',
  'EVIDENCE_REVIEWED',
] as const;

export interface TransitionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface TransitionResult {
  success: boolean;
  state: ValidationState;
  error?: string;
  previousStage: Stage;
  currentStage: Stage;
}

// ============================================================================
// 2. Initial State Factory
// ============================================================================

export const INITIAL_PROBLEM_INPUT: ProblemInput = {
  idea: '',
  targetUser: '',
  context: '',
  existingObservations: '',
  existingEvidence: '',
  constraints: '',
};

export function createInitialValidationState(): ValidationState {
  const now = new Date().toISOString();
  return {
    version: STORAGE_SCHEMA_VERSION,
    id: `case_${Date.now()}`,
    currentStage: 'DRAFT',
    stage: 'DRAFT',
    problem: { ...INITIAL_PROBLEM_INPUT },
    lastAnalyzedProblem: undefined,
    analysis: null,
    experiment: null,
    alternativeExperiment: null,
    findings: [],
    ledger: [],
    decisionBrief: null,
    verdict: null,
    isDirty: false,
    isProblemStale: false,
    analyzedProblemHash: null,
    isDemo: false,
    isDemoMode: false,
    demoScenario: null,
    demoScenarioId: undefined,
    highestCompletedStage: 'DRAFT',
    highestUnlockedStage: 'DRAFT',
    lastUpdated: now,
    updatedAt: now,
  };
}

// ============================================================================
// 3. Problem Input Validation
// ============================================================================

export function validateProblemInput(input: ProblemInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const idea = input.idea ? input.idea.trim() : '';
  const targetUser = input.targetUser ? input.targetUser.trim() : '';

  if (idea.length < 10) {
    errors.push('Idea must contain at least 10 characters describing the proposed problem or concept.');
  }
  if (targetUser.length < 3) {
    errors.push('Target user must be specified (at least 3 characters).');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// 4. Deterministic FNV-1a 32-bit Hex Dirty Hashing
// ============================================================================

/**
 * Computes deterministic FNV-1a 32-bit hex hash across normalized problem fields.
 * Trims whitespace and normalizes empty/optional fields with an ASCII Unit Separator.
 */
export function computeProblemHash(input: ProblemInput): string {
  const normalized = [
    input.idea?.trim() ?? '',
    input.targetUser?.trim() ?? '',
    input.context?.trim() ?? '',
    input.constraints?.trim() ?? '',
    (input.existingObservations ?? input.existingEvidence ?? '')?.trim(),
  ].join('\u001F');

  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis (2166136261)
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    // Math.imul safely computes 32-bit integer multiplication in JS engines
    hash = Math.imul(hash, 0x01000193); // FNV-1a 32-bit prime (16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Checks if current ProblemInput is dirty compared to baseline hash or baseline ProblemInput.
 * Auto-clears if fields are reverted to match baseline hash.
 */
export function isProblemDirty(
  current: ProblemInput,
  baselineOrHash?: ProblemInput | string | null
): boolean {
  if (!baselineOrHash) return false;

  if (typeof baselineOrHash === 'string') {
    return computeProblemHash(current) !== baselineOrHash;
  }

  // Dual-mode comparison when a ProblemInput object is provided:
  // Compares core formulation fields (idea, targetUser, context)
  const ideaChanged = (current.idea || '').trim() !== (baselineOrHash.idea || '').trim();
  const userChanged = (current.targetUser || '').trim() !== (baselineOrHash.targetUser || '').trim();
  const contextChanged = (current.context || '').trim() !== (baselineOrHash.context || '').trim();
  return ideaChanged || userChanged || contextChanged;
}

// ============================================================================
// 5. Pure State Machine Transition Guards
// ============================================================================

function evaluateCanTransition(
  targetStage: Stage,
  state: ValidationState
): TransitionCheckResult {
  const currentStage = state.currentStage || state.stage || 'DRAFT';
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const targetIndex = STAGE_ORDER.indexOf(targetStage);

  if (targetIndex === -1) {
    return { allowed: false, reason: `Unknown target stage: ${targetStage}` };
  }

  // 1. Backward transitions are always allowed and strictly non-destructive
  if (targetIndex <= currentIndex) {
    return { allowed: true };
  }

  // 2. Disallow forward skipping of intermediate stages
  if (targetIndex > currentIndex + 1) {
    return {
      allowed: false,
      reason: `Cannot jump from ${currentStage} directly to ${targetStage}. Required intermediate steps must be completed.`,
    };
  }

  // 3. Stage-specific forward prerequisites
  switch (targetStage) {
    case 'ANALYZED': {
      const inputVal = validateProblemInput(state.problem);
      if (!inputVal.valid) {
        return { allowed: false, reason: inputVal.errors.join(' ') };
      }
      if (!state.analysis) {
        return {
          allowed: false,
          reason: 'Analysis must be completed before advancing to the ANALYZED stage.',
        };
      }
      return { allowed: true };
    }

    case 'TEST_DEFINED': {
      if (
        !state.analysis ||
        !state.analysis.assumptions ||
        state.analysis.assumptions.length === 0
      ) {
        return {
          allowed: false,
          reason: 'A valid problem analysis with at least one assumption is required before designing a test.',
        };
      }
      return { allowed: true };
    }

    case 'FINDINGS_ENTERED': {
      // Transition from TEST_DEFINED to FINDINGS_ENTERED requires an active experiment defined.
      // (Do NOT require findings to enter Stage 4!).
      if (!state.experiment) {
        return {
          allowed: false,
          reason: 'A validation experiment must be defined before proceeding to record findings.',
        };
      }
      if (state.isDirty || state.isProblemStale) {
        return {
          allowed: false,
          reason: 'The problem statement was modified after the initial analysis. Please re-run analysis to synchronize evidence.',
        };
      }
      return { allowed: true };
    }

    case 'EVIDENCE_REVIEWED': {
      if (!state.findings || state.findings.length < 1) {
        return {
          allowed: false,
          reason: 'At least one evidence finding must be recorded before requesting an evidence review.',
        };
      }
      if (state.isDirty || state.isProblemStale) {
        return {
          allowed: false,
          reason: 'The problem statement was modified after analysis was generated. You must re-run analysis before reviewing evidence.',
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * Guards state transitions between workflow stages.
 * Supports both (targetStage, state) and (state, targetStage) parameter orders.
 */
export function canTransitionTo(
  targetStage: Stage,
  state: ValidationState | CaseState
): TransitionCheckResult;
export function canTransitionTo(
  state: ValidationState | CaseState,
  targetStage: Stage
): TransitionCheckResult;
export function canTransitionTo(
  first: Stage | ValidationState | CaseState,
  second: ValidationState | CaseState | Stage
): TransitionCheckResult {
  if (typeof first === 'string') {
    return evaluateCanTransition(first as Stage, second as ValidationState);
  } else {
    return evaluateCanTransition(second as Stage, first as ValidationState);
  }
}

function getHighestStage(currentHighest: Stage, targetStage: Stage): Stage {
  const currentIdx = STAGE_ORDER.indexOf(currentHighest || 'DRAFT');
  const targetIdx = STAGE_ORDER.indexOf(targetStage);
  return targetIdx > currentIdx ? targetStage : currentHighest;
}

/**
 * Executes a pure stage transition if permitted by guards.
 * Strictly non-destructive: all existing findings, experiments, and analysis remain intact.
 */
export function transitionTo(
  stageOrState: Stage | ValidationState | CaseState,
  stateOrStage: ValidationState | CaseState | Stage
): TransitionResult {
  let targetStage: Stage;
  let state: ValidationState;

  if (typeof stageOrState === 'string') {
    targetStage = stageOrState as Stage;
    state = stateOrStage as ValidationState;
  } else {
    state = stageOrState as ValidationState;
    targetStage = stateOrStage as Stage;
  }

  const currentStage = state.currentStage || state.stage || 'DRAFT';
  const check = evaluateCanTransition(targetStage, state);

  if (!check.allowed) {
    return {
      success: false,
      state,
      error: check.reason,
      previousStage: currentStage,
      currentStage,
    };
  }

  const now = new Date().toISOString();
  const nextHighest = getHighestStage(
    state.highestCompletedStage || state.highestUnlockedStage || currentStage,
    targetStage
  );

  const nextState: ValidationState = {
    ...state,
    currentStage: targetStage,
    stage: targetStage,
    highestCompletedStage: nextHighest,
    highestUnlockedStage: nextHighest,
    lastUpdated: now,
    updatedAt: now,
  };

  return {
    success: true,
    state: nextState,
    previousStage: currentStage,
    currentStage: targetStage,
  };
}

// ============================================================================
// 6. LocalStorage Persistence & Schema Validation
// ============================================================================

export function isValidPersistedState(obj: unknown): obj is ValidationState {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const candidate = obj as Record<string, unknown>;

  if (typeof candidate.version !== 'number' || candidate.version !== STORAGE_SCHEMA_VERSION) {
    return false;
  }

  const stage = (candidate.currentStage || candidate.stage) as Stage;
  if (typeof stage !== 'string' || !STAGE_ORDER.includes(stage)) {
    return false;
  }

  if (!candidate.problem || typeof candidate.problem !== 'object') {
    return false;
  }
  const prob = candidate.problem as Record<string, unknown>;
  if (typeof prob.idea !== 'string' || typeof prob.targetUser !== 'string' || typeof prob.context !== 'string') {
    return false;
  }

  if (!Array.isArray(candidate.findings)) {
    return false;
  }

  return true;
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
      return (globalThis as unknown as { localStorage?: Storage }).localStorage || null;
    }
  } catch {}
  return null;
}

export function loadStoredState(): ValidationState {
  const storage = getStorage();
  if (!storage) {
    return createInitialValidationState();
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createInitialValidationState();

    const parsed = JSON.parse(raw);
    if (isValidPersistedState(parsed)) {
      // Re-verify dirty status against hash on rehydration
      const isDirty = parsed.analyzedProblemHash
        ? computeProblemHash(parsed.problem) !== parsed.analyzedProblemHash
        : false;

      return {
        ...parsed,
        currentStage: parsed.currentStage || parsed.stage || 'DRAFT',
        stage: parsed.currentStage || parsed.stage || 'DRAFT',
        isDirty,
        isProblemStale: isDirty,
        findings: parsed.findings || [],
        ledger: parsed.ledger || [],
        decisionBrief: parsed.decisionBrief || (parsed.verdict as DecisionBrief) || null,
        verdict: parsed.verdict || (parsed.decisionBrief as unknown as Verdict) || null,
      };
    } else {
      console.warn('[ProblemPilot] Stored state schema mismatch. Reverting to initial state.');
      clearStoredState();
      return createInitialValidationState();
    }
  } catch (err) {
    console.warn('[ProblemPilot] Corrupted JSON in localStorage. Resetting to initial DRAFT.', err);
    clearStoredState();
    return createInitialValidationState();
  }
}

export function persistState(state: ValidationState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('[ProblemPilot] Failed to save state to localStorage:', err);
    return false;
  }
}

export function clearStoredState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[ProblemPilot] Failed to remove stored state:', err);
  }
}

// ============================================================================
// 7. React Store Hook with Dirty Hashing & Auto-Save
// ============================================================================

export function useValidationStore() {
  const [state, setState] = useState<ValidationState>(loadStoredState);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Auto-persist on state change
  useEffect(() => {
    persistState(state);
  }, [state]);

  const addLedgerEntry = useCallback(
    (type: LedgerEntry['type'], source: LedgerEntry['source'], summary: string) => {
      const entry: LedgerEntry = {
        id: `LED-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toISOString(),
        type,
        source,
        summary,
      };
      return entry;
    },
    []
  );

  const updateProblem = useCallback(
    (update: Partial<ProblemInput>) => {
      setState((prev) => {
        const nextProblem: ProblemInput = { ...prev.problem, ...update };
        const dirty = prev.analyzedProblemHash !== null
          ? computeProblemHash(nextProblem) !== prev.analyzedProblemHash
          : isProblemDirty(nextProblem, prev.lastAnalyzedProblem);

        const now = new Date().toISOString();
        const nextState: ValidationState = {
          ...prev,
          problem: nextProblem,
          isDirty: dirty,
          isProblemStale: dirty,
          lastUpdated: now,
          updatedAt: now,
        };

        if (dirty && prev.analysis) {
          nextState.ledger = [
            ...(prev.ledger || []),
            addLedgerEntry(
              'HYPOTHESIS_EDITED',
              'USER',
              'Problem formulation was modified after analysis was conducted. Existing analysis marked as outdated.'
            ),
          ];
        }

        return nextState;
      });
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const applyAnalysis = useCallback(
    (analysis: AnalysisResult, alternative?: ValidationExperiment) => {
      setState((prev) => {
        const hash = computeProblemHash(prev.problem);
        const now = new Date().toISOString();
        const primaryExp: ValidationExperiment = {
          id: 'EXP-1',
          title: analysis.suggestedValidationObjective || 'Targeted Behavioral Retrospective Interview',
          objective: analysis.suggestedValidationObjective,
          hypothesis: analysis.assumptions[0]?.claim || 'Target users experience severe friction with current workarounds.',
          targetParticipants: prev.problem.targetUser || '5 relevant individuals',
          method: 'Past-behavior retrospective inquiry (strictly non-leading)',
          steps: [
            'Identify participants matching target profile who recently encountered the situation.',
            'Ask them to reconstruct their most recent real experience without pitching the idea.',
            'Record the specific workarounds and tools used.',
            'Note where they encountered friction and what they did to resolve it.',
          ],
          nonLeadingQuestions: [
            'Tell me about the last time you experienced this. What was the exact situation?',
            'What tool, workaround, or manual process did you use?',
            'What was the most difficult or frustrating part of that process?',
            'How did you resolve it at that moment?',
          ],
          inquiryQuestions: [
            'Tell me about the last time you experienced this. What was the exact situation?',
            'What tool, workaround, or manual process did you use?',
            'What was the most difficult or frustrating part of that process?',
            'How did you resolve it at that moment?',
          ],
          evidenceToRecord: [
            'Specific tools used and abandoned.',
            'Time lost or cost incurred.',
            'Verbatim statements of frustration or satisfaction.',
          ],
          supportingSignals: [
            'User reports spending substantial time/money on an imperfect workaround.',
            'User spontaneously describes severe difficulty without prompting.',
          ],
          weakeningSignals: [
            'User reports existing tools (e.g. spreadsheets, calendars) completely solve the issue.',
            'User has not experienced the situation in the past 6 months.',
          ],
          limitations: [
            'Small sample size does not confirm market size or willingness to pay.',
            'Participant recall may miss minor details.',
          ],
          estimatedEffort: '1.5 hours (5 interviews × 15 min + note synthesis)',
        };

        return {
          ...prev,
          currentStage: 'ANALYZED',
          stage: 'ANALYZED',
          highestCompletedStage: getHighestStage(prev.highestCompletedStage || 'DRAFT', 'ANALYZED'),
          highestUnlockedStage: getHighestStage(prev.highestUnlockedStage || 'DRAFT', 'ANALYZED'),
          analysis,
          analyzedProblemHash: hash,
          lastAnalyzedProblem: { ...prev.problem },
          isDirty: false,
          isProblemStale: false,
          experiment: primaryExp,
          alternativeExperiment: alternative || null,
          ledger: [
            ...(prev.ledger || []),
            addLedgerEntry(
              'ANALYSIS_GENERATED',
              prev.isDemo ? 'SYSTEM' : 'AI_REASONING',
              `Analysis completed: Clarity=${analysis.problemClarity.status.toUpperCase()}, ${analysis.assumptions.length} assumptions challenged.`
            ),
          ],
          lastUpdated: now,
          updatedAt: now,
        };
      });
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const setExperiment = useCallback(
    (experiment: ValidationExperiment) => {
      setState((prev) => {
        const now = new Date().toISOString();
        return {
          ...prev,
          currentStage: 'TEST_DEFINED',
          stage: 'TEST_DEFINED',
          highestCompletedStage: getHighestStage(prev.highestCompletedStage || 'DRAFT', 'TEST_DEFINED'),
          highestUnlockedStage: getHighestStage(prev.highestUnlockedStage || 'DRAFT', 'TEST_DEFINED'),
          experiment,
          ledger: [
            ...(prev.ledger || []),
            addLedgerEntry('TEST_SELECTED', 'USER', `Selected validation experiment: "${experiment.title || experiment.hypothesis}".`),
          ],
          lastUpdated: now,
          updatedAt: now,
        };
      });
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const addFinding = useCallback(
    (findingInput: Omit<Finding, 'id' | 'createdAt'>) => {
      const now = new Date().toISOString();
      const newFinding: Finding = {
        ...findingInput,
        id: `FND-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: now,
        createdAt: now,
        isCredibleObservation: findingInput.isCredibleObservation ?? true,
      };

      setState((prev) => {
        const nextFindings = [...prev.findings, newFinding];
        const nextStage: Stage =
          (prev.currentStage || prev.stage) === 'TEST_DEFINED' ? 'FINDINGS_ENTERED' : (prev.currentStage || prev.stage);

        return {
          ...prev,
          currentStage: nextStage,
          stage: nextStage,
          highestCompletedStage: getHighestStage(prev.highestCompletedStage || 'DRAFT', 'FINDINGS_ENTERED'),
          highestUnlockedStage: getHighestStage(prev.highestUnlockedStage || 'DRAFT', 'FINDINGS_ENTERED'),
          findings: nextFindings,
          ledger: [
            ...(prev.ledger || []),
            addLedgerEntry(
              'FINDING_RECORDED',
              'USER',
              `Recorded [${findingInput.sourceType}] finding: "${findingInput.description.substring(0, 60)}${
                findingInput.description.length > 60 ? '...' : ''
              }"`
            ),
          ],
          lastUpdated: now,
          updatedAt: now,
        };
      });
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const removeFinding = useCallback((id: string) => {
    setState((prev) => {
      const nextFindings = prev.findings.filter((f) => f.id !== id);
      const now = new Date().toISOString();
      return {
        ...prev,
        findings: nextFindings,
        lastUpdated: now,
        updatedAt: now,
      };
    });
    setTransitionError(null);
  }, []);

  const setDecisionBrief = useCallback(
    (brief: DecisionBrief | Verdict) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        currentStage: 'EVIDENCE_REVIEWED',
        stage: 'EVIDENCE_REVIEWED',
        highestCompletedStage: 'EVIDENCE_REVIEWED',
        highestUnlockedStage: 'EVIDENCE_REVIEWED',
        decisionBrief: brief as DecisionBrief,
        verdict: brief as Verdict,
        ledger: [
          ...(prev.ledger || []),
          addLedgerEntry(
            'EVIDENCE_ASSESSED',
            prev.isDemo ? 'SYSTEM' : 'AI_REASONING',
            `Evidence synthesized. Verdict: ${(brief.verdict || brief.category || '').toString().replace(/_/g, ' ')}.`
          ),
        ],
        lastUpdated: now,
        updatedAt: now,
      }));
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const transitionToStage = useCallback(
    (targetStage: Stage): { success: boolean; error?: string } => {
      const res = transitionTo(targetStage, state);
      if (!res.success) {
        setTransitionError(res.error || 'Transition not allowed.');
        return { success: false, error: res.error };
      }
      setTransitionError(null);
      setState(res.state);
      return { success: true };
    },
    [state]
  );

  const clearDirtyStatus = useCallback(() => {
    setState((prev) => {
      const hash = computeProblemHash(prev.problem);
      const now = new Date().toISOString();
      return {
        ...prev,
        analyzedProblemHash: hash,
        isDirty: false,
        isProblemStale: false,
        lastUpdated: now,
        updatedAt: now,
      };
    });
  }, []);

  /**
   * Two-phase modal-ready reset function.
   * Purges persistent storage and initializes a pristine validation case.
   */
  const resetCase = useCallback(() => {
    clearStoredState();
    setState(createInitialValidationState());
    setTransitionError(null);
  }, []);

  const abandonCase = resetCase;

  return {
    state,
    isDirty: state.isDirty,
    transitionError,
    clearTransitionError: () => setTransitionError(null),
    updateProblem,
    applyAnalysis,
    setExperiment,
    addFinding,
    removeFinding,
    setDecisionBrief,
    setVerdict: setDecisionBrief,
    canTransitionTo: (targetStage: Stage) => evaluateCanTransition(targetStage, state),
    transitionTo: transitionToStage,
    navigateTo: transitionToStage,
    clearDirtyStatus,
    resetCase,
    abandonCase,
  };
}

export const useStateMachine = useValidationStore;
