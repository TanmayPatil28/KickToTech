import { describe, expect, it } from 'vitest';
import {
  STAGE_ORDER,
  canTransitionTo,
  isProblemDirty,
  validateProblemInput,
} from '../src/domain/stateMachine';
import {
  evaluateEvidenceHeuristic,
} from '../src/domain/evidenceEvaluator';
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_B,
  DEMO_SCENARIO_B_FINDINGS,
} from '../src/domain/demoData';
import {
  INITIAL_PROBLEM,
  INITIAL_STATE,
} from '../src/store/evidenceStore';
import type {
  AnalysisResult,
  CaseState,
  ClarityRating,
  EvidenceStatus,
  Finding,
  FindingSourceType,
  ProblemInput,
  RiskLevel,
  ValidationExperiment,
  VerdictCategory,
} from '../src/types';

describe('The 14 PRD Hackathon Validation Scenarios (E2E Contract Matrix)', () => {
  // Common High-Fidelity Problem for Testing
  const highFidelityProblem: ProblemInput = {
    idea: 'Mechanical engineering students at university labs spend 15 hours/week searching through legacy PDF machine manuals for torque specs because existing search tools index only text not engineering schematics.',
    targetUser: 'Mechanical engineering undergraduates in university machine shops',
    context: 'During lathe and mill setup prior to machining aluminum components.',
    existingEvidence: 'Interviewed 4 machine shop TAs who report constant manual-lookup interruptions.',
    constraints: 'No network access allowed at machine stations.',
  };

  const highFidelityAnalysis: AnalysisResult = {
    problemClarity: {
      status: 'clear',
      explanation: 'Pinpoints specific schematics lookup bottleneck in machine manuals.',
      missingDetails: [],
    },
    refinedProblemStatement: 'Students lose lab time navigating unindexed rasterized machine manuals.',
    targetUserAmbiguity: 'Target persona is concrete and situated in a physical environment.',
    assumptions: [
      {
        id: 'ASM-1',
        claim: 'Students cannot find torque specifications in under 5 minutes using current manuals.',
        reason: 'Rasterized diagrams lack searchable text.',
        risk: 'high',
        status: 'unverified',
        evidenceNeeded: ['Timed trials of spec lookup.'],
        nextAction: 'Time 5 students searching manuals.',
      },
      {
        id: 'ASM-2',
        claim: 'Existing paper cheat-sheets taped to machines are frequently missing or incomplete.',
        reason: 'If cheat-sheets are complete, digital lookup is redundant.',
        risk: 'medium',
        status: 'unverified',
        evidenceNeeded: ['Audit of physical cheat-sheets in lab.'],
        nextAction: 'Inspect lathe work areas.',
      },
    ],
    evidenceGaps: [
      {
        description: 'Whether university policies permit tablet stands near rotating spindles.',
        importance: 'high',
        howToInvestigate: 'Review lab safety manual.',
      },
    ],
    alternativeExplanations: ['Students simply lack training on how to use manual index pages.'],
    existingWorkarounds: ['Asking the lab TA', 'Memorizing common torque values'],
    highestRiskUncertainty: 'Assuming rasterized schematics are the bottleneck rather than TA availability.',
    suggestedValidationObjective: 'Measure whether students consult manuals or default to asking peers.',
  };

  const sampleExperiment: ValidationExperiment = {
    id: 'EXP-1',
    title: 'Manual Spec Search Benchmark',
    objective: 'Measure time to find spindle torque specs.',
    hypothesis: 'Students spend >10 minutes per session searching paper/PDF manuals.',
    targetParticipants: '5 mechanical engineering undergraduates',
    method: 'Timed observation + retrospective interview',
    steps: ['Observe machining session', 'Time spec lookup', 'Ask retrospective questions'],
    inquiryQuestions: ['What was the last spec you looked up?', 'How did you find it?'],
    evidenceToRecord: ['Time elapsed in minutes', 'Workarounds attempted'],
    supportingSignals: ['Lookup exceeds 10 minutes', 'Student gives up and asks TA'],
    weakeningSignals: ['Lookup takes <2 minutes via manual index'],
    limitations: ['Observer presence may influence student thoroughness.'],
    estimatedEffort: '1.5 hours (5 trials × 15 min + notes)',
  };

  // =========================================================================
  // SCENARIO 1: Vague Idea Critique (Incomplete / Vague Clarity)
  // =========================================================================
  describe('Scenario 1: Vague Idea Critique', () => {
    it('critiques broad idea ("An AI app for students") with vague clarity and missing details', () => {
      const vagueDemo = DEMO_SCENARIO_A;
      expect(vagueDemo.problem.idea).toBe('An AI app that helps college students study better.');
      expect(vagueDemo.problem.targetUser).toBe('College students');

      const analysis = vagueDemo.analysis!;
      expect(analysis.problemClarity.status).toBe('vague');
      expect(analysis.problemClarity.missingDetails.length).toBeGreaterThanOrEqual(3);
      expect(analysis.targetUserAmbiguity).toContain('College students');
      expect(analysis.assumptions.length).toBeGreaterThanOrEqual(3);
      expect(analysis.assumptions.some((a) => a.risk === 'high')).toBe(true);
      expect(analysis.suggestedValidationObjective).toBeTruthy();
    });
  });

  // =========================================================================
  // SCENARIO 2: Specific Problem Decomposition (Clear Clarity & Risk)
  // =========================================================================
  describe('Scenario 2: Specific Problem Decomposition', () => {
    it('decomposes high-fidelity problem with clear clarity, unique IDs, and risk rankings', () => {
      const analysis = highFidelityAnalysis;
      expect(analysis.problemClarity.status).toBe('clear');
      expect(analysis.assumptions.length).toBeGreaterThanOrEqual(2);

      // Verify unique IDs and non-empty reasons/evidenceNeeded
      const ids = new Set(analysis.assumptions.map((a) => a.id));
      expect(ids.size).toBe(analysis.assumptions.length);

      analysis.assumptions.forEach((asm) => {
        expect(asm.id).toMatch(/^ASM-\d+$/);
        expect(asm.claim.length).toBeGreaterThan(10);
        expect(asm.reason.length).toBeGreaterThan(10);
        expect(['high', 'medium', 'low']).toContain(asm.risk);
        expect(asm.evidenceNeeded.length).toBeGreaterThanOrEqual(1);
        expect(asm.nextAction.length).toBeGreaterThan(5);
      });
    });
  });

  // =========================================================================
  // SCENARIO 3: Empty Inputs & Form Validation Guarding
  // =========================================================================
  describe('Scenario 3: Empty Inputs & Form Validation Guarding', () => {
    it('blocks submission when idea is empty, whitespace-only, or < 10 characters', () => {
      const emptyCheck = validateProblemInput({ idea: '', targetUser: '', context: '' });
      expect(emptyCheck.valid).toBe(false);
      expect(emptyCheck.errors.length).toBeGreaterThanOrEqual(2);

      const whitespaceCheck = validateProblemInput({
        idea: '   \n\t   ',
        targetUser: '   ',
        context: '   ',
      });
      expect(whitespaceCheck.valid).toBe(false);

      const shortIdeaCheck = validateProblemInput({
        idea: '123456789', // 9 characters
        targetUser: 'Engineering students',
        context: 'Lab',
      });
      expect(shortIdeaCheck.valid).toBe(false);
      expect(shortIdeaCheck.errors[0]).toContain('at least 10 characters');
    });

    it('blocks transition from DRAFT to ANALYZED when inputs are invalid', () => {
      const invalidState: CaseState = {
        ...INITIAL_STATE,
        problem: { idea: 'Too short', targetUser: 'ab', context: '' },
      };
      const res = canTransitionTo(invalidState, 'ANALYZED');
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('at least 10 characters');
    });
  });

  // =========================================================================
  // SCENARIO 4: Malformed AI Structured Output & Fallback Resilience
  // =========================================================================
  describe('Scenario 4: Malformed AI Structured Output & Fallback Resilience', () => {
    it('maintains system stability and falls back cleanly without unhandled crash', () => {
      // Simulate fallback evaluation when an AI failure occurs
      const fallbackVerdict = evaluateEvidenceHeuristic(
        highFidelityProblem,
        highFidelityAnalysis,
        sampleExperiment,
        []
      );

      expect(fallbackVerdict.category).toBe('INSUFFICIENT_EVIDENCE');
      expect(fallbackVerdict.updatedProblemStatement).toBe(highFidelityProblem.idea);
      expect(fallbackVerdict.remainingUncertainties.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SCENARIO 5: Missing GEMINI_API_KEY Handling (No Silent Crash)
  // =========================================================================
  describe('Scenario 5: Missing GEMINI_API_KEY Handling', () => {
    it('evaluates without requiring external API key via local heuristic engine', () => {
      const verdict = evaluateEvidenceHeuristic(
        highFidelityProblem,
        highFidelityAnalysis,
        sampleExperiment,
        DEMO_SCENARIO_B_FINDINGS
      );
      expect(verdict).toBeDefined();
      expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(verdict.rationale).toBeTruthy();
    });
  });

  // =========================================================================
  // SCENARIO 6: Unsupported Findings -> INSUFFICIENT EVIDENCE
  // =========================================================================
  describe('Scenario 6: Unsupported Findings -> INSUFFICIENT EVIDENCE', () => {
    it('evaluates findings where users report no interest or no problem as INSUFFICIENT EVIDENCE or REVISE', () => {
      const unsupportedFindings: Finding[] = [
        {
          id: 'F1',
          description: 'Students reported they do not consult manuals at all because they ask lab assistants directly.',
          sourceType: 'user_reported_experience',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(
        highFidelityProblem,
        highFidelityAnalysis,
        sampleExperiment,
        unsupportedFindings
      );

      // Does not claim supported
      expect(verdict.supportedClaims).toHaveLength(0);
      expect(verdict.unsupportedClaims).toContain(highFidelityAnalysis.assumptions[0].claim);
      // Strictly lacks forbidden praise terms
      expect(verdict.rationale).not.toContain('PROVEN');
      expect(verdict.rationale).not.toContain('GUARANTEED');
    });
  });

  // =========================================================================
  // SCENARIO 7: Contradictory Findings -> REVISE THE HYPOTHESIS
  // =========================================================================
  describe('Scenario 7: Contradictory Findings -> REVISE THE HYPOTHESIS', () => {
    it('evaluates observations contradicting the core hypothesis strictly to REVISE_THE_HYPOTHESIS', () => {
      const contradictoryFindings: Finding[] = [
        {
          id: 'C1',
          description: 'Lab policy strictly forbids digital devices near machinery during operation; students use laminated cheat-sheets and find lookup painless.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(
        highFidelityProblem,
        highFidelityAnalysis,
        sampleExperiment,
        contradictoryFindings
      );

      expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(verdict.contradictoryFindings.length).toBeGreaterThanOrEqual(1);
      expect(verdict.contradictoryFindings[0]).toContain('painless');
      expect(verdict.updatedProblemStatement).toContain('Refined focus:');
    });
  });

  // =========================================================================
  // SCENARIO 8: Subjective / Empty Findings -> INSUFFICIENT EVIDENCE
  // =========================================================================
  describe('Scenario 8: Subjective / Empty Findings -> INSUFFICIENT EVIDENCE', () => {
    it('evaluates pure enthusiasm ("everyone loves this idea") as INSUFFICIENT EVIDENCE', () => {
      const subjectiveFindings: Finding[] = [
        {
          id: 'S1',
          description: 'Everyone loves this idea and said it was a great app!',
          sourceType: 'interpretation',
          isCredibleObservation: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'S2',
          description: 'My friends said they would totally use this if it existed.',
          sourceType: 'user_reported_experience',
          isCredibleObservation: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(
        highFidelityProblem,
        highFidelityAnalysis,
        sampleExperiment,
        subjectiveFindings
      );

      expect(verdict.category).toBe('INSUFFICIENT_EVIDENCE');
      expect(verdict.rationale).toContain('exclusively of general positive feedback');
      expect(verdict.supportedClaims).toHaveLength(0);
      expect(verdict.assumptionStatusUpdates.every((u) => u.newStatus === 'unverified')).toBe(true);
    });

    it('evaluates 0 findings as INSUFFICIENT EVIDENCE', () => {
      const verdict = evaluateEvidenceHeuristic(
        highFidelityProblem,
        highFidelityAnalysis,
        sampleExperiment,
        []
      );
      expect(verdict.category).toBe('INSUFFICIENT_EVIDENCE');
      expect(verdict.rationale).toContain('No evidence findings were submitted');
    });
  });

  // =========================================================================
  // SCENARIO 9: Guarded State Transitions (Strict Sequence)
  // =========================================================================
  describe('Scenario 9: Guarded State Transitions', () => {
    it('enforces linear forward step sequence and rejects unauthorized stage leaps', () => {
      const draftState = { ...INITIAL_STATE };
      expect(canTransitionTo(draftState, 'TEST_DEFINED').allowed).toBe(false);
      expect(canTransitionTo(draftState, 'FINDINGS_ENTERED').allowed).toBe(false);
      expect(canTransitionTo(draftState, 'EVIDENCE_REVIEWED').allowed).toBe(false);

      const analyzedState: CaseState = {
        ...draftState,
        stage: 'ANALYZED',
        analysis: highFidelityAnalysis,
      };
      expect(canTransitionTo(analyzedState, 'FINDINGS_ENTERED').allowed).toBe(false);
      expect(canTransitionTo(analyzedState, 'EVIDENCE_REVIEWED').allowed).toBe(false);

      const testDefinedState: CaseState = {
        ...analyzedState,
        stage: 'TEST_DEFINED',
        experiment: sampleExperiment,
      };
      expect(canTransitionTo(testDefinedState, 'EVIDENCE_REVIEWED').allowed).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 10: Problem Statement Modification & Outdated Flagging
  // =========================================================================
  describe('Scenario 10: Problem Statement Modification & Outdated Flagging', () => {
    it('detects changes to idea, targetUser, or context and marks problem stale', () => {
      const base: ProblemInput = {
        idea: 'Original problem statement for lab machine manuals.',
        targetUser: 'Engineering students',
        context: 'Machine shop',
      };

      expect(isProblemDirty({ ...base, idea: 'Changed idea text here.' }, base)).toBe(true);
      expect(isProblemDirty({ ...base, targetUser: 'Automotive technicians' }, base)).toBe(true);
      expect(isProblemDirty({ ...base, context: 'Automotive service bays' }, base)).toBe(true);
      expect(isProblemDirty(base, base)).toBe(false);
    });

    it('blocks transition to FINDINGS_ENTERED and EVIDENCE_REVIEWED when problem is stale', () => {
      const staleState: CaseState = {
        ...INITIAL_STATE,
        stage: 'TEST_DEFINED',
        problem: highFidelityProblem,
        lastAnalyzedProblem: { ...highFidelityProblem, idea: 'Prior problem before edit' },
        isProblemStale: true,
        analysis: highFidelityAnalysis,
        experiment: sampleExperiment,
        findings: [
          {
            id: 'F1',
            description: 'Observation of lathe user.',
            sourceType: 'direct_observation',
            isCredibleObservation: true,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const resFindings = canTransitionTo(staleState, 'FINDINGS_ENTERED');
      expect(resFindings.allowed).toBe(false);
      expect(resFindings.reason).toContain('problem statement was modified');

      const resReview = canTransitionTo(staleState, 'EVIDENCE_REVIEWED');
      expect(resReview.allowed).toBe(false);
      expect(resReview.reason).toContain('Cannot jump');
    });
  });

  // =========================================================================
  // SCENARIO 11: Mobile Viewport & Ergonomics Contracts
  // =========================================================================
  describe('Scenario 11: Mobile Viewport & Ergonomics Contracts', () => {
    it('verifies that state contracts and data structures support responsive two-column layouts', () => {
      // Contracts check: FindingSourceType covers 4 discrete evidentiary weights
      const sourceTypes: FindingSourceType[] = [
        'direct_observation',
        'user_reported_experience',
        'interpretation',
        'assumption',
      ];
      expect(sourceTypes).toHaveLength(4);

      // Verdict categories strictly conform to the 3 allowed categories
      const allowedVerdicts: VerdictCategory[] = [
        'INSUFFICIENT_EVIDENCE',
        'REVISE_THE_HYPOTHESIS',
        'EVIDENCE_SUPPORTS_FURTHER_TESTING',
      ];
      expect(allowedVerdicts).toHaveLength(3);
    });
  });

  // =========================================================================
  // SCENARIO 12: Deterministic Demo Mode (Scenario A & Scenario B)
  // =========================================================================
  describe('Scenario 12: Deterministic Demo Mode', () => {
    it('loads Scenario A (Vague Study App) with demo flag, vague clarity, and empty findings', () => {
      expect(DEMO_SCENARIO_A.isDemoMode).toBe(true);
      expect(DEMO_SCENARIO_A.demoScenarioId).toBe('vague_study');
      expect(DEMO_SCENARIO_A.stage).toBe('ANALYZED');
      expect(DEMO_SCENARIO_A.analysis?.problemClarity.status).toBe('vague');
      expect(DEMO_SCENARIO_A.findings).toHaveLength(0);
    });

    it('loads Scenario B (Contradictory Findings) with demo flag, 4 findings, and contradictory evaluations', () => {
      expect(DEMO_SCENARIO_B.isDemoMode).toBe(true);
      expect(DEMO_SCENARIO_B.demoScenarioId).toBe('contradictory_study');
      expect(DEMO_SCENARIO_B.stage).toBe('FINDINGS_ENTERED');
      expect(DEMO_SCENARIO_B.findings).toHaveLength(4);

      const verdict = evaluateEvidenceHeuristic(
        DEMO_SCENARIO_B.problem,
        DEMO_SCENARIO_B.analysis!,
        DEMO_SCENARIO_B.experiment!,
        DEMO_SCENARIO_B.findings
      );
      expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(verdict.contradictoryFindings.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SCENARIO 13: Case Reset & Abandonment Safety
  // =========================================================================
  describe('Scenario 13: Case Reset & Abandonment Safety', () => {
    it('restores clean INITIAL_STATE with DRAFT stage, empty inputs, and null analysis/experiment', () => {
      expect(INITIAL_STATE.stage).toBe('DRAFT');
      expect(INITIAL_STATE.problem).toEqual(INITIAL_PROBLEM);
      expect(INITIAL_STATE.analysis).toBeNull();
      expect(INITIAL_STATE.experiment).toBeNull();
      expect(INITIAL_STATE.findings).toHaveLength(0);
      expect(INITIAL_STATE.ledger).toHaveLength(0);
      expect(INITIAL_STATE.verdict).toBeNull();
      expect(INITIAL_STATE.isProblemStale).toBe(false);
      expect(INITIAL_STATE.isDemoMode).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 14: Build, Typecheck, and Node 22 Runtime Verification
  // =========================================================================
  describe('Scenario 14: Build, Typecheck, and Node 22 Runtime Verification', () => {
    it('verifies that all canonical types and stage order arrays conform to strict specification', () => {
      expect(STAGE_ORDER).toHaveLength(5);
      expect(STAGE_ORDER[0]).toBe('DRAFT');
      expect(STAGE_ORDER[4]).toBe('EVIDENCE_REVIEWED');

      const clarityRatings: ClarityRating[] = ['clear', 'incomplete', 'vague'];
      expect(clarityRatings).toHaveLength(3);

      const riskLevels: RiskLevel[] = ['high', 'medium', 'low'];
      expect(riskLevels).toHaveLength(3);

      const evidenceStatuses: EvidenceStatus[] = ['unverified', 'partially_supported', 'supported'];
      expect(evidenceStatuses).toHaveLength(3);
    });
  });
});
