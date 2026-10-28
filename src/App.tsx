import { useState } from 'react';
import { useEvidenceStore } from './store/evidenceStore.ts';
import { Header } from './components/layout/Header.tsx';
import { StageProgressBar } from './components/layout/StageProgressBar.tsx';
import { Workspace } from './components/layout/Workspace.tsx';
import { OutdatedBanner } from './components/common/OutdatedBanner.tsx';
import { Stage1Define } from './components/stages/Stage1Define.tsx';
import { Stage2Assumptions } from './components/stages/Stage2Assumptions.tsx';
import { Stage3Experiment } from './components/stages/Stage3Experiment.tsx';
import { Stage4Findings } from './components/stages/Stage4Findings.tsx';
import { Stage5Verdict } from './components/stages/Stage5Verdict.tsx';
import { SecondaryColumn } from './components/SecondaryColumn.tsx';
import { AlertCircle, X } from 'lucide-react';
import type { ProblemInput } from './types/index.ts';
import { api } from './services/api.ts';

export function App() {
  const {
    state,
    transitionError,
    clearTransitionError,
    updateProblem,
    setAnalysis,
    setExperiment,
    addFinding,
    removeFinding,
    setVerdict,
    navigateTo,
    loadDemoScenario,
    resetCase,
    canTransitionTo,
  } = useEvidenceStore();

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isDirty = Boolean(state.isDirty || state.isProblemStale);
  const currentStage = state.stage || state.currentStage || 'DRAFT';

  // Stage 1 -> 2: Analyze Problem
  const handleAnalyzeProblem = async (problemData: ProblemInput) => {
    setIsLoading(true);
    setApiError(null);
    updateProblem(problemData);

    try {
      const res = await api.analyzeProblem({
        problem: problemData,
        isDemo: state.isDemoMode || state.isDemo,
        demoScenario: (state.demoScenarioId as any) || (state.demoScenario as any),
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to analyze problem statement.');
      }

      setAnalysis(res.data);
    } catch (err: any) {
      console.error('Analyze error:', err);
      setApiError(err.message || 'Analysis request failed. Please verify connection or retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Stage 2 -> 3: Proceed to Experiment
  const handleProceedToTest = async () => {
    if (state.experiment) {
      navigateTo('TEST_DEFINED');
      return;
    }

    if (!state.analysis) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const res = await api.generateTest({
        problem: state.problem,
        analysis: state.analysis,
        assumptions: state.analysis.assumptions,
        isDemo: state.isDemoMode || state.isDemo,
        demoScenario: (state.demoScenarioId as any) || (state.demoScenario as any),
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to design validation experiment.');
      }

      const exp = (res.data as any).primary || res.data;
      setExperiment(exp);
      navigateTo('TEST_DEFINED');
    } catch (err: any) {
      console.error('Test generation error:', err);
      setApiError(err.message || 'Failed to generate experiment design.');
    } finally {
      setIsLoading(false);
    }
  };

  // Stage 4 -> 5: Submit Findings for Verdict
  const handleSubmitFindingsForReview = async () => {
    if (!state.analysis && !state.experiment) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const res = await api.reviewEvidence({
        problem: state.problem,
        hypothesis: state.experiment?.hypothesis || state.analysis?.assumptions[0]?.claim,
        analysis: state.analysis || undefined,
        experiment: state.experiment || undefined,
        findings: state.findings,
        isDemo: state.isDemoMode || state.isDemo,
        demoScenario: (state.demoScenarioId as any) || (state.demoScenario as any),
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to review evidence findings.');
      }

      setVerdict(res.data as any);
      navigateTo('EVIDENCE_REVIEWED');
    } catch (err: any) {
      console.error('Evidence review error:', err);
      setApiError(err.message || 'Evidence review synthesis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0b0d13] text-slate-100 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header */}
      <Header
        currentStage={currentStage}
        isDemoMode={Boolean(state.isDemoMode || state.isDemo)}
        demoScenarioId={state.demoScenarioId || state.demoScenario}
        onSelectScenario={loadDemoScenario}
        onReset={resetCase}
      />

      {/* 5-Stage Stepper Navigation */}
      <StageProgressBar
        currentStage={currentStage}
        onNavigate={navigateTo}
        canNavigateTo={canTransitionTo}
      />

      {/* Global Alerts / Errors */}
      {(transitionError || apiError) && (
        <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-4 animate-stage-enter">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-sm font-sans">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{transitionError || apiError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearTransitionError();
                setApiError(null);
              }}
              className="text-rose-500 hover:text-rose-800 p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Prominent Dirty State Warning Banner (When problem changed post-analysis & not on Stage 1) */}
      {isDirty && currentStage !== 'DRAFT' && (
        <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-4 animate-stage-enter">
          <OutdatedBanner
            onReanalyze={() => {
              navigateTo('DRAFT');
            }}
          />
        </div>
      )}

      {/* Two-Column Responsive Analytical Workspace */}
      <Workspace
        mainContent={
          <>
            {/* Stage 1: Define Problem */}
            {currentStage === 'DRAFT' && (
              <Stage1Define
                initialProblem={state.problem}
                onSubmit={handleAnalyzeProblem}
                isLoading={isLoading}
              />
            )}

            {/* Stage 2: Challenge Assumptions */}
            {currentStage === 'ANALYZED' && state.analysis && (
              <Stage2Assumptions
                problem={state.problem}
                analysis={state.analysis}
                onProceedToTest={handleProceedToTest}
                onEditProblem={() => navigateTo('DRAFT')}
                isDirty={isDirty}
                isLoading={isLoading}
              />
            )}

            {/* Stage 3: Validation Experiment Design */}
            {currentStage === 'TEST_DEFINED' && state.experiment && (
              <Stage3Experiment
                experiment={state.experiment}
                onProceedToFindings={() => navigateTo('FINDINGS_ENTERED')}
                onBackToAnalysis={() => navigateTo('ANALYZED')}
                onReanalyze={() => navigateTo('DRAFT')}
                isDirty={isDirty}
              />
            )}

            {/* Stage 4: Record Findings */}
            {currentStage === 'FINDINGS_ENTERED' && (
              <Stage4Findings
                assumptions={state.analysis?.assumptions || []}
                findings={state.findings}
                onAddFinding={addFinding}
                onRemoveFinding={removeFinding}
                onSubmitForReview={handleSubmitFindingsForReview}
                onBackToExperiment={() => navigateTo('TEST_DEFINED')}
                onReanalyze={() => navigateTo('DRAFT')}
                isDirty={isDirty}
                isLoading={isLoading}
              />
            )}

            {/* Stage 5: Decision Brief & Verdict */}
            {currentStage === 'EVIDENCE_REVIEWED' && (state.verdict || state.decisionBrief) && (
              <Stage5Verdict
                decisionBrief={state.decisionBrief}
                verdict={state.verdict}
                onRefineHypothesis={() => navigateTo('DRAFT')}
                onBackToFindings={() => navigateTo('FINDINGS_ENTERED')}
                onReanalyze={() => navigateTo('DRAFT')}
                isDirty={isDirty}
              />
            )}
          </>
        }
        sidebarContent={
          <SecondaryColumn
            state={state}
            onReanalyze={() => navigateTo('DRAFT')}
            onRemoveFinding={removeFinding}
          />
        }
      />

      {/* Clean Analytical Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-4 px-4 text-center text-xs text-slate-500 font-sans mt-auto">
        ProblemPilot &bull; The Evidence Challenge &bull; Epistemic Integrity Validation Engine &bull; PromptWars &times; KickToTech
      </footer>
    </div>
  );
}

export default App;
