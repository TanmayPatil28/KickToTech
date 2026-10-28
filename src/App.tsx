import { useState } from 'react';
import { useEvidenceStore } from './store/evidenceStore.ts';
import { Header } from './components/Header.tsx';
import { StageProgressBar } from './components/StageProgressBar.tsx';
import { ProblemInputForm } from './components/ProblemInputForm.tsx';
import { AssumptionCritiquePanel } from './components/AssumptionCritiquePanel.tsx';
import { ValidationExperimentPanel } from './components/ValidationExperimentPanel.tsx';
import { FindingEntryForm } from './components/FindingEntryForm.tsx';
import { VerdictPanel } from './components/VerdictPanel.tsx';
import { SecondaryColumn } from './components/SecondaryColumn.tsx';
import { AlertCircle, X } from 'lucide-react';
import type { ProblemInput } from './types/index.ts';

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
  } = useEvidenceStore();

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Stage 1 -> 2: Analyze Problem
  const handleAnalyzeProblem = async (problemData: ProblemInput) => {
    setIsLoading(true);
    setApiError(null);
    updateProblem(problemData);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: problemData,
          isDemo: state.isDemoMode,
          demoScenario: state.demoScenarioId,
        }),
      });

      const res = await response.json();
      if (!res.success) {
        throw new Error(res.error || 'Failed to analyze problem.');
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

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: state.problem,
          analysis: state.analysis,
          isDemo: state.isDemoMode,
        }),
      });

      const res = await response.json();
      if (!res.success) {
        throw new Error(res.error || 'Failed to generate validation experiment.');
      }

      setExperiment(res.data.primary);
    } catch (err: any) {
      console.error('Test generation error:', err);
      setApiError(err.message || 'Failed to generate experiment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Stage 4 -> 5: Submit Findings for Verdict
  const handleSubmitFindingsForReview = async () => {
    if (!state.analysis || !state.experiment) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: state.problem,
          analysis: state.analysis,
          experiment: state.experiment,
          findings: state.findings,
          isDemo: state.isDemoMode,
        }),
      });

      const res = await response.json();
      if (!res.success) {
        throw new Error(res.error || 'Failed to review findings.');
      }

      setVerdict(res.data);
    } catch (err: any) {
      console.error('Review error:', err);
      setApiError(err.message || 'Evidence review failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        currentStage={state.stage}
        isDemoMode={state.isDemoMode}
        demoScenarioId={state.demoScenarioId}
        onSelectScenario={loadDemoScenario}
        onReset={resetCase}
      />

      {/* Workflow Stage Progress Stepper */}
      <StageProgressBar currentStage={state.stage} onNavigate={navigateTo} />

      {/* Global Alerts / Errors */}
      {(transitionError || apiError) && (
        <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-4">
          <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{transitionError || apiError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearTransitionError();
                setApiError(null);
              }}
              className="text-rose-400 hover:text-rose-200 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Stage Form Column */}
          <section className="lg:col-span-8 space-y-6">
            {state.stage === 'DRAFT' && (
              <ProblemInputForm
                initialProblem={state.problem}
                onSubmit={handleAnalyzeProblem}
                isLoading={isLoading}
              />
            )}

            {state.stage === 'ANALYZED' && state.analysis && (
              <AssumptionCritiquePanel
                problem={state.problem}
                analysis={state.analysis}
                onProceedToTest={handleProceedToTest}
                onEditProblem={() => navigateTo('DRAFT')}
                isProblemStale={state.isProblemStale}
              />
            )}

            {state.stage === 'TEST_DEFINED' && state.experiment && (
              <div className="space-y-6">
                <ValidationExperimentPanel
                  experiment={state.experiment}
                  onProceedToFindings={() => {
                    const el = document.getElementById('findings-entry-anchor');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onBackToAnalysis={() => navigateTo('ANALYZED')}
                />
                <div id="findings-entry-anchor">
                  <FindingEntryForm
                    assumptions={state.analysis?.assumptions || []}
                    findings={state.findings}
                    onAddFinding={addFinding}
                    onRemoveFinding={removeFinding}
                    onSubmitForReview={handleSubmitFindingsForReview}
                    onBackToExperiment={() => navigateTo('ANALYZED')}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}

            {state.stage === 'FINDINGS_ENTERED' && state.analysis && (
              <FindingEntryForm
                assumptions={state.analysis.assumptions}
                findings={state.findings}
                onAddFinding={addFinding}
                onRemoveFinding={removeFinding}
                onSubmitForReview={handleSubmitFindingsForReview}
                onBackToExperiment={() => navigateTo('TEST_DEFINED')}
                isLoading={isLoading}
              />
            )}

            {state.stage === 'EVIDENCE_REVIEWED' && state.verdict && (
              <VerdictPanel
                verdict={state.verdict}
                onRefineHypothesis={() => navigateTo('DRAFT')}
                onBackToFindings={() => navigateTo('FINDINGS_ENTERED')}
              />
            )}
          </section>

          {/* Secondary Analytical Column */}
          <section className="lg:col-span-4">
            <SecondaryColumn
              state={state}
              onReanalyze={() => navigateTo('DRAFT')}
            />
          </section>
        </div>
      </main>

      {/* Compact Analytical Footer */}
      <footer className="border-t border-[#242a3e] bg-[#0b0d13] py-4 px-4 text-center text-xs text-slate-500 font-mono">
        ProblemPilot — The Evidence Challenge &bull; PromptWars &times; KickToTech 2026 &bull; Strict Evidence-Grounded Product Validation
      </footer>
    </div>
  );
}

export default App;
