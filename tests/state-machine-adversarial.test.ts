import { describe, expect, it } from 'vitest';
import {
  canTransitionTo,
  transitionTo,
  computeProblemHash,
  isProblemDirty,
  createInitialValidationState,
  isValidPersistedState,
} from '../src/store/stateMachine.ts';
import { canTransitionTo as canTransitionToDomain } from '../src/domain/stateMachine.ts';
import type {
  Stage,
  ProblemInput,
  AnalysisResult,
  ValidationExperiment,
  Finding,
  DecisionBrief,
  ValidationState,
  CaseState,
} from '../src/types/index.ts';

describe('Adversarial Verification: State Machine & Transition Guards', () => {
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

  const sampleFinding1: Finding = {
    id: 'FND-1',
    description: 'Observed student spent 14 minutes searching for Bridgeport spindle preload spec.',
    sourceType: 'direct_observation',
    relatedHypothesis: 'EXP-1',
    timestamp: '2026-10-28T07:00:00.000Z',
    isCredibleObservation: true,
    createdAt: '2026-10-28T07:00:00.000Z',
  };

  const sampleFinding2: Finding = {
    id: 'FND-2',
    description: 'User reported giving up and asking lab assistant after 8 minutes.',
    sourceType: 'user_reported',
    relatedHypothesis: 'EXP-1',
    timestamp: '2026-10-28T07:10:00.000Z',
    isCredibleObservation: true,
    createdAt: '2026-10-28T07:10:00.000Z',
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

  function buildState(overrides: Partial<ValidationState> = {}): ValidationState {
    const base = createInitialValidationState();
    return {
      ...base,
      problem: { ...sampleProblem },
      ...overrides,
    };
  }

  // =========================================================================
  // 1. ILLEGAL FORWARD TRANSITIONS
  // =========================================================================
  describe('1. Illegal Forward Transitions & Skips', () => {
    it('rejects jumping from DRAFT to TEST_DEFINED (skipping ANALYZED)', () => {
      const state = buildState({ currentStage: 'DRAFT', stage: 'DRAFT' });
      const check = canTransitionTo('TEST_DEFINED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/Cannot jump from DRAFT directly to TEST_DEFINED/);

      const result = transitionTo('TEST_DEFINED', state);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Cannot jump/);
      expect(result.state.currentStage).toBe('DRAFT');
    });

    it('rejects jumping from DRAFT to FINDINGS_ENTERED (skipping ANALYZED & TEST_DEFINED)', () => {
      const state = buildState({ currentStage: 'DRAFT', stage: 'DRAFT' });
      const check = canTransitionTo('FINDINGS_ENTERED', state);
      expect(check.allowed).toBe(false);

      const result = transitionTo('FINDINGS_ENTERED', state);
      expect(result.success).toBe(false);
      expect(result.state.currentStage).toBe('DRAFT');
    });

    it('rejects jumping from DRAFT to EVIDENCE_REVIEWED (skipping all intermediate stages)', () => {
      const state = buildState({
        currentStage: 'DRAFT',
        stage: 'DRAFT',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1],
      });
      const check = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/Cannot jump from DRAFT directly to EVIDENCE_REVIEWED/);

      const result = transitionTo('EVIDENCE_REVIEWED', state);
      expect(result.success).toBe(false);
      expect(result.state.currentStage).toBe('DRAFT');
    });

    it('rejects jumping from ANALYZED to FINDINGS_ENTERED (skipping TEST_DEFINED)', () => {
      const state = buildState({
        currentStage: 'ANALYZED',
        stage: 'ANALYZED',
        analysis: sampleAnalysis,
      });
      const check = canTransitionTo('FINDINGS_ENTERED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/Cannot jump from ANALYZED directly to FINDINGS_ENTERED/);

      const result = transitionTo('FINDINGS_ENTERED', state);
      expect(result.success).toBe(false);
      expect(result.state.currentStage).toBe('ANALYZED');
    });

    it('rejects jumping from ANALYZED to EVIDENCE_REVIEWED (skipping TEST_DEFINED & FINDINGS_ENTERED)', () => {
      const state = buildState({
        currentStage: 'ANALYZED',
        stage: 'ANALYZED',
        analysis: sampleAnalysis,
        findings: [sampleFinding1],
      });
      const check = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(check.allowed).toBe(false);

      const result = transitionTo('EVIDENCE_REVIEWED', state);
      expect(result.success).toBe(false);
      expect(result.state.currentStage).toBe('ANALYZED');
    });

    it('rejects jumping from TEST_DEFINED to EVIDENCE_REVIEWED (skipping FINDINGS_ENTERED)', () => {
      const state = buildState({
        currentStage: 'TEST_DEFINED',
        stage: 'TEST_DEFINED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1],
      });
      const check = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/Cannot jump from TEST_DEFINED directly to EVIDENCE_REVIEWED/);

      const result = transitionTo('EVIDENCE_REVIEWED', state);
      expect(result.success).toBe(false);
      expect(result.state.currentStage).toBe('TEST_DEFINED');
    });

    it('rejects unknown or invalid target stages', () => {
      const state = buildState({ currentStage: 'DRAFT', stage: 'DRAFT' });
      // @ts-expect-error testing invalid stage input
      const check = canTransitionTo('BOGUS_STAGE', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/Unknown target stage/);

      // @ts-expect-error testing invalid stage input
      const result = transitionTo('BOGUS_STAGE', state);
      expect(result.success).toBe(false);
    });

    it('rejects DRAFT to ANALYZED if analysis has not been performed', () => {
      const state = buildState({
        currentStage: 'DRAFT',
        stage: 'DRAFT',
        analysis: null,
      });
      const check = canTransitionTo('ANALYZED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/Analysis must be completed/);
    });

    it('rejects DRAFT to ANALYZED if problem input fails validation', () => {
      const state = buildState({
        currentStage: 'DRAFT',
        stage: 'DRAFT',
        problem: { idea: 'Too short', targetUser: 'Me', context: '' },
        analysis: sampleAnalysis,
      });
      const check = canTransitionTo('ANALYZED', state);
      expect(check.allowed).toBe(false);
    });

    it('rejects ANALYZED to TEST_DEFINED if analysis has 0 assumptions', () => {
      const state = buildState({
        currentStage: 'ANALYZED',
        stage: 'ANALYZED',
        analysis: {
          ...sampleAnalysis,
          assumptions: [],
        },
      });
      const check = canTransitionTo('TEST_DEFINED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/at least one assumption is required/);
    });
  });

  // =========================================================================
  // 2. STAGE 3 -> STAGE 4 (TEST_DEFINED -> FINDINGS_ENTERED) WITH 0 FINDINGS
  // =========================================================================
  describe('2. Stage 3 -> Stage 4 with 0 findings (Anti-Catch-22)', () => {
    it('ALLOWS transition from TEST_DEFINED to FINDINGS_ENTERED when experiment is present and findings = 0', () => {
      const state = buildState({
        currentStage: 'TEST_DEFINED',
        stage: 'TEST_DEFINED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [], // Explicitly ZERO findings!
        isDirty: false,
        isProblemStale: false,
      });

      // Verify canTransitionTo allows it
      const check = canTransitionTo('FINDINGS_ENTERED', state);
      expect(check.allowed).toBe(true);

      // Verify canTransitionTo with reversed arguments
      const checkReversed = canTransitionTo(state, 'FINDINGS_ENTERED');
      expect(checkReversed.allowed).toBe(true);

      // Verify transitionTo executes cleanly
      const result = transitionTo('FINDINGS_ENTERED', state);
      expect(result.success).toBe(true);
      expect(result.currentStage).toBe('FINDINGS_ENTERED');
      expect(result.state.currentStage).toBe('FINDINGS_ENTERED');
      expect(result.state.stage).toBe('FINDINGS_ENTERED');
      expect(result.state.findings).toHaveLength(0); // Findings still empty
      expect(result.state.experiment).not.toBeNull();
    });

    it('BLOCKS transition from TEST_DEFINED to FINDINGS_ENTERED when experiment is missing (null)', () => {
      const state = buildState({
        currentStage: 'TEST_DEFINED',
        stage: 'TEST_DEFINED',
        analysis: sampleAnalysis,
        experiment: null, // Missing experiment!
        findings: [],
        isDirty: false,
      });

      const check = canTransitionTo('FINDINGS_ENTERED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/validation experiment must be defined/);

      const result = transitionTo('FINDINGS_ENTERED', state);
      expect(result.success).toBe(false);
      expect(result.state.currentStage).toBe('TEST_DEFINED');
    });

    it('BLOCKS transition from TEST_DEFINED to FINDINGS_ENTERED when problem is dirty (isDirty = true)', () => {
      const state = buildState({
        currentStage: 'TEST_DEFINED',
        stage: 'TEST_DEFINED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
        isDirty: true,
      });

      const check = canTransitionTo('FINDINGS_ENTERED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/problem statement was modified/);

      const result = transitionTo('FINDINGS_ENTERED', state);
      expect(result.success).toBe(false);
    });

    it('BLOCKS transition from TEST_DEFINED to FINDINGS_ENTERED when problem is stale (isProblemStale = true)', () => {
      const state = buildState({
        currentStage: 'TEST_DEFINED',
        stage: 'TEST_DEFINED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
        isDirty: false,
        isProblemStale: true,
      });

      const check = canTransitionTo('FINDINGS_ENTERED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/problem statement was modified/);
    });
  });

  // =========================================================================
  // 3. STAGE 4 -> STAGE 5 (FINDINGS_ENTERED -> EVIDENCE_REVIEWED) WHEN FINDINGS = 0
  // =========================================================================
  describe('3. Stage 4 -> Stage 5 when findings = 0', () => {
    it('BLOCKS transition from FINDINGS_ENTERED to EVIDENCE_REVIEWED when findings array is empty', () => {
      const state = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [], // ZERO findings!
        isDirty: false,
        isProblemStale: false,
      });

      const check = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/At least one evidence finding must be recorded/);

      const result = transitionTo('EVIDENCE_REVIEWED', state);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/At least one evidence finding must be recorded/);
      expect(result.state.currentStage).toBe('FINDINGS_ENTERED');
    });

    it('ALLOWS transition from FINDINGS_ENTERED to EVIDENCE_REVIEWED when findings >= 1 and not dirty', () => {
      const state = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1], // Exactly 1 finding
        isDirty: false,
        isProblemStale: false,
      });

      const check = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(check.allowed).toBe(true);

      const result = transitionTo('EVIDENCE_REVIEWED', state);
      expect(result.success).toBe(true);
      expect(result.state.currentStage).toBe('EVIDENCE_REVIEWED');
    });
  });

  // =========================================================================
  // 4. STAGE 4 -> STAGE 5 (FINDINGS_ENTERED -> EVIDENCE_REVIEWED) WHEN ISDIRTY = TRUE
  // =========================================================================
  describe('4. Stage 4 -> Stage 5 when isDirty = true', () => {
    it('BLOCKS transition from FINDINGS_ENTERED to EVIDENCE_REVIEWED when isDirty = true (even with findings)', () => {
      const state = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1, sampleFinding2], // Multiple findings present
        isDirty: true, // Problem is dirty!
        isProblemStale: false,
      });

      const check = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/problem statement was modified after analysis/);

      const result = transitionTo('EVIDENCE_REVIEWED', state);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/problem statement was modified/);
      expect(result.state.currentStage).toBe('FINDINGS_ENTERED');
    });

    it('BLOCKS transition from FINDINGS_ENTERED to EVIDENCE_REVIEWED when isProblemStale = true', () => {
      const state = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1],
        isDirty: false,
        isProblemStale: true,
      });

      const check = canTransitionTo('EVIDENCE_REVIEWED', state);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/problem statement was modified/);
    });

    it('verifies dynamic FNV-1a dirty hashing and auto-healing behavior', () => {
      const baselineHash = computeProblemHash(sampleProblem);

      // Mutate problem idea
      const editedProblem: ProblemInput = {
        ...sampleProblem,
        idea: 'Completely altered problem formulation about lathe gearboxes.',
      };
      expect(isProblemDirty(editedProblem, baselineHash)).toBe(true);

      // Revert back to original
      const revertedProblem: ProblemInput = {
        ...sampleProblem,
      };
      expect(isProblemDirty(revertedProblem, baselineHash)).toBe(false);

      // Whitespace variations only should NOT trigger dirty
      const whitespaceTolerantProblem: ProblemInput = {
        ...sampleProblem,
        idea: `   ${sampleProblem.idea}   \n`,
      };
      expect(isProblemDirty(whitespaceTolerantProblem, baselineHash)).toBe(false);
    });
  });

  // =========================================================================
  // 5. BACKWARDS TRANSITIONS (NON-DESTRUCTIVE EVIDENCE PRESERVATION)
  // =========================================================================
  describe('5. Backwards Transitions Preserve All Entered Data', () => {
    it('preserves all findings, experiments, and analysis when moving backwards from Stage 4 to Stage 1 (DRAFT)', () => {
      const stage4State = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        highestCompletedStage: 'FINDINGS_ENTERED',
        highestUnlockedStage: 'FINDINGS_ENTERED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1, sampleFinding2],
      });

      const result = transitionTo('DRAFT', stage4State);
      expect(result.success).toBe(true);
      expect(result.currentStage).toBe('DRAFT');
      expect(result.state.currentStage).toBe('DRAFT');
      expect(result.state.stage).toBe('DRAFT');

      // Crucial: Evidence and artifacts MUST be preserved!
      expect(result.state.findings).toHaveLength(2);
      expect(result.state.findings[0].id).toBe('FND-1');
      expect(result.state.findings[1].id).toBe('FND-2');
      expect(result.state.experiment).toEqual(sampleExperiment);
      expect(result.state.analysis).toEqual(sampleAnalysis);
      expect(result.state.problem).toEqual(sampleProblem);
      // Highest reached stage must not degrade
      expect(result.state.highestCompletedStage).toBe('FINDINGS_ENTERED');
    });

    it('preserves all findings and experiments when moving backwards from Stage 4 to Stage 2 (ANALYZED)', () => {
      const stage4State = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        highestCompletedStage: 'FINDINGS_ENTERED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1, sampleFinding2],
      });

      const result = transitionTo('ANALYZED', stage4State);
      expect(result.success).toBe(true);
      expect(result.currentStage).toBe('ANALYZED');
      expect(result.state.findings).toHaveLength(2);
      expect(result.state.experiment).toEqual(sampleExperiment);
      expect(result.state.analysis).toEqual(sampleAnalysis);
    });

    it('preserves all findings when moving backwards from Stage 4 to Stage 3 (TEST_DEFINED)', () => {
      const stage4State = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        highestCompletedStage: 'FINDINGS_ENTERED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1, sampleFinding2],
      });

      const result = transitionTo('TEST_DEFINED', stage4State);
      expect(result.success).toBe(true);
      expect(result.currentStage).toBe('TEST_DEFINED');
      expect(result.state.findings).toHaveLength(2);
      expect(result.state.experiment).toEqual(sampleExperiment);
    });

    it('preserves decisionBrief, verdict, findings, and experiment when moving backwards from Stage 5 to Stage 4, 3, 2, 1', () => {
      const stage5State = buildState({
        currentStage: 'EVIDENCE_REVIEWED',
        stage: 'EVIDENCE_REVIEWED',
        highestCompletedStage: 'EVIDENCE_REVIEWED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1, sampleFinding2],
        decisionBrief: sampleBrief,
      });

      for (const target of ['FINDINGS_ENTERED', 'TEST_DEFINED', 'ANALYZED', 'DRAFT'] as Stage[]) {
        const res = transitionTo(target, stage5State);
        expect(res.success).toBe(true);
        expect(res.currentStage).toBe(target);
        expect(res.state.findings).toHaveLength(2);
        expect(res.state.decisionBrief).toEqual(sampleBrief);
        expect(res.state.experiment).toEqual(sampleExperiment);
        expect(res.state.analysis).toEqual(sampleAnalysis);
      }
    });

    it('ensures pure immutability: transitionTo never mutates the input state object in place', () => {
      const originalState = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1],
      });

      const originalSnapshot = JSON.stringify(originalState);
      const res = transitionTo('DRAFT', originalState);

      expect(res.success).toBe(true);
      expect(Object.is(res.state, originalState)).toBe(false);
      expect(JSON.stringify(originalState)).toBe(originalSnapshot);
      expect(originalState.currentStage).toBe('FINDINGS_ENTERED');
    });
  });

  // =========================================================================
  // 6. ADVERSARIAL STRESS TEST: OVERLOADS & CROSS-MODULE BEHAVIOR
  // =========================================================================
  describe('6. Function Overloads & Legacy Discrepancies', () => {
    it('supports both (targetStage, state) and (state, targetStage) argument orders identically', () => {
      const state = buildState({
        currentStage: 'TEST_DEFINED',
        stage: 'TEST_DEFINED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
      });

      // canTransitionTo
      const forwardCheck = canTransitionTo('FINDINGS_ENTERED', state);
      const reversedCheck = canTransitionTo(state, 'FINDINGS_ENTERED');
      expect(forwardCheck.allowed).toBe(reversedCheck.allowed);

      // transitionTo
      const forwardRes = transitionTo('FINDINGS_ENTERED', state);
      const reversedRes = transitionTo(state, 'FINDINGS_ENTERED');
      expect(forwardRes.success).toBe(reversedRes.success);
      expect(forwardRes.currentStage).toBe(reversedRes.currentStage);
    });

    it('identifies discrepancies between canonical store/stateMachine.ts and domain/stateMachine.ts', () => {
      // In src/store/stateMachine.ts: Stage 3 -> Stage 4 with 0 findings is ALLOWED
      const storeState = buildState({
        currentStage: 'TEST_DEFINED',
        stage: 'TEST_DEFINED',
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
      });
      const storeResult = canTransitionTo('FINDINGS_ENTERED', storeState);
      expect(storeResult.allowed).toBe(true);

      // Check what domain/stateMachine.ts canTransitionTo does for the same state:
      const domainCaseState: CaseState = {
        id: 'test',
        stage: 'TEST_DEFINED',
        currentStage: 'TEST_DEFINED',
        problem: sampleProblem,
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
        ledger: [],
        verdict: null,
        isDemoMode: false,
        updatedAt: new Date().toISOString(),
      };

      const domainResult = canTransitionToDomain(domainCaseState, 'FINDINGS_ENTERED');
      // Empirical verification: domain/stateMachine.ts STILL blocks 0 findings, exposing a disparity with store/stateMachine.ts!
      expect(domainResult.allowed).toBe(false);
      expect(domainResult.reason).toContain('At least one evidence finding must be recorded');
    });
  });

  // =========================================================================
  // 7. COMPREHENSIVE RE-ANALYSIS LIFECYCLE & PERSISTENCE STRESS TESTS
  // =========================================================================
  describe('7. Re-analysis Lifecycle & Stress Harness', () => {
    it('simulates full problem modification -> dirty block -> re-analysis -> unblock lifecycle', () => {
      // Step 1: Initial analyzed state
      const hash1 = computeProblemHash(sampleProblem);
      const state1 = buildState({
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        problem: { ...sampleProblem },
        analyzedProblemHash: hash1,
        lastAnalyzedProblem: { ...sampleProblem },
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding1],
        isDirty: false,
        isProblemStale: false,
      });

      // Advance to Stage 5 should be allowed initially
      expect(canTransitionTo('EVIDENCE_REVIEWED', state1).allowed).toBe(true);

      // Step 2: Founder edits problem context
      const editedProblem: ProblemInput = {
        ...sampleProblem,
        context: 'During automated CNC machining runs without TA supervision.',
      };
      const dirty = computeProblemHash(editedProblem) !== state1.analyzedProblemHash;
      expect(dirty).toBe(true);

      const state2: ValidationState = {
        ...state1,
        problem: editedProblem,
        isDirty: dirty,
        isProblemStale: dirty,
      };

      // Stage 5 MUST now be blocked!
      const blockedCheck = canTransitionTo('EVIDENCE_REVIEWED', state2);
      expect(blockedCheck.allowed).toBe(false);
      expect(blockedCheck.reason).toMatch(/problem statement was modified/);
      expect(transitionTo('EVIDENCE_REVIEWED', state2).success).toBe(false);

      // Step 3: Re-analysis executed (re-syncs hash)
      const newHash = computeProblemHash(editedProblem);
      const state3: ValidationState = {
        ...state2,
        analyzedProblemHash: newHash,
        lastAnalyzedProblem: { ...editedProblem },
        isDirty: false,
        isProblemStale: false,
      };

      // Stage 5 MUST now be UNBLOCKED!
      const unblockedCheck = canTransitionTo('EVIDENCE_REVIEWED', state3);
      expect(unblockedCheck.allowed).toBe(true);
      const unblockedTransition = transitionTo('EVIDENCE_REVIEWED', state3);
      expect(unblockedTransition.success).toBe(true);
      expect(unblockedTransition.state.currentStage).toBe('EVIDENCE_REVIEWED');
    });

    it('validates schema checks and corrupted payload recovery in persistence', () => {
      expect(isValidPersistedState(null)).toBe(false);
      expect(isValidPersistedState(undefined)).toBe(false);
      expect(isValidPersistedState([])).toBe(false);
      expect(isValidPersistedState('not an object')).toBe(false);
      expect(isValidPersistedState({ version: 999 })).toBe(false); // bad version
      expect(isValidPersistedState({ version: 1, currentStage: 'INVALID_STAGE' })).toBe(false); // bad stage
      expect(isValidPersistedState({ version: 1, currentStage: 'DRAFT', problem: 'not an object' })).toBe(false);
      expect(isValidPersistedState({ version: 1, currentStage: 'DRAFT', problem: { idea: 'test' }, findings: 'not array' })).toBe(false);

      const validCandidate = buildState();
      expect(isValidPersistedState(validCandidate)).toBe(true);
    });
  });
});

