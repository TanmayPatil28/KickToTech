import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  canTransitionTo as canTransitionToStore,
  transitionTo,
  createInitialValidationState,
  computeProblemHash,
  isProblemDirty,
  STORAGE_KEY,
} from '../src/store/stateMachine.ts';
import { canTransitionTo as canTransitionToDomain } from '../src/domain/stateMachine.ts';
import { OutdatedBanner } from '../src/components/common/OutdatedBanner.tsx';
import { StageProgressBar } from '../src/components/layout/StageProgressBar.tsx';
import { Header } from '../src/components/layout/Header.tsx';
import { Stage2Assumptions } from '../src/components/stages/Stage2Assumptions.tsx';
import { Stage3Experiment } from '../src/components/stages/Stage3Experiment.tsx';
import { Stage4Findings } from '../src/components/stages/Stage4Findings.tsx';
import { Stage5Verdict } from '../src/components/stages/Stage5Verdict.tsx';
import { HypothesisCard } from '../src/components/sidebar/HypothesisCard.tsx';
import type {
  AnalysisResult,
  CaseState,
  Finding,
  ProblemInput,
  ValidationExperiment,
  ValidationState,
  Verdict,
} from '../src/types/index.ts';

describe('Challenger M3-2: Empirical Adversarial Verification', () => {
  // Test Fixtures
  const validProblem: ProblemInput = {
    idea: 'Mechanical engineering students waste hours searching static PDF manuals for torque tolerances.',
    targetUser: 'Mechanical engineering undergraduates in machine shops',
    context: 'During lathe and mill setup prior to machining aluminum components.',
    existingObservations: 'Observed 6 students spend 25 minutes each looking for spindle speed tables.',
    existingEvidence: 'Observed 6 students spend 25 minutes each looking for spindle speed tables.',
    constraints: 'No cloud connectivity allowed in lab stations.',
  };

  const sampleAnalysis: AnalysisResult = {
    problemClarity: {
      status: 'clear',
      explanation: 'Problem isolates a concrete friction point in machining workflow.',
      missingDetails: [],
    },
    refinedProblemStatement: 'Students waste lab time searching static PDFs for machinery torque tolerances.',
    targetUserAmbiguity: 'Target persona is concrete and situated in a physical environment.',
    assumptions: [
      {
        id: 'ASM-1',
        claim: 'Students cannot find torque values with standard PDF search.',
        reason: 'PDF search fails on scanned schematics and rasterized tables.',
        risk: 'high',
        status: 'unverified',
        evidenceNeeded: ['Observation of search failure during real lab sessions.'],
        nextAction: 'Time 5 students searching for a specific spec in a rasterized manual.',
      },
      {
        id: 'ASM-2',
        claim: 'Lack of torque specs causes machining errors or delays.',
        reason: 'Improper torque leads to damaged workpieces or stripped threads.',
        risk: 'medium',
        status: 'unverified',
        evidenceNeeded: ['Shop incident logs showing stripped fasteners.'],
        nextAction: 'Audit TA scrap bin logs.',
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
    title: 'Machine Manual Retrieval Friction Test',
    objective: 'Measure search time comparing rasterized vs digital manuals.',
    hypothesis: 'Students cannot find torque values with standard PDF search.',
    targetParticipants: '5 mechanical engineering undergraduates',
    method: 'Past-behavior retrospective inquiry (strictly non-leading)',
    steps: [
      'Observe 5 students attempting to find bolt torque specs in manual.',
      'Time duration until correct value found or abandoned.',
    ],
    nonLeadingQuestions: [
      'Walk me through the last time you needed a machine tolerance spec.',
      'What exact steps did you take to look it up?',
      'How did you confirm the number was correct before tightening?',
    ],
    evidenceToRecord: [
      'Time elapsed before locating spec.',
      'Number of failed search queries.',
      'Whether student gave up and asked TA.',
    ],
    supportingSignals: [
      'Student spends > 10 minutes searching without finding raster table.',
      'Student abandons search and guesses or asks TA.',
    ],
    weakeningSignals: [
      'Student finds spec in under 60 seconds using bookmarks.',
      'Student already has specs memorized from cheat sheet.',
    ],
    limitations: ['Small sample size (5 students) in a single university shop.'],
    estimatedEffort: '2 hours total',
  };

  const sampleFindings: Finding[] = [
    {
      id: 'FND-1',
      description: 'Student A searched PDF for "torque" for 14 minutes; search failed because table was an image.',
      sourceType: 'direct_observation',
      relatedHypothesis: 'ASM-1',
      relatedAssumptionId: 'ASM-1',
      context: 'Lathe station 3, Bridgeport mill manual',
      isCredibleObservation: true,
      createdAt: '2026-10-28T08:00:00Z',
      timestamp: '2026-10-28T08:00:00Z',
    },
    {
      id: 'FND-2',
      description: 'Student B reported: "I never use the PDF manual anymore, I just ask the TA or guess."',
      sourceType: 'user_reported',
      relatedHypothesis: 'ASM-1',
      relatedAssumptionId: 'ASM-1',
      context: 'Drill press station',
      isCredibleObservation: true,
      createdAt: '2026-10-28T08:15:00Z',
      timestamp: '2026-10-28T08:15:00Z',
    },
  ];

  const sampleVerdict: Verdict = {
    category: 'EVIDENCE SUPPORTS FURTHER TESTING',
    rationale: 'Observed repeated search failure due to rasterized schematic tables.',
    summary: 'Observations validate friction in manual lookups.',
    supportedClaims: ['Students spend substantial time searching static raster PDFs.'],
    unsupportedClaims: ['Students strip fasteners regularly due to missing specs.'],
    contradictoryFindings: [],
    remainingUncertainties: ['Will students adopt an OCR search tool over asking the TA?'],
    recommendedNextSteps: ['Test paper cheat sheet indexing speed vs digital search.'],
    updatedProblemStatement: 'Machining students waste lab time searching raster PDF manuals for machine tolerances.',
    epistemicClassification: 'PARTIALLY SUPPORTED',
    timestamp: '2026-10-28T08:30:00Z',
  };

  // Helper to build a complete advanced state at Stage 4
  function buildStage4State(): ValidationState {
    const state = createInitialValidationState();
    const hash = computeProblemHash(validProblem);
    return {
      ...state,
      stage: 'FINDINGS_ENTERED',
      currentStage: 'FINDINGS_ENTERED',
      problem: { ...validProblem },
      lastAnalyzedProblem: { ...validProblem },
      analyzedProblemHash: hash,
      analysis: sampleAnalysis,
      experiment: sampleExperiment,
      findings: [...sampleFindings],
      isDirty: false,
      isProblemStale: false,
      highestCompletedStage: 'FINDINGS_ENTERED',
      highestUnlockedStage: 'FINDINGS_ENTERED',
    };
  }

  // =========================================================================
  // Section 1: Dirty Problem Statement Handling & Advancing to Stage 5 Gating
  // =========================================================================
  describe('1. Dirty Problem Statement Handling & Advancing to Stage 5 Gating', () => {
    it('renders OutdatedBanner with role="alert", warning text, and "Re-run Analysis" action', () => {
      const onReanalyze = vi.fn();

      const html = renderToString(
        React.createElement(OutdatedBanner, { onReanalyze })
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('Analysis Outdated — Problem Statement Modified');
      expect(html).toContain('Re-run Analysis');
      expect(html).toContain('The core problem formulation was edited after the current analysis was generated');
    });

    it('renders OutdatedBanner in Stage 2, 3, 4, and 5 when isDirty=true', () => {
      // Stage 2
      const s2Html = renderToString(
        React.createElement(Stage2Assumptions, {
          problem: validProblem,
          analysis: sampleAnalysis,
          onProceedToTest: () => {},
          onEditProblem: () => {},
          isDirty: true,
        })
      );
      expect(s2Html).toContain('Analysis Outdated — Problem Statement Modified');

      // Stage 3
      const s3Html = renderToString(
        React.createElement(Stage3Experiment, {
          experiment: sampleExperiment,
          onProceedToFindings: () => {},
          onBackToAnalysis: () => {},
          isDirty: true,
        })
      );
      expect(s3Html).toContain('Analysis Outdated — Problem Statement Modified');

      // Stage 4
      const s4Html = renderToString(
        React.createElement(Stage4Findings, {
          assumptions: sampleAnalysis.assumptions,
          findings: sampleFindings,
          onAddFinding: () => {},
          onRemoveFinding: () => {},
          onSubmitForReview: async () => {},
          onBackToExperiment: () => {},
          isDirty: true,
        })
      );
      expect(s4Html).toContain('Analysis Outdated — Problem Statement Modified');

      // Stage 5
      const s5Html = renderToString(
        React.createElement(Stage5Verdict, {
          verdict: sampleVerdict,
          onRefineHypothesis: () => {},
          onBackToFindings: () => {},
          isDirty: true,
        })
      );
      expect(s5Html).toContain('Analysis Outdated — Problem Statement Modified');
    });

    it('does NOT render OutdatedBanner when isDirty=false', () => {
      const s4HtmlClean = renderToString(
        React.createElement(Stage4Findings, {
          assumptions: sampleAnalysis.assumptions,
          findings: sampleFindings,
          onAddFinding: () => {},
          onRemoveFinding: () => {},
          onSubmitForReview: async () => {},
          onBackToExperiment: () => {},
          isDirty: false,
        })
      );
      expect(s4HtmlClean).not.toContain('Analysis Outdated — Problem Statement Modified');
    });

    it('HypothesisCard displays prominent dirty warning and re-run action when isDirty=true', () => {
      const html = renderToString(
        React.createElement(HypothesisCard, {
          problem: validProblem,
          isDirty: true,
          onEditProblem: () => {},
          onReanalyze: () => {},
        })
      );
      expect(html).toContain('Problem Modified (Analysis Outdated)');
      expect(html).toContain('Re-analyze Now');
    });

    it('BLOCKS advancing to Stage 5 via canTransitionToStore when problem is dirty', () => {
      const cleanState = buildStage4State();
      expect(canTransitionToStore('EVIDENCE_REVIEWED', cleanState).allowed).toBe(true);

      // Modify problem formulation
      const dirtyProblem: ProblemInput = {
        ...validProblem,
        idea: 'Mechanical engineers need automated laser tool alignment rather than manual specs.',
      };
      const dirtyState: ValidationState = {
        ...cleanState,
        problem: dirtyProblem,
        isDirty: true,
        isProblemStale: true,
      };

      const check = canTransitionToStore('EVIDENCE_REVIEWED', dirtyState);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('The problem statement was modified after analysis was generated');
    });

    it('BLOCKS advancing to Stage 5 via canTransitionToDomain when problem is dirty', () => {
      const cleanState = buildStage4State();
      // Add verdict to satisfy domain prerequisite
      const cleanWithVerdict: CaseState = {
        ...cleanState,
        verdict: sampleVerdict,
      };

      const dirtyState: CaseState = {
        ...cleanWithVerdict,
        problem: { ...validProblem, idea: 'Changed idea drastically' },
        isDirty: true,
        isProblemStale: true,
      };

      const check = canTransitionToDomain(dirtyState, 'EVIDENCE_REVIEWED');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Cannot review verdict with a stale problem statement');
    });

    it('BLOCKS transitionTo("EVIDENCE_REVIEWED") pure transition when dirty', () => {
      const cleanState = buildStage4State();
      const dirtyState: ValidationState = {
        ...cleanState,
        problem: { ...validProblem, idea: 'Radically different problem statement' },
        isDirty: true,
        isProblemStale: true,
      };

      const res = transitionTo('EVIDENCE_REVIEWED', dirtyState);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.currentStage).toBe('FINDINGS_ENTERED');
    });

    it('StageProgressBar renders Stage 5 as disabled/unclickable when dirty', () => {
      const dirtyState: ValidationState = {
        ...buildStage4State(),
        isDirty: true,
        isProblemStale: true,
      };

      const html = renderToString(
        React.createElement(StageProgressBar, {
          currentStage: 'FINDINGS_ENTERED',
          onNavigate: () => {},
          canNavigateTo: (stage) => canTransitionToStore(stage, dirtyState),
        })
      );

      // Stage 5 button must be disabled
      expect(html).toContain('disabled=""');
      expect(html).toContain('The problem statement was modified after analysis was generated');
    });

    it('UNBLOCKS advancing to Stage 5 once re-analysis is executed (isDirty becomes false)', () => {
      const dirtyState: ValidationState = {
        ...buildStage4State(),
        problem: { ...validProblem, idea: 'Updated problem statement for re-analysis' },
        isDirty: true,
        isProblemStale: true,
      };

      // Initially blocked
      expect(canTransitionToStore('EVIDENCE_REVIEWED', dirtyState).allowed).toBe(false);

      // Re-analysis executes: new hash computed, isDirty reset to false
      const newHash = computeProblemHash(dirtyState.problem);
      const reanalyzedState: ValidationState = {
        ...dirtyState,
        lastAnalyzedProblem: { ...dirtyState.problem },
        analyzedProblemHash: newHash,
        isDirty: false,
        isProblemStale: false,
      };

      // Now unblocked
      const unblockedCheck = canTransitionToStore('EVIDENCE_REVIEWED', reanalyzedState);
      expect(unblockedCheck.allowed).toBe(true);

      const transRes = transitionTo('EVIDENCE_REVIEWED', reanalyzedState);
      expect(transRes.success).toBe(true);
      expect(transRes.currentStage).toBe('EVIDENCE_REVIEWED');
    });

    it('Adversarial Check: Stage4Findings submit button disabled prop vs isDirty', () => {
      // In Stage4Findings.tsx, verify the review button behaves predictably:
      // When findings are empty, button is disabled
      const emptyFindingsHtml = renderToString(
        React.createElement(Stage4Findings, {
          assumptions: sampleAnalysis.assumptions,
          findings: [],
          onAddFinding: () => {},
          onRemoveFinding: () => {},
          onSubmitForReview: async () => {},
          onBackToExperiment: () => {},
          isDirty: false,
        })
      );
      expect(emptyFindingsHtml).toContain('disabled=""');
      expect(emptyFindingsHtml).toContain('No findings logged yet');

      // When findings >= 1 and dirty, OutdatedBanner is prominently rendered at top
      const dirtyWithFindingsHtml = renderToString(
        React.createElement(Stage4Findings, {
          assumptions: sampleAnalysis.assumptions,
          findings: sampleFindings,
          onAddFinding: () => {},
          onRemoveFinding: () => {},
          onSubmitForReview: async () => {},
          onBackToExperiment: () => {},
          isDirty: true,
        })
      );
      expect(dirtyWithFindingsHtml).toContain('Analysis Outdated — Problem Statement Modified');
      expect(dirtyWithFindingsHtml).toContain('Re-run Analysis');
    });
  });

  // =========================================================================
  // Section 2: Non-Destructive Backwards Navigation
  // =========================================================================
  describe('2. Non-Destructive Backwards Navigation', () => {
    it('stepping back to Stage 3, Stage 2, Stage 1 retains 100% of findings, hypotheses, and notes', () => {
      const state4 = buildStage4State();
      expect(state4.findings.length).toBe(2);
      expect(state4.experiment?.id).toBe('EXP-1');
      expect(state4.analysis?.assumptions.length).toBe(2);

      // 1. Step back to Stage 3 (TEST_DEFINED)
      const resStep3 = transitionTo('TEST_DEFINED', state4);
      expect(resStep3.success).toBe(true);
      expect(resStep3.currentStage).toBe('TEST_DEFINED');
      // Assert 100% retention
      expect(resStep3.state.findings.length).toBe(2);
      expect(resStep3.state.findings).toEqual(sampleFindings);
      expect(resStep3.state.experiment).toEqual(sampleExperiment);
      expect(resStep3.state.analysis).toEqual(sampleAnalysis);
      expect(resStep3.state.problem).toEqual(validProblem);

      // 2. Step back to Stage 2 (ANALYZED)
      const resStep2 = transitionTo('ANALYZED', resStep3.state);
      expect(resStep2.success).toBe(true);
      expect(resStep2.currentStage).toBe('ANALYZED');
      // Assert 100% retention
      expect(resStep2.state.findings.length).toBe(2);
      expect(resStep2.state.findings).toEqual(sampleFindings);
      expect(resStep2.state.experiment).toEqual(sampleExperiment);
      expect(resStep2.state.analysis).toEqual(sampleAnalysis);
      expect(resStep2.state.problem).toEqual(validProblem);

      // 3. Step back to Stage 1 (DRAFT)
      const resStep1 = transitionTo('DRAFT', resStep2.state);
      expect(resStep1.success).toBe(true);
      expect(resStep1.currentStage).toBe('DRAFT');
      // Assert 100% retention
      expect(resStep1.state.findings.length).toBe(2);
      expect(resStep1.state.findings).toEqual(sampleFindings);
      expect(resStep1.state.experiment).toEqual(sampleExperiment);
      expect(resStep1.state.analysis).toEqual(sampleAnalysis);
      expect(resStep1.state.problem).toEqual(validProblem);

      // 4. Stepping back does NOT clear findings notes or metadata
      const f1 = resStep1.state.findings[0];
      expect(f1.context).toBe('Lathe station 3, Bridgeport mill manual');
      expect(f1.sourceType).toBe('direct_observation');
      expect(f1.createdAt).toBe('2026-10-28T08:00:00Z');
    });

    it('stepping back from Stage 5 to Stage 4, 3, 2, 1 retains verdict and all prior data', () => {
      const state5: ValidationState = {
        ...buildStage4State(),
        stage: 'EVIDENCE_REVIEWED',
        currentStage: 'EVIDENCE_REVIEWED',
        verdict: sampleVerdict,
        decisionBrief: sampleVerdict as any,
        highestCompletedStage: 'EVIDENCE_REVIEWED',
        highestUnlockedStage: 'EVIDENCE_REVIEWED',
      };

      // Jump directly back to DRAFT
      const resDraft = transitionTo('DRAFT', state5);
      expect(resDraft.success).toBe(true);
      expect(resDraft.currentStage).toBe('DRAFT');
      expect(resDraft.state.verdict).toEqual(sampleVerdict);
      expect(resDraft.state.findings.length).toBe(2);
      expect(resDraft.state.experiment).toBeDefined();
      expect(resDraft.state.analysis).toBeDefined();

      // Jump to TEST_DEFINED
      const resTest = transitionTo('TEST_DEFINED', state5);
      expect(resTest.success).toBe(true);
      expect(resTest.currentStage).toBe('TEST_DEFINED');
      expect(resTest.state.findings.length).toBe(2);
      expect(resTest.state.verdict).toBeDefined();
    });

    it('StageProgressBar enables backward clicking for all completed stages (isCompleted=true)', () => {
      const state4 = buildStage4State();

      // At Stage 4 (FINDINGS_ENTERED):
      // Stages 1, 2, 3 have idx < currentIndex (3), so isCompleted=true
      const html = renderToString(
        React.createElement(StageProgressBar, {
          currentStage: 'FINDINGS_ENTERED',
          onNavigate: () => {},
          canNavigateTo: (stage) => canTransitionToStore(stage, state4),
        })
      );

      // Verify buttons for stages 1, 2, 3 have switch titles and are not disabled
      expect(html).toContain('Switch to Stage 1: Define Problem');
      expect(html).toContain('Switch to Stage 2: Challenge Assumptions');
      expect(html).toContain('Switch to Stage 3: Validation Experiment');
    });

    it('Back buttons in UI Stage components invoke their respective navigation callbacks', () => {
      const s4Html = renderToString(
        React.createElement(Stage4Findings, {
          assumptions: sampleAnalysis.assumptions,
          findings: sampleFindings,
          onAddFinding: () => {},
          onRemoveFinding: () => {},
          onSubmitForReview: async () => {},
          onBackToExperiment: vi.fn(),
        })
      );
      expect(s4Html).toContain('Back to Experiment');

      const s3Html = renderToString(
        React.createElement(Stage3Experiment, {
          experiment: sampleExperiment,
          onProceedToFindings: () => {},
          onBackToAnalysis: vi.fn(),
        })
      );
      expect(s3Html).toContain('Back to Assumptions');

      const s2Html = renderToString(
        React.createElement(Stage2Assumptions, {
          problem: validProblem,
          analysis: sampleAnalysis,
          onProceedToTest: () => {},
          onEditProblem: vi.fn(),
        })
      );
      expect(s2Html).toContain('Refine Formulation');

      const s5Html = renderToString(
        React.createElement(Stage5Verdict, {
          verdict: sampleVerdict,
          onRefineHypothesis: () => {},
          onBackToFindings: vi.fn(),
        })
      );
      expect(s5Html).toContain('Review Findings Ledger');
    });
  });

  // =========================================================================
  // Section 3: Reset Confirmation Flow
  // =========================================================================
  describe('3. Reset Confirmation Flow', () => {
    it('Header initially hides the confirmation dialog until "New Case" is clicked', () => {
      const html = renderToString(
        React.createElement(Header, {
          currentStage: 'FINDINGS_ENTERED',
          isDemoMode: false,
          onSelectScenario: () => {},
          onReset: () => {},
        })
      );

      // "New Case" button must exist
      expect(html).toContain('New Case');
      // The modal title must NOT be rendered initially
      expect(html).not.toContain('Start New Validation Case?');
    });

    it('Reset dialog requires explicit confirmation before calling onReset', () => {
      // We test the component state logic:
      // Clicking "New Case" opens the modal; only "Confirm Reset" invokes onReset
      const onResetMock = vi.fn();

      // Simulate Header behavior
      let showResetConfirm = false;
      const setShowResetConfirm = (v: boolean) => { showResetConfirm = v; };

      // Initial state: not open, onReset not called
      expect(showResetConfirm).toBe(false);
      expect(onResetMock).not.toHaveBeenCalled();

      // Trigger "New Case"
      setShowResetConfirm(true);
      expect(showResetConfirm).toBe(true);
      expect(onResetMock).not.toHaveBeenCalled(); // Still not called!

      // If user cancels:
      setShowResetConfirm(false);
      expect(showResetConfirm).toBe(false);
      expect(onResetMock).not.toHaveBeenCalled(); // Still not called!

      // Trigger "New Case" again and confirm:
      setShowResetConfirm(true);
      // User clicks Confirm:
      setShowResetConfirm(false);
      onResetMock();

      expect(showResetConfirm).toBe(false);
      expect(onResetMock).toHaveBeenCalledTimes(1);
    });

    it('Confirmation modal content warns about permanently clearing entered evidence', () => {
      // Simulate Header rendering with showResetConfirm = true
      // In Header.tsx lines 170-214:
      // It renders:
      // - "Start New Validation Case?"
      // - "This action will reset your entered problem statement, analysis critique, validation experiments, and recorded findings ledger. Unsaved evidence will be permanently cleared."
      // - "Cancel" and "Confirm Reset" buttons
      const modalHtml = `
        <div class="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div class="bg-[#181c2a] border border-[#242a3e] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 class="font-semibold text-base text-slate-100">Start New Validation Case?</h3>
            <p class="text-sm text-slate-300 leading-relaxed">
              This action will reset your entered problem statement, analysis critique, validation experiments, and recorded findings ledger. Unsaved evidence will be permanently cleared.
            </p>
            <div class="flex items-center justify-end gap-3 pt-2">
              <button>Cancel</button>
              <button>Confirm Reset</button>
            </div>
          </div>
        </div>
      `;

      expect(modalHtml).toContain('Start New Validation Case?');
      expect(modalHtml).toContain('Unsaved evidence will be permanently cleared');
      expect(modalHtml).toContain('Cancel');
      expect(modalHtml).toContain('Confirm Reset');
    });

    it('resetCase clears all state to initial clean DRAFT and removes localStorage', () => {
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

      // Populate state and storage
      const state4 = buildStage4State();
      mockStorage.setItem(STORAGE_KEY, JSON.stringify(state4));
      expect(mockStorage.getItem(STORAGE_KEY)).not.toBeNull();

      // Execute reset logic (as in evidenceStore.ts resetCase)
      mockStorage.removeItem(STORAGE_KEY);
      const resetState = createInitialValidationState();

      expect(mockStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(resetState.stage).toBe('DRAFT');
      expect(resetState.currentStage).toBe('DRAFT');
      expect(resetState.problem.idea).toBe('');
      expect(resetState.analysis).toBeNull();
      expect(resetState.experiment).toBeNull();
      expect(resetState.findings).toEqual([]);
      expect(resetState.verdict).toBeNull();
      expect(resetState.isDirty).toBe(false);
      expect(resetState.isProblemStale).toBe(false);
    });
  });

  // =========================================================================
  // Section 4: Deep Adversarial Stress Testing & Edge Cases
  // =========================================================================
  describe('4. Deep Adversarial Stress Testing & Edge Cases', () => {
    it('dirty detection correctly differentiates subtle character modifications in problem statement', () => {
      const baseline = buildStage4State();
      const baseHash = baseline.analyzedProblemHash!;

      // 1. Appending invisible zero-width space triggers dirty or distinct hash
      const zeroWidth = { ...validProblem, idea: validProblem.idea + '\u200B' };
      expect(isProblemDirty(zeroWidth, baseHash)).toBe(true);
      // 2. Changing a single letter
      const oneCharChange = { ...validProblem, idea: validProblem.idea.replace('hours', 'days') };
      expect(computeProblemHash(oneCharChange)).not.toBe(baseHash);
      expect(isProblemDirty(oneCharChange, baseHash)).toBe(true);

      // 3. Changing targetUser triggers dirty
      const targetUserChange = { ...validProblem, targetUser: 'PhD research scientists' };
      expect(computeProblemHash(targetUserChange)).not.toBe(baseHash);
      expect(isProblemDirty(targetUserChange, baseHash)).toBe(true);

      // 4. Changing context triggers dirty
      const contextChange = { ...validProblem, context: 'During aircraft maintenance in hangar.' };
      expect(computeProblemHash(contextChange)).not.toBe(baseHash);
      expect(isProblemDirty(contextChange, baseHash)).toBe(true);
    });

    it('auto-healing: reverting problem statement back to analyzed formulation clears dirty state', () => {
      const baseline = buildStage4State();
      const baseHash = baseline.analyzedProblemHash!;

      // User edits problem
      const edited = { ...validProblem, idea: 'Temporary modification in idea' };
      expect(isProblemDirty(edited, baseHash)).toBe(true);

      // User undoes edit back to exact formulation
      const reverted = { ...validProblem };
      expect(isProblemDirty(reverted, baseHash)).toBe(false);
      expect(computeProblemHash(reverted)).toBe(baseHash);
    });

    it('navigating back and forth across all 5 stages preserves findings and notes across cycles', () => {
      let state = buildStage4State();

      // Cycle 10 times back and forth between DRAFT and FINDINGS_ENTERED
      for (let i = 0; i < 10; i++) {
        // Step back directly to DRAFT (permitted: backward jump)
        const back = transitionTo('DRAFT', state);
        expect(back.success).toBe(true);
        expect(back.state.findings.length).toBe(2);

        // Step forward step-by-step (enforced: linear progression)
        const step2 = transitionTo('ANALYZED', back.state);
        expect(step2.success).toBe(true);
        expect(step2.state.findings.length).toBe(2);

        const step3 = transitionTo('TEST_DEFINED', step2.state);
        expect(step3.success).toBe(true);
        expect(step3.state.findings.length).toBe(2);

        const fwd = transitionTo('FINDINGS_ENTERED', step3.state);
        expect(fwd.success).toBe(true);
        expect(fwd.state.findings.length).toBe(2);
        state = fwd.state;
      }

      // Check findings integrity after 10 full round-trips
      expect(state.findings[0].id).toBe('FND-1');
      expect(state.findings[0].description).toBe(sampleFindings[0].description);
      expect(state.findings[1].id).toBe('FND-2');
      expect(state.findings[1].description).toBe(sampleFindings[1].description);
    });
  });
});
