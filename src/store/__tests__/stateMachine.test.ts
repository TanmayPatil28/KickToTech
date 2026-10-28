import { describe, expect, it, beforeEach } from 'vitest';
import {
  STAGE_ORDER,
  STORAGE_KEY,
  STORAGE_SCHEMA_VERSION,
  canTransitionTo,
  transitionTo,
  validateProblemInput,
  computeProblemHash,
  isProblemDirty,
  createInitialValidationState,
  loadStoredState,
  persistState,
  clearStoredState,
  isValidPersistedState,
} from '../stateMachine.ts';
import type {
  ProblemInput,
  AnalysisResult,
  ValidationExperiment,
  Finding,
  DecisionBrief,
  ValidationState,
} from '../../types/index.ts';

describe('src/store/stateMachine.ts Unit Tests', () => {
  const sampleProblem: ProblemInput = {
    idea: 'Mechanical engineers struggle to index torque specs from PDF machine manuals.',
    targetUser: 'Mechanical engineering students',
    context: 'During lab machining operations.',
    existingObservations: 'Observed 4 students search manuals for >20 minutes.',
    constraints: 'Offline operation required.',
  };

  const sampleAnalysis: AnalysisResult = {
    problemClarity: {
      status: 'clear',
      explanation: 'Clear friction point in manual lookups.',
      missingDetails: [],
    },
    refinedProblemStatement: 'Students waste lab time searching static PDFs for torque tolerances.',
    targetUserAmbiguity: 'Specifically lab students.',
    assumptions: [
      {
        id: 'ASM-1',
        claim: 'Students cannot quickly find torque values with standard PDF search.',
        whyItMatters: 'PDF search fails on rasterized schematics.',
        evidenceNeeded: ['Observation of search failures.'],
        riskLevel: 'high',
        status: 'unverified',
        recommendedNextAction: 'Time 5 students searching for specs.',
        reason: 'Rasterized tables lack searchable text.',
        risk: 'high',
        nextAction: 'Time 5 students searching.',
      },
    ],
    evidenceGaps: [],
    alternativeExplanations: [],
    existingWorkarounds: ['Asking TA'],
    highestRiskUncertainty: 'Schematics are bottleneck.',
    suggestedValidationObjective: 'Measure search time.',
  };

  const sampleExperiment: ValidationExperiment = {
    id: 'EXP-1',
    title: 'Manual Spec Search Benchmark',
    objective: 'Measure time to locate tolerances.',
    hypothesis: 'Students spend >10 minutes searching rasterized PDFs.',
    targetParticipants: '5 mechanical engineering undergraduates',
    method: 'Timed observation',
    steps: ['Present student with manual', 'Time lookup'],
    nonLeadingQuestions: ['How did you confirm the torque specification?'],
    inquiryQuestions: ['How did you confirm the torque specification?'],
    evidenceToRecord: ['Time elapsed in seconds'],
    supportingSignals: ['Search exceeds 5 minutes'],
    weakeningSignals: ['Locates spec in <60 seconds'],
    limitations: ['Observer effect'],
    estimatedEffort: '1 hour',
  };

  const sampleFinding: Finding = {
    id: 'FND-1',
    description: 'Observed student spent 14 minutes searching for Bridgeport spindle preload spec.',
    sourceType: 'direct_observation',
    relatedHypothesis: 'EXP-1',
    timestamp: new Date().toISOString(),
    isCredibleObservation: true,
    createdAt: new Date().toISOString(),
  };

  const sampleBrief: DecisionBrief = {
    verdict: 'EVIDENCE SUPPORTS FURTHER TESTING',
    updatedProblemStatement: 'Students waste substantial lab time navigating unindexed machine manuals.',
    supportedClaims: ['Students cannot quickly find torque values with standard PDF search tools.'],
    unsupportedClaims: [],
    contradictoryFindings: [],
    remainingUncertainties: ['Whether lab coordinators permit third-party indexing.'],
    recommendedNextSteps: ['Test laminated reference cards.'],
  };

  function createState(stage: ValidationState['currentStage'] = 'DRAFT'): ValidationState {
    const base = createInitialValidationState();
    return {
      ...base,
      currentStage: stage,
      stage,
      problem: { ...sampleProblem },
    };
  }

  // =========================================================================
  // 1. FNV-1a Deterministic Dirty Hashing & Auto-Healing
  // =========================================================================
  describe('FNV-1a Problem Hashing & Dirty Tracking', () => {
    it('produces deterministic 8-character hex hash', () => {
      const hash1 = computeProblemHash(sampleProblem);
      const hash2 = computeProblemHash({ ...sampleProblem });
      expect(hash1).toHaveLength(8);
      expect(hash1).toBe(hash2);
      expect(/^[0-9a-f]{8}$/.test(hash1)).toBe(true);
    });

    it('normalizes leading and trailing whitespace across all fields', () => {
      const rawHash = computeProblemHash(sampleProblem);
      const paddedHash = computeProblemHash({
        ...sampleProblem,
        idea: '  ' + sampleProblem.idea + '   ',
        targetUser: '  ' + sampleProblem.targetUser + '  ',
        context: '  ' + sampleProblem.context + '  ',
      });
      expect(paddedHash).toBe(rawHash);
    });

    it('detects changes across idea, targetUser, and context', () => {
      const baselineHash = computeProblemHash(sampleProblem);
      expect(isProblemDirty(sampleProblem, baselineHash)).toBe(false);

      const modifiedIdea = { ...sampleProblem, idea: 'Completely different idea formulation' };
      expect(isProblemDirty(modifiedIdea, baselineHash)).toBe(true);

      const modifiedUser = { ...sampleProblem, targetUser: 'Automotive mechanics' };
      expect(isProblemDirty(modifiedUser, baselineHash)).toBe(true);

      const modifiedContext = { ...sampleProblem, context: 'During factory assembly' };
      expect(isProblemDirty(modifiedContext, baselineHash)).toBe(true);
    });

    it('auto-heals: returns false when edits are reverted back to baseline', () => {
      const baselineHash = computeProblemHash(sampleProblem);
      const edited = { ...sampleProblem, idea: 'Temporary edit that founder later undoes' };
      expect(isProblemDirty(edited, baselineHash)).toBe(true);

      const reverted = { ...sampleProblem, idea: sampleProblem.idea };
      expect(isProblemDirty(reverted, baselineHash)).toBe(false);
    });

    it('returns false when baseline is null or undefined (un-analyzed state)', () => {
      expect(isProblemDirty(sampleProblem, null)).toBe(false);
      expect(isProblemDirty(sampleProblem, undefined)).toBe(false);
    });
  });

  // =========================================================================
  // 2. Stage Machine Transition Guards (Task 2 Rules)
  // =========================================================================
  describe('Stage Machine Transitions & Prerequisites', () => {
    it('allows DRAFT -> ANALYZED when problem is valid and analysis is populated', () => {
      const state = { ...createState('DRAFT'), analysis: sampleAnalysis };
      const res = canTransitionTo('ANALYZED', state);
      expect(res.allowed).toBe(true);
    });

    it('blocks DRAFT -> ANALYZED if idea is under 10 chars', () => {
      const state = {
        ...createState('DRAFT'),
        problem: { ...sampleProblem, idea: 'Short' },
        analysis: sampleAnalysis,
      };
      const res = canTransitionTo('ANALYZED', state);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('at least 10 characters');
    });

    it('blocks DRAFT -> ANALYZED if targetUser is under 3 chars', () => {
      const state = {
        ...createState('DRAFT'),
        problem: { ...sampleProblem, targetUser: 'Me' },
        analysis: sampleAnalysis,
      };
      const res = canTransitionTo('ANALYZED', state);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('at least 3 characters');
    });

    it('blocks DRAFT -> ANALYZED if analysis is null', () => {
      const state = { ...createState('DRAFT'), analysis: null };
      const res = canTransitionTo('ANALYZED', state);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Analysis must be completed');
    });

    it('allows ANALYZED -> TEST_DEFINED when analysis has >= 1 assumption', () => {
      const state = { ...createState('ANALYZED'), analysis: sampleAnalysis };
      const res = canTransitionTo('TEST_DEFINED', state);
      expect(res.allowed).toBe(true);
    });

    it('blocks ANALYZED -> TEST_DEFINED when assumptions array is empty', () => {
      const state = {
        ...createState('ANALYZED'),
        analysis: { ...sampleAnalysis, assumptions: [] },
      };
      const res = canTransitionTo('TEST_DEFINED', state);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('at least one assumption');
    });

    it('allows TEST_DEFINED -> FINDINGS_ENTERED when experiment is present (findings NOT required!)', () => {
      const state = {
        ...createState('TEST_DEFINED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [], // Zero findings - user enters Stage 4 to begin logging
      };
      const res = canTransitionTo('FINDINGS_ENTERED', state);
      expect(res.allowed).toBe(true);
    });

    it('blocks TEST_DEFINED -> FINDINGS_ENTERED when experiment is null', () => {
      const state = {
        ...createState('TEST_DEFINED'),
        analysis: sampleAnalysis,
        experiment: null,
      };
      const res = canTransitionTo('FINDINGS_ENTERED', state);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('experiment must be defined');
    });

    it('blocks FINDINGS_ENTERED -> EVIDENCE_REVIEWED when findings array has 0 items', () => {
      const state = {
        ...createState('FINDINGS_ENTERED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
        isDirty: false,
      };
      const res = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('At least one evidence finding must be recorded');
    });

    it('allows FINDINGS_ENTERED -> EVIDENCE_REVIEWED when findings >= 1 and isDirty is false', () => {
      const state = {
        ...createState('FINDINGS_ENTERED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
        isDirty: false,
      };
      const res = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(res.allowed).toBe(true);
    });

    it('blocks FINDINGS_ENTERED -> EVIDENCE_REVIEWED when isDirty is true', () => {
      const state = {
        ...createState('FINDINGS_ENTERED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
        isDirty: true,
      };
      const res = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('problem statement was modified after analysis');
    });

    it('always allows backward transitions and preserves all state data', () => {
      const advancedState = {
        ...createState('EVIDENCE_REVIEWED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
        decisionBrief: sampleBrief,
      };

      // Navigate backwards to every previous stage
      expect(canTransitionTo('FINDINGS_ENTERED', advancedState).allowed).toBe(true);
      expect(canTransitionTo('TEST_DEFINED', advancedState).allowed).toBe(true);
      expect(canTransitionTo('ANALYZED', advancedState).allowed).toBe(true);
      expect(canTransitionTo('DRAFT', advancedState).allowed).toBe(true);

      // Execute transitionTo backwards to DRAFT
      const transitionResult = transitionTo('DRAFT', advancedState);
      expect(transitionResult.success).toBe(true);
      expect(transitionResult.currentStage).toBe('DRAFT');

      // Crucial: non-destructive invariant
      expect(transitionResult.state.analysis).toEqual(sampleAnalysis);
      expect(transitionResult.state.experiment).toEqual(sampleExperiment);
      expect(transitionResult.state.findings).toHaveLength(1);
      expect(transitionResult.state.decisionBrief).toEqual(sampleBrief);
    });

    it('blocks forward skips that jump over intermediate stages', () => {
      const state = createState('DRAFT');
      expect(canTransitionTo('TEST_DEFINED', state).allowed).toBe(false);
      expect(canTransitionTo('FINDINGS_ENTERED', state).allowed).toBe(false);
      expect(canTransitionTo('EVIDENCE_REVIEWED', state).allowed).toBe(false);
    });
  });

  // =========================================================================
  // 3. LocalStorage Persistence & Schema Validation
  // =========================================================================
  describe('LocalStorage Persistence (STORAGE_KEY = problempilot_state_v1)', () => {
    const memory = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => { memory.set(k, v); },
      removeItem: (k: string) => { memory.delete(k); },
      clear: () => { memory.clear(); },
      key: (i: number) => Array.from(memory.keys())[i] ?? null,
      length: 0,
    };
    Object.defineProperty(mockStorage, 'length', {
      get: () => memory.size,
    });

    beforeEach(() => {
      memory.clear();
      (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
      clearStoredState();
    });

    it('uses canonical storage key problempilot_state_v1', () => {
      expect(STORAGE_KEY).toBe('problempilot_state_v1');
      expect(STORAGE_SCHEMA_VERSION).toBe(1);
      expect(STAGE_ORDER).toHaveLength(5);
    });

    it('saves and safely reloads valid state', () => {
      const state = {
        ...createState('ANALYZED'),
        analysis: sampleAnalysis,
        analyzedProblemHash: computeProblemHash(sampleProblem),
      };

      expect(isValidPersistedState(state)).toBe(true);
      expect(isValidPersistedState(null)).toBe(false);
      expect(isValidPersistedState({ invalid: true })).toBe(false);

      const saved = persistState(state);
      expect(saved).toBe(true);

      const loaded = loadStoredState();
      expect(loaded.currentStage).toBe('ANALYZED');
      expect(loaded.problem.idea).toBe(sampleProblem.idea);
      expect(loaded.analysis?.assumptions).toHaveLength(1);
      expect(loaded.isDirty).toBe(false);
    });

    it('handles corrupted JSON in localStorage gracefully without throwing', () => {
      localStorage.setItem(STORAGE_KEY, '{ invalid_json ::: corrupt');
      const loaded = loadStoredState();
      expect(loaded.currentStage).toBe('DRAFT');
      expect(loaded.problem.idea).toBe('');
      // Corrupted key should be purged
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('validates schema version and rejects outdated schema payloads', () => {
      const outdated = {
        version: 999, // Unknown schema version
        currentStage: 'ANALYZED',
        problem: sampleProblem,
        findings: [],
        isDirty: false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outdated));
      const loaded = loadStoredState();
      expect(loaded.version).toBe(STORAGE_SCHEMA_VERSION);
      expect(loaded.currentStage).toBe('DRAFT');
    });

    it('clearStoredState safely removes persisted state', () => {
      persistState(createState('DRAFT'));
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      clearStoredState();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // =========================================================================
  // 4. Input Validation Boundary Cases
  // =========================================================================
  describe('validateProblemInput boundaries', () => {
    it('rejects empty input', () => {
      const res = validateProblemInput({ idea: '', targetUser: '', context: '' });
      expect(res.valid).toBe(false);
      expect(res.errors).toHaveLength(2);
    });

    it('accepts exact 10-char idea and 3-char targetUser', () => {
      const res = validateProblemInput({
        idea: '1234567890',
        targetUser: '123',
        context: 'lab',
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });
});
