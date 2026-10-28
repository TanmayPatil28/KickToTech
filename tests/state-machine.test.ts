import { describe, expect, it } from 'vitest';
import {
  STAGE_ORDER,
  canTransitionTo,
  isProblemDirty,
  validateProblemInput,
} from '../src/domain/stateMachine';
import type {
  AnalysisResult,
  CaseState,
  Finding,
  ProblemInput,
  ValidationExperiment,
  Verdict,
  WorkflowStage,
} from '../src/types';

describe('State Machine & Workflow Transitions (Tiers 1, 2, 3)', () => {
  // Test Fixtures
  const validProblem: ProblemInput = {
    idea: 'Mechanical engineers struggle to index torque specs from PDF machine manuals.',
    targetUser: 'Mechanical engineering lab students',
    context: 'During lab machining exercises and equipment calibration.',
    existingEvidence: 'Observed 4 students search manuals for >20 minutes each during week 3.',
    constraints: 'Must work offline without cloud connectivity.',
  };

  const sampleAnalysis: AnalysisResult = {
    problemClarity: {
      status: 'clear',
      explanation: 'Problem clearly isolates a specific friction point in machine manual lookups.',
      missingDetails: [],
    },
    refinedProblemStatement: 'Students waste lab time searching static PDFs for machinery torque tolerances.',
    targetUserAmbiguity: 'Target user is specifically defined as lab students.',
    assumptions: [
      {
        id: 'ASM-1',
        claim: 'Students cannot quickly find torque values with standard PDF search tools.',
        reason: 'PDF search fails on scanned schematics and rasterized tables.',
        risk: 'high',
        status: 'unverified',
        evidenceNeeded: ['Observation of search failure during real lab sessions.'],
        nextAction: 'Time 5 students searching for a specific spec in a rasterized manual.',
      },
    ],
    evidenceGaps: [
      {
        description: 'Frequency of rasterized vs OCR-indexed manuals in curriculum.',
        importance: 'medium',
        howToInvestigate: 'Audit lab manual archive.',
      },
    ],
    alternativeExplanations: ['Students lack training on how to use standard PDF bookmarks.'],
    existingWorkarounds: ['Asking the lab TA directly', 'Taping physical cheat-sheets to machines'],
    highestRiskUncertainty: 'Assuming PDF schematics are the true bottleneck rather than lack of TA guidance.',
    suggestedValidationObjective: 'Measure search time comparing rasterized vs digital manuals.',
  };

  const sampleExperiment: ValidationExperiment = {
    id: 'EXP-1',
    title: 'Manual Spec Search Benchmark',
    objective: 'Measure time required to locate machine tolerances.',
    hypothesis: 'Students spend >10 minutes searching rasterized PDFs for basic machine settings.',
    targetParticipants: '5 mechanical engineering undergraduates',
    method: 'Timed task observation with retrospective questions',
    steps: [
      'Present student with physical lathe and machine manual PDF.',
      'Request torque setting for aluminum spindle.',
      'Record time to locate and exact search path taken.',
    ],
    inquiryQuestions: [
      'Tell me about the last time you calibrated this lathe.',
      'How did you confirm the torque specification?',
    ],
    evidenceToRecord: ['Time elapsed in seconds', 'Number of search terms attempted'],
    supportingSignals: ['Search exceeds 5 minutes', 'Student gives up and asks TA'],
    weakeningSignals: ['Student locates spec in <60 seconds via index'],
    limitations: ['Observer effect may cause students to search more diligently than normal.'],
    estimatedEffort: '1 hour (5 trials × 10 min + analysis)',
  };

  const sampleFinding: Finding = {
    id: 'FND-1',
    description: 'Observed student spent 14 minutes searching for Bridgeport mill spindle bearing preload spec.',
    sourceType: 'direct_observation',
    relatedAssumptionId: 'ASM-1',
    isCredibleObservation: true,
    createdAt: new Date().toISOString(),
  };

  const sampleVerdict: Verdict = {
    category: 'EVIDENCE_SUPPORTS_FURTHER_TESTING',
    rationale: 'Observed trials demonstrate persistent search friction in rasterized manuals.',
    updatedProblemStatement: 'Students waste substantial lab time navigating unindexed machine manuals.',
    supportedClaims: ['Students cannot quickly find torque values with standard PDF search tools.'],
    unsupportedClaims: [],
    contradictoryFindings: [],
    remainingUncertainties: ['Whether lab coordinators would permit third-party indexing software.'],
    assumptionStatusUpdates: [
      {
        id: 'ASM-1',
        newStatus: 'supported',
        reason: 'Observed search failure in timed trial.',
      },
    ],
    recommendedNextExperiment: 'Test a single-page laminated quick-reference card against digital search.',
  };

  function createBaseState(stage: WorkflowStage = 'DRAFT'): CaseState {
    return {
      id: 'case_test_1',
      stage,
      problem: { ...validProblem },
      lastAnalyzedProblem: undefined,
      isProblemStale: false,
      analysis: null,
      experiment: null,
      findings: [],
      ledger: [],
      verdict: null,
      isDemoMode: false,
      updatedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // TIER 1: Feature Coverage (>=5 per feature across inputs, transitions, etc.)
  // =========================================================================
  describe('Tier 1: Feature 1 - Problem Input Validation', () => {
    it('accepts a fully specified problem input', () => {
      const res = validateProblemInput(validProblem);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects an idea with fewer than 10 characters', () => {
      const res = validateProblemInput({
        ...validProblem,
        idea: 'Short app',
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('at least 10 characters'))).toBe(true);
    });

    it('rejects a target user with fewer than 3 characters', () => {
      const res = validateProblemInput({
        ...validProblem,
        targetUser: 'Me',
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('at least 3 characters'))).toBe(true);
    });

    it('trims whitespace when evaluating idea and targetUser lengths', () => {
      const res = validateProblemInput({
        ...validProblem,
        idea: '   123456789   ', // 9 characters trimmed
        targetUser: '  ab  ',      // 2 characters trimmed
      });
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('permits empty optional fields (existingEvidence, constraints)', () => {
      const res = validateProblemInput({
        idea: 'College students struggle to organize group study sessions across campus.',
        targetUser: 'College students',
        context: 'Campus dorms during midterms',
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });

  describe('Tier 1: Feature 2 - Stage Transitions Sequence & Guards', () => {
    it('allows transition from DRAFT to ANALYZED when problem is valid and analysis is populated', () => {
      const state: CaseState = {
        ...createBaseState('DRAFT'),
        analysis: sampleAnalysis,
      };
      const res = canTransitionTo(state, 'ANALYZED');
      expect(res.allowed).toBe(true);
    });

    it('allows transition from ANALYZED to TEST_DEFINED when analysis and experiment are present', () => {
      const state: CaseState = {
        ...createBaseState('ANALYZED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
      };
      const res = canTransitionTo(state, 'TEST_DEFINED');
      expect(res.allowed).toBe(true);
    });

    it('allows transition from TEST_DEFINED to FINDINGS_ENTERED when >= 1 finding exists', () => {
      const state: CaseState = {
        ...createBaseState('TEST_DEFINED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
      };
      const res = canTransitionTo(state, 'FINDINGS_ENTERED');
      expect(res.allowed).toBe(true);
    });

    it('allows transition from FINDINGS_ENTERED to EVIDENCE_REVIEWED when verdict is present and not stale', () => {
      const state: CaseState = {
        ...createBaseState('FINDINGS_ENTERED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
        verdict: sampleVerdict,
        isProblemStale: false,
      };
      const res = canTransitionTo(state, 'EVIDENCE_REVIEWED');
      expect(res.allowed).toBe(true);
    });

    it('always allows backwards navigation from later stages to earlier stages', () => {
      const state: CaseState = {
        ...createBaseState('EVIDENCE_REVIEWED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
        verdict: sampleVerdict,
      };
      expect(canTransitionTo(state, 'FINDINGS_ENTERED').allowed).toBe(true);
      expect(canTransitionTo(state, 'TEST_DEFINED').allowed).toBe(true);
      expect(canTransitionTo(state, 'ANALYZED').allowed).toBe(true);
      expect(canTransitionTo(state, 'DRAFT').allowed).toBe(true);
    });
  });

  describe('Tier 1: Feature 3 - Step-Skipping Rejection Guards', () => {
    it('blocks jumping from DRAFT directly to TEST_DEFINED', () => {
      const state = createBaseState('DRAFT');
      const res = canTransitionTo(state, 'TEST_DEFINED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cannot jump from DRAFT directly to TEST_DEFINED');
    });

    it('blocks jumping from DRAFT directly to FINDINGS_ENTERED', () => {
      const state = createBaseState('DRAFT');
      const res = canTransitionTo(state, 'FINDINGS_ENTERED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cannot jump');
    });

    it('blocks jumping from DRAFT directly to EVIDENCE_REVIEWED', () => {
      const state = createBaseState('DRAFT');
      const res = canTransitionTo(state, 'EVIDENCE_REVIEWED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cannot jump');
    });

    it('blocks jumping from ANALYZED directly to EVIDENCE_REVIEWED', () => {
      const state = {
        ...createBaseState('ANALYZED'),
        analysis: sampleAnalysis,
      };
      const res = canTransitionTo(state, 'EVIDENCE_REVIEWED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cannot jump');
    });

    it('blocks advancing to ANALYZED if analysis result is missing', () => {
      const state = createBaseState('DRAFT');
      const res = canTransitionTo(state, 'ANALYZED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Analysis must be completed');
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('rejects empty string inputs for all fields', () => {
      const res = validateProblemInput({
        idea: '',
        targetUser: '',
        context: '',
      });
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects whitespace-only inputs for idea and targetUser', () => {
      const res = validateProblemInput({
        idea: '          ',
        targetUser: '   \t\n   ',
        context: '   ',
      });
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('handles exact boundary lengths for idea (9 chars rejected, 10 chars accepted)', () => {
      const nineChars = validateProblemInput({
        ...validProblem,
        idea: '123456789',
      });
      expect(nineChars.valid).toBe(false);

      const tenChars = validateProblemInput({
        ...validProblem,
        idea: '1234567890',
      });
      expect(tenChars.valid).toBe(true);
    });

    it('handles exact boundary lengths for targetUser (2 chars rejected, 3 chars accepted)', () => {
      const twoChars = validateProblemInput({
        ...validProblem,
        targetUser: 'ab',
      });
      expect(twoChars.valid).toBe(false);

      const threeChars = validateProblemInput({
        ...validProblem,
        targetUser: 'abc',
      });
      expect(threeChars.valid).toBe(true);
    });

    it('accepts very long input texts (10,000+ characters) without throwing or crashing', () => {
      const longIdea = 'Problem statement: ' + 'detailed description of machine shop friction '.repeat(250);
      expect(longIdea.length).toBeGreaterThan(10000);
      const res = validateProblemInput({
        ...validProblem,
        idea: longIdea,
      });
      expect(res.valid).toBe(true);
    });

    it('blocks transition to TEST_DEFINED when experiment is missing', () => {
      const state: CaseState = {
        ...createBaseState('ANALYZED'),
        analysis: sampleAnalysis,
        experiment: null,
      };
      const res = canTransitionTo(state, 'TEST_DEFINED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('experiment must be selected');
    });

    it('blocks transition to FINDINGS_ENTERED when findings array is empty', () => {
      const state: CaseState = {
        ...createBaseState('TEST_DEFINED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
      };
      const res = canTransitionTo(state, 'FINDINGS_ENTERED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('At least one evidence finding must be recorded');
    });

    it('blocks transition to EVIDENCE_REVIEWED when verdict is null', () => {
      const state: CaseState = {
        ...createBaseState('FINDINGS_ENTERED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
        verdict: null,
      };
      const res = canTransitionTo(state, 'EVIDENCE_REVIEWED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('verdict must be generated');
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Combinations & Dirty State Invalidation
  // =========================================================================
  describe('Tier 3: Problem Modification & Dirty State Invalidation', () => {
    const baselineProblem: ProblemInput = {
      idea: 'High school debate coaches spend 10 hours a week tabulating ballots by hand.',
      targetUser: 'High school debate coaches',
      context: 'Regional weekend speech and debate tournaments.',
      existingEvidence: 'Interviewed 3 tournament directors in Ohio.',
      constraints: 'Paper ballots are mandated by state association.',
    };

    it('returns false when current problem matches lastAnalyzed problem exactly', () => {
      expect(isProblemDirty(baselineProblem, { ...baselineProblem })).toBe(false);
    });

    it('returns false when lastAnalyzed is undefined (initial analysis in progress)', () => {
      expect(isProblemDirty(baselineProblem, undefined)).toBe(false);
    });

    it('returns true when idea text is altered after analysis', () => {
      const modified = {
        ...baselineProblem,
        idea: 'High school debate coaches spend 10 hours a week finding certified debate judges.',
      };
      expect(isProblemDirty(modified, baselineProblem)).toBe(true);
    });

    it('returns true when targetUser is altered after analysis', () => {
      const modified = {
        ...baselineProblem,
        targetUser: 'College parliamentary debate judges',
      };
      expect(isProblemDirty(modified, baselineProblem)).toBe(true);
    });

    it('returns true when context is altered after analysis', () => {
      const modified = {
        ...baselineProblem,
        context: 'Virtual debate tournaments hosted over Zoom.',
      };
      expect(isProblemDirty(modified, baselineProblem)).toBe(true);
    });

    it('ignores changes in optional existingEvidence and constraints for dirty state calculation', () => {
      const modified = {
        ...baselineProblem,
        existingEvidence: 'Added 2 more interviews from Michigan.',
        constraints: 'Budgets are capped at $500 per tournament.',
      };
      expect(isProblemDirty(modified, baselineProblem)).toBe(false);
    });

    it('blocks advancing from TEST_DEFINED to FINDINGS_ENTERED when isProblemStale is true', () => {
      const staleState: CaseState = {
        ...createBaseState('TEST_DEFINED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
        isProblemStale: true,
      };
      const res = canTransitionTo(staleState, 'FINDINGS_ENTERED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('problem statement was modified after the initial analysis');
    });

    it('blocks advancing from FINDINGS_ENTERED to EVIDENCE_REVIEWED when isProblemStale is true', () => {
      const staleState: CaseState = {
        ...createBaseState('FINDINGS_ENTERED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [sampleFinding],
        verdict: sampleVerdict,
        isProblemStale: true,
      };
      const res = canTransitionTo(staleState, 'EVIDENCE_REVIEWED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cannot review verdict with a stale problem statement');
    });

    it('preserves all entered findings when navigating backward through multiple stages', () => {
      const findingsList: Finding[] = [
        sampleFinding,
        {
          id: 'FND-2',
          description: 'Second student used lathe manual without looking at schematic.',
          sourceType: 'user_reported_experience',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const stateAtReview: CaseState = {
        ...createBaseState('EVIDENCE_REVIEWED'),
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: findingsList,
        verdict: sampleVerdict,
      };

      // Navigate backwards to DRAFT
      expect(canTransitionTo(stateAtReview, 'DRAFT').allowed).toBe(true);
      // Findings remain in state object
      expect(stateAtReview.findings).toHaveLength(2);
      expect(stateAtReview.findings[0].id).toBe('FND-1');
      expect(stateAtReview.findings[1].id).toBe('FND-2');
    });

    it('validates the complete canonical STAGE_ORDER sequence', () => {
      expect(STAGE_ORDER).toEqual([
        'DRAFT',
        'ANALYZED',
        'TEST_DEFINED',
        'FINDINGS_ENTERED',
        'EVIDENCE_REVIEWED',
      ]);
    });
  });
});
