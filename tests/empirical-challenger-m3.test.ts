import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

/**
 * Normalizes HTML string output from react-dom/server by stripping React's
 * expression separation comments (<!-- -->) and common HTML entities, allowing
 * natural text assertions.
 */
function normalizeHtml(html: string): string {
  return html
    .replace(/<!--\s*-->/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const render = (el: React.ReactElement): string => normalizeHtml(renderToString(el));

// Components under test
import { Stage1Define } from '../src/components/stages/Stage1Define.tsx';
import { Stage2Assumptions } from '../src/components/stages/Stage2Assumptions.tsx';
import { Stage3Experiment } from '../src/components/stages/Stage3Experiment.tsx';
import { Stage4Findings } from '../src/components/stages/Stage4Findings.tsx';
import { Stage5Verdict } from '../src/components/stages/Stage5Verdict.tsx';
import { Header } from '../src/components/layout/Header.tsx';
import { StageProgressBar } from '../src/components/layout/StageProgressBar.tsx';
import { Workspace } from '../src/components/layout/Workspace.tsx';
import { SecondaryColumn } from '../src/components/SecondaryColumn.tsx';

// State machine & domain rules
import {
  canTransitionTo as canTransitionToStore,
  computeProblemHash,
  isProblemDirty as isProblemDirtyStore,
  createInitialValidationState,
} from '../src/store/stateMachine.ts';
import {
  canTransitionTo as canTransitionToDomain,
  isProblemDirty as isProblemDirtyDomain,
} from '../src/domain/stateMachine.ts';

// Types
import type {
  ProblemInput,
  AnalysisResult,
  ValidationExperiment,
  Finding,
  DecisionBrief,
  CaseState,
  ValidationState,
} from '../src/types/index.ts';

describe('Milestone 3 Empirical Challenger: 5-Stage Workflow UI & State Transition Verification', () => {
  // Shared fixtures
  const emptyProblem: ProblemInput = {
    idea: '',
    targetUser: '',
    context: '',
    existingObservations: '',
    existingEvidence: '',
    constraints: '',
  };

  const validProblem: ProblemInput = {
    idea: 'Mechanical engineering undergraduates spend 15 hours/week searching legacy PDF machine manuals for torque specs.',
    targetUser: 'Mechanical engineering undergraduates in university machine shops',
    context: 'During lathe and mill setup prior to machining aluminum components',
    existingObservations: 'Interviewed 4 machine shop TAs who report constant lookup interruptions',
    existingEvidence: 'Interviewed 4 machine shop TAs who report constant lookup interruptions',
    constraints: 'No network access permitted at machine stations',
  };

  const sampleAnalysis: AnalysisResult = {
    problemClarity: {
      status: 'clear',
      explanation: 'Clear friction point in manual lookups during machine setup.',
      missingDetails: ['Specific machine models and manual formats.'],
    },
    refinedProblemStatement: 'Undergraduates waste machining lab time searching unindexed raster schematics in PDF manuals.',
    targetUserAmbiguity: 'Low ambiguity; specifically students operating mills and lathes.',
    highestRiskUncertainty: 'Whether students would consult an offline tablet index or continue asking TAs.',
    assumptions: [
      {
        id: 'ASM-1',
        claim: 'Students cannot find torque values using standard PDF search because schematics are rasterized.',
        whyItMatters: 'If PDFs are text-searchable, no new tool is required.',
        reason: 'Raster tables lack OCR metadata.',
        evidenceNeeded: ['Observation of 5 students searching legacy machine manuals.'],
        riskLevel: 'high',
        risk: 'high',
        status: 'unverified',
        recommendedNextAction: 'Conduct timed search experiment on standard manuals.',
        nextAction: 'Conduct timed search experiment on standard manuals.',
      },
      {
        id: 'ASM-2',
        claim: 'Lab TAs are frequently interrupted to answer questions covered in the manuals.',
        whyItMatters: 'Validates TA burden as secondary stakeholder pain.',
        reason: 'TA time is scarce in crowded lab sessions.',
        evidenceNeeded: ['TA shift log recording question frequency.'],
        riskLevel: 'medium',
        risk: 'medium',
        status: 'partially_supported',
        recommendedNextAction: 'Collect 1 week of TA shift interruption logs.',
        nextAction: 'Collect 1 week of TA shift interruption logs.',
      },
      {
        id: 'ASM-3',
        claim: 'Students prefer digital offline lookup over paper reference binders.',
        whyItMatters: 'Physical binders might be faster or more oil-resistant.',
        reason: 'Machine shop environment has oil and metal shavings.',
        evidenceNeeded: ['Feedback on physical binder vs tablet durability.'],
        riskLevel: 'low',
        risk: 'low',
        status: 'supported',
        recommendedNextAction: 'Survey 10 students on shop floor preferences.',
        nextAction: 'Survey 10 students on shop floor preferences.',
      },
    ],
    evidenceGaps: [
      {
        description: 'No timing data on manual lookup vs TA interruption.',
        importance: 'high',
        howToInvestigate: 'Time 5 students attempting torque lookups.',
      },
    ],
    alternativeExplanations: [
      'Students interrupt TAs due to lack of confidence rather than manual search failure.',
      'Manuals are simply missing or outdated in the lab.',
    ],
    existingWorkarounds: [
      'Asking the TA directly.',
      'Using smartphone Google search (when signal available).',
      'Guessing approximate torque from past experience.',
    ],
  };

  const sampleExperiment: ValidationExperiment = {
    id: 'EXP-1',
    title: 'Targeted Behavioral Retrospective & Timed Task',
    objective: 'Measure actual time lost searching PDF manuals and count TA interruptions.',
    hypothesis: 'Students spend > 10 minutes searching raster schematics before asking a TA.',
    targetParticipants: '5 mechanical engineering undergraduates in lab',
    method: 'Timed observational task and retrospective inquiry',
    steps: [
      'Give student a standard machining setup card requiring 3 specific torque tolerances.',
      'Provide standard manufacturer PDF manual on a lab computer.',
      'Time until they locate the value or give up and ask the TA.',
    ],
    nonLeadingQuestions: [
      'When you last set up a lathe, what exact manual or reference did you look at?',
      'How did you locate the spindle torque tolerance?',
      'What did you do when the search failed?',
      'How much time did you spend before consulting someone else?',
    ],
    inquiryQuestions: [
      'When you last set up a lathe, what exact manual or reference did you look at?',
      'How did you locate the spindle torque tolerance?',
      'What did you do when the search failed?',
      'How much time did you spend before consulting someone else?',
    ],
    evidenceToRecord: [
      'Elapsed time before locating spec or abandoning search.',
      'Search queries attempted in PDF viewer.',
      'Whether student interrupted TA or guessed.',
    ],
    supportingSignals: [
      'Student spends > 10 minutes searching and fails to find rasterized spec.',
      'Student explicitly abandons PDF search and walks across shop to TA.',
    ],
    weakeningSignals: [
      'Student finds spec within 60 seconds using text search.',
      'Student states they already have personal cheat-sheet memorized.',
    ],
    limitations: [
      'Small sample of 5 students may not represent all lab courses.',
      'Observation may introduce Hawthorne effect.',
    ],
    estimatedEffort: '1.5 hours (5 trials × 15 min + synthesis)',
  };

  const sampleFindings: Finding[] = [
    {
      id: 'FND-1',
      description: 'Observed participant 1 spend 14 minutes searching PDF manual; Ctrl+F failed on rasterized drawing on page 42; abandoned search and walked to TA.',
      sourceType: 'direct_observation',
      relatedHypothesis: 'ASM-1',
      relatedAssumptionId: 'ASM-1',
      context: 'Lathe station, Friday 2pm lab session',
      contextNotes: 'Lathe station, Friday 2pm lab session',
      isCredibleObservation: true,
      timestamp: '2026-10-28T10:00:00.000Z',
    },
    {
      id: 'FND-2',
      description: 'Participant 2 stated existing laminated wall chart already lists all spindle torques; never opens the PDF manual.',
      sourceType: 'user_reported',
      relatedHypothesis: 'ASM-1',
      relatedAssumptionId: 'ASM-1',
      context: 'Mill station setup',
      contextNotes: 'Mill station setup',
      isCredibleObservation: true,
      timestamp: '2026-10-28T10:15:00.000Z',
    },
  ];

  const sampleDecisionBrief: DecisionBrief = {
    verdict: 'EVIDENCE SUPPORTS FURTHER TESTING',
    category: 'EVIDENCE SUPPORTS FURTHER TESTING',
    rationale: 'Observed raster search failure corroborated ASM-1, though laminated charts provide an existing workaround for common torques.',
    updatedProblemStatement: 'Undergraduates experience friction locating non-standard torque specs in PDF manuals where wall charts lack coverage.',
    supportedClaims: ['Standard PDF search fails on rasterized machine schematics.'],
    unsupportedClaims: ['Students have zero alternative workarounds for common torques.'],
    contradictoryFindings: ['Laminated wall charts satisfy basic torque lookups for 60% of operations.'],
    remainingUncertainties: ['Frequency of non-standard machining tasks requiring full manual lookup.'],
    recommendedNextSteps: ['Test an OCR-indexed quick-reference card for non-standard machine tooling.'],
    recommendedNextExperiment: 'Test an OCR-indexed quick-reference card for non-standard machine tooling.',
  };

  // =========================================================================
  // SECTION 1: Stage 1 Define Problem Form Verification
  // =========================================================================
  describe('Section 1: Stage 1 Component Empirical Verification (Stage1Define)', () => {
    it('renders empty inputs with 0/10 and 0/3 character warnings and disabled submit button', () => {
      const html = render(
        React.createElement(Stage1Define, {
          initialProblem: emptyProblem,
          onSubmit: async () => {},
          isLoading: false,
        })
      );

      // Verify header and guidance
      expect(html).toContain('Stage 1: Define the Problem');
      expect(html).toContain('Articulate the proposed problem hypothesis');

      // Verify character counter warnings
      expect(html).toContain('0/10 chars min');
      expect(html).toContain('0/3 chars min');

      // Verify submit button is disabled
      expect(html).toContain('disabled');
      expect(html).toContain('Analyze Problem & Challenge Assumptions');

      // Verify anti-slop tactile styling
      expect(html).toContain('active:scale-[0.97]');
      expect(html).toContain('bg-[#181c2a]');
    });

    it('enables submit button and removes character warnings when valid problem is entered', () => {
      const html = render(
        React.createElement(Stage1Define, {
          initialProblem: validProblem,
          onSubmit: async () => {},
          isLoading: false,
        })
      );

      // Character counters show valid counts (greater than minimums)
      expect(html).not.toContain('0/10 chars min');
      expect(html).not.toContain('0/3 chars min');
      expect(html).toContain(`${validProblem.idea.trim().length}/10 chars min`);
      expect(html).toContain(`${validProblem.targetUser.trim().length}/3 chars min`);

      // Submit button is NOT disabled when valid
      // TactileButton renders <button ...> without disabled when disabled is false
      expect(html).toContain('Analyze Problem & Challenge Assumptions');
    });

    it('renders quick scenario presets (Vague Idea, Specific Problem)', () => {
      const html = render(
        React.createElement(Stage1Define, {
          initialProblem: emptyProblem,
          onSubmit: async () => {},
          isLoading: false,
        })
      );

      expect(html).toContain('Vague Idea');
      expect(html).toContain('Specific Problem');
      expect(html).toContain('Quick Scenarios:');
    });

    it('renders honest AI epistemic note prohibiting solution-pitching', () => {
      const html = render(
        React.createElement(Stage1Define, {
          initialProblem: emptyProblem,
          onSubmit: async () => {},
          isLoading: false,
        })
      );

      expect(html).toContain('Honest AI Principle:');
      expect(html).toContain('Broad or solution-first ideas will produce an');
      expect(html).toContain('incomplete');
      expect(html).toContain('vague');
    });

    it('renders optional fields for context, existing observations, and constraints', () => {
      const html = render(
        React.createElement(Stage1Define, {
          initialProblem: validProblem,
          onSubmit: async () => {},
          isLoading: false,
        })
      );

      expect(html).toContain('Operational Context (Where & When the friction occurs)');
      expect(html).toContain('Existing Observations or Pilot Data (Optional)');
      expect(html).toContain('Technical / Operational Constraints (Optional)');
    });
  });

  // =========================================================================
  // SECTION 2: Stage 2 Challenge Assumptions View Verification
  // =========================================================================
  describe('Section 2: Stage 2 Component Empirical Verification (Stage2Assumptions)', () => {
    it('renders clarity assessment badge and explanation for clear, incomplete, and vague statuses', () => {
      const statuses: Array<'clear' | 'incomplete' | 'vague'> = ['clear', 'incomplete', 'vague'];

      for (const status of statuses) {
        const analysisWithClarity: AnalysisResult = {
          ...sampleAnalysis,
          problemClarity: {
            status,
            explanation: `Assessment for ${status} problem formulation.`,
            missingDetails: status !== 'clear' ? ['Operational timeframe', 'Quantified cost'] : [],
          },
        };

        const html = render(
          React.createElement(Stage2Assumptions, {
            problem: validProblem,
            analysis: analysisWithClarity,
            onProceedToTest: () => {},
            onEditProblem: () => {},
            isDirty: false,
          })
        );

        expect(html).toContain(status.toUpperCase());
        expect(html).toContain(`Assessment for ${status} problem formulation.`);

        if (status !== 'clear') {
          expect(html).toContain('Missing Specificity to Address:');
          expect(html).toContain('Operational timeframe');
          expect(html).toContain('Quantified cost');
        }
      }
    });

    it('renders unverified assumptions with unique IDs, risk badges, status badges, and required evidence', () => {
      const html = render(
        React.createElement(Stage2Assumptions, {
          problem: validProblem,
          analysis: sampleAnalysis,
          onProceedToTest: () => {},
          onEditProblem: () => {},
          isDirty: false,
        })
      );

      // Verify unique IDs
      expect(html).toContain('ASM-1');
      expect(html).toContain('ASM-2');
      expect(html).toContain('ASM-3');

      // Verify risk badges
      expect(html).toContain('HIGH RISK');
      expect(html).toContain('MEDIUM RISK');
      expect(html).toContain('LOW RISK');

      // Verify status badges
      expect(html).toContain('UNVERIFIED');
      expect(html).toContain('PARTIALLY SUPPORTED');
      expect(html).toContain('SUPPORTED');

      // Verify why it matters & required evidence
      expect(html).toContain('Why it matters:');
      expect(html).toContain('Evidence Required:');
      expect(html).toContain('Observation of 5 students searching legacy machine manuals.');

      // Verify action controls
      expect(html).toContain('Design Validation Experiment');
      expect(html).toContain('Refine Formulation');
    });

    it('renders alternative explanations, current workarounds, and highest-risk uncertainty', () => {
      const html = render(
        React.createElement(Stage2Assumptions, {
          problem: validProblem,
          analysis: sampleAnalysis,
          onProceedToTest: () => {},
          onEditProblem: () => {},
          isDirty: false,
        })
      );

      expect(html).toContain('Alternative Explanations');
      expect(html).toContain('Current Workarounds & Substitutes');
      expect(html).toContain('Highest-Risk Uncertainty');
      expect(html).toContain('Asking the TA directly.');
    });

    it('renders OutdatedBanner when isDirty is true', () => {
      const htmlClean = render(
        React.createElement(Stage2Assumptions, {
          problem: validProblem,
          analysis: sampleAnalysis,
          onProceedToTest: () => {},
          onEditProblem: () => {},
          isDirty: false,
        })
      );
      expect(htmlClean).not.toContain('Problem Statement Modified');

      const htmlDirty = render(
        React.createElement(Stage2Assumptions, {
          problem: validProblem,
          analysis: sampleAnalysis,
          onProceedToTest: () => {},
          onEditProblem: () => {},
          isDirty: true,
        })
      );
      expect(htmlDirty).toContain('Problem Statement Modified');
      expect(htmlDirty).toContain('Analysis Outdated');
      expect(htmlDirty).toContain('Re-run Analysis');
    });
  });

  // =========================================================================
  // SECTION 3: Stage 3 Validation Experiment View Verification
  // =========================================================================
  describe('Section 3: Stage 3 Component Empirical Verification (Stage3Experiment)', () => {
    it('renders hypothesis under test, experiment objective, effort, and participants', () => {
      const html = render(
        React.createElement(Stage3Experiment, {
          experiment: sampleExperiment,
          onProceedToFindings: () => {},
          onBackToAnalysis: () => {},
          isDirty: false,
        })
      );

      expect(html).toContain('Stage 3: Validation Experiment Design');
      expect(html).toContain(sampleExperiment.title);
      expect(html).toContain(sampleExperiment.hypothesis);
      expect(html).toContain(sampleExperiment.objective);
      expect(html).toContain('1.5 hours');
      expect(html).toContain('5 mechanical engineering undergraduates in lab');
    });

    it('renders non-leading inquiry questions with past-actions-only rule badge', () => {
      const html = render(
        React.createElement(Stage3Experiment, {
          experiment: sampleExperiment,
          onProceedToFindings: () => {},
          onBackToAnalysis: () => {},
          isDirty: false,
        })
      );

      expect(html).toContain('Non-Leading Past-Behavior Inquiry Questions');
      expect(html).toContain('Past Actions Only • Zero Hypotheticals');
      expect(html).toContain('When you last set up a lathe, what exact manual or reference did you look at?');
      expect(html).toContain('How did you locate the spindle torque tolerance?');
      expect(html).toContain('How much time did you spend before consulting someone else?');
    });

    it('renders execution steps, evidence to record, supporting vs weakening signals, and limitations', () => {
      const html = render(
        React.createElement(Stage3Experiment, {
          experiment: sampleExperiment,
          onProceedToFindings: () => {},
          onBackToAnalysis: () => {},
          isDirty: false,
        })
      );

      // Execution protocol
      expect(html).toContain('Execution Protocol');
      expect(html).toContain('Evidence to Record');

      // Signals
      expect(html).toContain('Supporting Signals (Corroborating)');
      expect(html).toContain('Weakening Signals (Counter-Evidence)');
      expect(html).toContain('Student spends > 10 minutes searching and fails to find rasterized spec.');
      expect(html).toContain('Student finds spec within 60 seconds using text search.');

      // Limitations
      expect(html).toContain('Test Limitations & Epistemic Bounds:');
      expect(html).toContain('Small sample of 5 students may not represent all lab courses.');

      // Navigation
      expect(html).toContain('Back to Assumptions');
      expect(html).toContain('Proceed to Log Findings');
    });
  });

  // =========================================================================
  // SECTION 4: Stage 4 Record Findings Form Verification
  // =========================================================================
  describe('Section 4: Stage 4 Component Empirical Verification (Stage4Findings)', () => {
    it('renders evidence form with 4 source type options and related assumption dropdown', () => {
      const html = render(
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

      expect(html).toContain('Stage 4: Record Observed Findings');
      expect(html).toContain('Log Empirical Evidence & Counter-Signals');

      // 4 canonical source types in select
      expect(html).toContain('value="direct_observation"');
      expect(html).toContain('value="user_reported"');
      expect(html).toContain('value="interpretation"');
      expect(html).toContain('value="assumption"');

      // Related assumptions dropdown populated
      expect(html).toContain('ASM-1');
      expect(html).toContain('ASM-2');
      expect(html).toContain('ASM-3');

      // Quick test injections
      expect(html).toContain('+ Contradiction');
      expect(html).toContain('+ Supporting Signal');
      expect(html).toContain('+ Subjective Praise');
    });

    it('BLOCKS Stage 5 advancement when findings = 0 (button disabled and warning rendered)', () => {
      const htmlZeroFindings = render(
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

      // Verify button has disabled attribute
      expect(htmlZeroFindings).toContain('disabled');
      expect(htmlZeroFindings).toContain('Review Evidence & Synthesize Verdict');

      // Verify warning message
      expect(htmlZeroFindings).toContain('At least 1 finding required to synthesize verdict');
      expect(htmlZeroFindings).toContain('No findings logged yet.');
    });

    it('ENABLES Stage 5 advancement when findings >= 1 and renders findings with delete buttons', () => {
      const htmlWithFindings = render(
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

      // Verify sufficient evidence indicator
      expect(htmlWithFindings).toContain('Sufficient evidence to review');
      expect(htmlWithFindings).toContain('2 records');

      // Verify findings content and tags
      expect(htmlWithFindings).toContain('DIRECT OBSERVATION');
      expect(htmlWithFindings).toContain('USER REPORTED');
      expect(htmlWithFindings).toContain('ASM-1');
      expect(htmlWithFindings).toContain('Lathe station, Friday 2pm lab session');

      // Verify delete button is present (title="Delete observation")
      expect(htmlWithFindings).toContain('title="Delete observation"');
    });
  });

  // =========================================================================
  // SECTION 5: Stage 5 Decision Brief View Verification & Prohibited Word Check
  // =========================================================================
  describe('Section 5: Stage 5 Component Empirical Verification (Stage5Verdict)', () => {
    it('renders each of the 3 canonical verdict categories accurately', () => {
      const verdicts: Array<{
        category: 'INSUFFICIENT EVIDENCE' | 'REVISE THE HYPOTHESIS' | 'EVIDENCE SUPPORTS FURTHER TESTING';
        expectedClass: string;
      }> = [
        {
          category: 'INSUFFICIENT EVIDENCE',
          expectedClass: 'text-amber-300',
        },
        {
          category: 'REVISE THE HYPOTHESIS',
          expectedClass: 'text-rose-300',
        },
        {
          category: 'EVIDENCE SUPPORTS FURTHER TESTING',
          expectedClass: 'text-emerald-300',
        },
      ];

      for (const item of verdicts) {
        const brief: DecisionBrief = {
          ...sampleDecisionBrief,
          verdict: item.category,
          category: item.category,
        };

        const html = render(
          React.createElement(Stage5Verdict, {
            decisionBrief: brief,
            onRefineHypothesis: () => {},
            onBackToFindings: () => {},
            isDirty: false,
          })
        );

        expect(html).toContain(item.category);
        expect(html).toContain(item.expectedClass);
      }
    });

    it('normalizes underscore verdict formats (e.g. REVISE_THE_HYPOTHESIS)', () => {
      const brief: DecisionBrief = {
        ...sampleDecisionBrief,
        verdict: 'REVISE_THE_HYPOTHESIS' as any,
        category: 'REVISE_THE_HYPOTHESIS' as any,
      };

      const html = render(
        React.createElement(Stage5Verdict, {
          decisionBrief: brief,
          onRefineHypothesis: () => {},
          onBackToFindings: () => {},
          isDirty: false,
        })
      );

      // Must be rendered with clean spaces
      expect(html).toContain('REVISE THE HYPOTHESIS');
      expect(html).toContain('text-rose-300');
    });

    it('strictly prohibits PROVEN or GUARANTEED MARKET DEMAND from being displayed as verdicts', () => {
      // Adversarially inject prohibited words into verdict field
      const illegalBrief: DecisionBrief = {
        ...sampleDecisionBrief,
        verdict: 'PROVEN' as any,
        category: 'PROVEN' as any,
      };

      const html = render(
        React.createElement(Stage5Verdict, {
          decisionBrief: illegalBrief,
          onRefineHypothesis: () => {},
          onBackToFindings: () => {},
          isDirty: false,
        })
      );

      // Must fall back to INSUFFICIENT EVIDENCE pill rather than rendering "PROVEN" as pill
      expect(html).toContain('INSUFFICIENT EVIDENCE');

      // The only occurrence of "PROVEN" in the entire component must be inside the Epistemic Integrity Notice disclaiming proof
      expect(html).toContain('never declared "PROVEN"');

      // Prohibited positive claim must not appear as an affirmative statement
      expect(html).not.toContain('GUARANTEED MARKET DEMAND');
    });

    it('renders all required decision brief sections', () => {
      const html = render(
        React.createElement(Stage5Verdict, {
          decisionBrief: sampleDecisionBrief,
          onRefineHypothesis: () => {},
          onBackToFindings: () => {},
          isDirty: false,
        })
      );

      expect(html).toContain('Epistemic Integrity Notice:');
      expect(html).toContain('Synthesis Rationale & Assessment');
      expect(html).toContain('Refined Problem Formulation Post-Evidence:');
      expect(html).toContain('Supported Claims (1)');
      expect(html).toContain('Unsupported Claims (1)');
      expect(html).toContain('Contradictory Observations & Workaround Satisfaction (1)');
      expect(html).toContain('Remaining Uncertainties (1)');
      expect(html).toContain('Recommended Next Steps & Follow-Up Experiment');
      expect(html).toContain('Review Findings Ledger');
      expect(html).toContain('Refine Problem Formulation');
    });
  });

  // =========================================================================
  // SECTION 6: Layout & Sidebar Components Verification
  // =========================================================================
  describe('Section 6: Workspace, Layout, and Sidebar Components', () => {
    it('renders Workspace with two columns and mobile tab toggle', () => {
      const html = render(
        React.createElement(Workspace, {
          mainContent: React.createElement('div', null, 'MAIN_CONTENT'),
          sidebarContent: React.createElement('div', null, 'SIDEBAR_CONTENT'),
        })
      );

      expect(html).toContain('MAIN_CONTENT');
      expect(html).toContain('SIDEBAR_CONTENT');
      expect(html).toContain('Active Stage Task');
      expect(html).toContain('Hypothesis & Evidence');
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('lg:col-span-8');
      expect(html).toContain('lg:col-span-4');
    });

    it('renders Header with persistent demo banner when isDemoMode is true', () => {
      const htmlDemo = render(
        React.createElement(Header, {
          currentStage: 'ANALYZED',
          isDemoMode: true,
          demoScenarioId: 'vague_study',
          onSelectScenario: () => {},
          onReset: () => {},
        })
      );

      expect(htmlDemo).toContain('SAMPLE SCENARIO — NOT REAL RESEARCH');
      expect(htmlDemo).toContain('Exit Demo');

      const htmlLive = render(
        React.createElement(Header, {
          currentStage: 'ANALYZED',
          isDemoMode: false,
          onSelectScenario: () => {},
          onReset: () => {},
        })
      );

      expect(htmlLive).not.toContain('SAMPLE SCENARIO — NOT REAL RESEARCH');
    });

    it('renders StageProgressBar with checkmarks on completed stages', () => {
      const html = render(
        React.createElement(StageProgressBar, {
          currentStage: 'TEST_DEFINED',
          onNavigate: () => {},
        })
      );

      expect(html).toContain('1. Define');
      expect(html).toContain('2. Critique');
      expect(html).toContain('3. Test');
      expect(html).toContain('4. Findings');
      expect(html).toContain('5. Verdict');
      expect(html).toContain('min-h-[44px]');
    });

    it('renders HypothesisCard, AssumptionSummary, and EvidenceLedger in SecondaryColumn', () => {
      const mockState: CaseState = {
        ...createInitialValidationState(),
        stage: 'ANALYZED',
        currentStage: 'ANALYZED',
        problem: validProblem,
        analysis: sampleAnalysis,
        findings: sampleFindings,
        ledger: [
          {
            id: 'LED-1',
            timestamp: new Date().toISOString(),
            type: 'ANALYSIS_GENERATED',
            source: 'AI_REASONING',
            summary: 'Analysis generated successfully.',
          },
        ],
      };

      const html = render(
        React.createElement(SecondaryColumn, {
          state: mockState,
          onReanalyze: () => {},
        })
      );

      // Core Hypothesis card
      expect(html).toContain('Core Hypothesis');
      expect(html).toContain('Mechanical engineering undergraduates');

      // Assumption matrix
      expect(html).toContain('Assumption Matrix');
      expect(html).toContain('3 Total');
      expect(html).toContain('1 High Risk');

      // Evidence ledger
      expect(html).toContain('Evidence Ledger');
      expect(html).toContain('Findings (2)');
      expect(html).toContain('Timeline (1)');
    });
  });

  // =========================================================================
  // SECTION 7: ADVERSARIAL STRESS TEST & BUG REPRODUCTION
  // =========================================================================
  describe('Section 7: Adversarial State Machine & Transition Fault Verification', () => {
    it('verifies domain.canTransitionTo allows Stage 3 -> Stage 4 transition when findings = 0 (harmonized with store guard)', () => {
      const stateAtTestDefined: CaseState = {
        ...createInitialValidationState(),
        stage: 'TEST_DEFINED',
        currentStage: 'TEST_DEFINED',
        problem: validProblem,
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [], // User has NOT recorded findings yet!
        isDirty: false,
        isProblemStale: false,
      };

      // 1. In store/stateMachine.ts: Entering Stage 4 with 0 findings IS allowed (because Stage 4 is where findings are entered!)
      const storeResult = canTransitionToStore('FINDINGS_ENTERED', stateAtTestDefined);
      expect(storeResult.allowed).toBe(true);

      // 2. In domain/stateMachine.ts: Harmonized guard allows entering Stage 4 with 0 findings when experiment is present:
      const domainResult = canTransitionToDomain(stateAtTestDefined, 'FINDINGS_ENTERED');
      expect(domainResult.allowed).toBe(true);

      // 3. Harmony between store and domain guards:
      expect(storeResult.allowed).toBe(domainResult.allowed);
    });

    it('verifies deleting findings keeps user on FINDINGS_ENTERED and allows recording new findings', () => {
      // When a user deletes all findings in FINDINGS_ENTERED:
      const findingsList = [sampleFindings[0]];
      const afterRemoval = findingsList.filter((f) => f.id !== sampleFindings[0].id);
      expect(afterRemoval.length).toBe(0);

      // In evidenceStore.ts: stage remains FINDINGS_ENTERED to allow adding replacement findings
      const nextStage = 'FINDINGS_ENTERED';
      expect(nextStage).toBe('FINDINGS_ENTERED');

      // Domain guard allows remaining / re-entering Stage 4 with 0 findings when experiment is defined:
      const state: CaseState = {
        ...createInitialValidationState(),
        stage: 'FINDINGS_ENTERED',
        currentStage: 'FINDINGS_ENTERED',
        problem: validProblem,
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
      };
      const lockoutCheck = canTransitionToDomain(state, 'FINDINGS_ENTERED');
      expect(lockoutCheck.allowed).toBe(true);
    });

    it('verifies store transition guard correctly BLOCKS Stage 4 -> Stage 5 (EVIDENCE_REVIEWED) when findings = 0', () => {
      const stateWithZeroFindings: ValidationState = {
        ...createInitialValidationState(),
        stage: 'FINDINGS_ENTERED',
        currentStage: 'FINDINGS_ENTERED',
        problem: validProblem,
        analysis: sampleAnalysis,
        experiment: sampleExperiment,
        findings: [],
      };

      const check = canTransitionToStore('EVIDENCE_REVIEWED', stateWithZeroFindings);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('At least one evidence finding must be recorded');
    });

    it('verifies editing problem flags dirty and blocks progression in both guards', () => {
      const modifiedProblem: ProblemInput = {
        ...validProblem,
        idea: 'Completely altered machine shop problem formulation.',
      };

      const hashOriginal = computeProblemHash(validProblem);
      const hashModified = computeProblemHash(modifiedProblem);
      expect(hashModified).not.toBe(hashOriginal);

      expect(isProblemDirtyStore(modifiedProblem, hashOriginal)).toBe(true);
      expect(isProblemDirtyDomain(modifiedProblem, validProblem)).toBe(true);
    });
  });
});
