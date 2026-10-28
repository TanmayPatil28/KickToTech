import { useState, useEffect, useCallback } from 'react';
import type {
  AnalysisResult,
  CaseState,
  Finding,
  LedgerEntry,
  ProblemInput,
  ValidationExperiment,
  Verdict,
  WorkflowStage,
} from '../types/index.ts';
import {
  STORAGE_KEY,
  computeProblemHash,
  isProblemDirty,
  canTransitionTo as canTransitionToStore,
} from './stateMachine.ts';
import { DEMO_SCENARIO_A, DEMO_SCENARIO_B } from '../domain/demoData.ts';

export { STORAGE_KEY };

export const INITIAL_PROBLEM: ProblemInput = {
  idea: '',
  targetUser: '',
  context: '',
  existingObservations: '',
  existingEvidence: '',
  constraints: '',
};

export const INITIAL_STATE: CaseState = {
  id: 'case_default',
  stage: 'DRAFT',
  currentStage: 'DRAFT',
  problem: INITIAL_PROBLEM,
  lastAnalyzedProblem: undefined,
  analyzedProblemHash: null,
  isDirty: false,
  isProblemStale: false,
  analysis: null,
  experiment: null,
  alternativeExperiment: null,
  findings: [],
  ledger: [],
  decisionBrief: null,
  verdict: null,
  isDemo: false,
  isDemoMode: false,
  updatedAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
};

function loadStoredState(): CaseState {
  if (typeof window === 'undefined' || !window.localStorage) return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && (parsed.stage || parsed.currentStage) && parsed.problem) {
      const stage = (parsed.stage || parsed.currentStage) as WorkflowStage;
      const isStale = parsed.analyzedProblemHash
        ? computeProblemHash(parsed.problem) !== parsed.analyzedProblemHash
        : Boolean(parsed.isProblemStale || parsed.isDirty);

      return {
        ...parsed,
        stage,
        currentStage: stage,
        isProblemStale: isStale,
        isDirty: isStale,
        findings: parsed.findings || [],
        ledger: parsed.ledger || [],
      } as CaseState;
    }
  } catch (err) {
    console.warn('Failed to parse saved ProblemPilot case from localStorage. Resetting to initial.', err);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  return INITIAL_STATE;
}

export function useEvidenceStore() {
  const [state, setState] = useState<CaseState>(loadStoredState);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Sync to standardized local storage key
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to persist case to localStorage:', err);
    }
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
    (problemUpdate: Partial<ProblemInput>) => {
      setState((prev) => {
        const nextProblem = { ...prev.problem, ...problemUpdate };
        const stale = prev.analyzedProblemHash
          ? computeProblemHash(nextProblem) !== prev.analyzedProblemHash
          : isProblemDirty(nextProblem, prev.lastAnalyzedProblem);

        const now = new Date().toISOString();
        const nextState: CaseState = {
          ...prev,
          problem: nextProblem,
          isProblemStale: stale,
          isDirty: stale,
          updatedAt: now,
          lastUpdated: now,
        };

        if (stale && prev.analysis) {
          nextState.ledger = [
            ...prev.ledger,
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

  const setAnalysis = useCallback(
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
          stage: 'ANALYZED',
          currentStage: 'ANALYZED',
          analysis,
          analyzedProblemHash: hash,
          lastAnalyzedProblem: { ...prev.problem },
          isProblemStale: false,
          isDirty: false,
          experiment: primaryExp,
          alternativeExperiment: alternative || null,
          ledger: [
            ...prev.ledger,
            addLedgerEntry(
              'ANALYSIS_GENERATED',
              prev.isDemoMode ? 'SYSTEM' : 'AI_REASONING',
              `Analysis completed: Clarity=${analysis.problemClarity.status.toUpperCase()}, ${analysis.assumptions.length} assumptions challenged.`
            ),
          ],
          updatedAt: now,
          lastUpdated: now,
        };
      });
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const setExperiment = useCallback(
    (experiment: ValidationExperiment) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        stage: 'TEST_DEFINED',
        currentStage: 'TEST_DEFINED',
        experiment,
        ledger: [
          ...prev.ledger,
          addLedgerEntry('TEST_SELECTED', 'USER', `Selected validation experiment: "${experiment.title}".`),
        ],
        updatedAt: now,
        lastUpdated: now,
      }));
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
        createdAt: now,
        timestamp: now,
        isCredibleObservation: findingInput.isCredibleObservation ?? true,
      };

      setState((prev) => {
        const nextFindings = [...prev.findings, newFinding];
        const nextStage: WorkflowStage =
          prev.stage === 'TEST_DEFINED' ? 'FINDINGS_ENTERED' : prev.stage;

        return {
          ...prev,
          stage: nextStage,
          currentStage: nextStage,
          findings: nextFindings,
          ledger: [
            ...prev.ledger,
            addLedgerEntry(
              'FINDING_RECORDED',
              'USER',
              `Recorded [${findingInput.sourceType}] finding: "${findingInput.description.substring(0, 60)}${
                findingInput.description.length > 60 ? '...' : ''
              }"`
            ),
          ],
          updatedAt: now,
          lastUpdated: now,
        };
      });
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const removeFinding = useCallback(
    (id: string) => {
      setState((prev) => {
        const nextFindings = prev.findings.filter((f) => f.id !== id);
        const now = new Date().toISOString();

        return {
          ...prev,
          findings: nextFindings,
          updatedAt: now,
          lastUpdated: now,
        };
      });
      setTransitionError(null);
    },
    []
  );

  const setVerdict = useCallback(
    (verdict: Verdict) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        stage: 'EVIDENCE_REVIEWED',
        currentStage: 'EVIDENCE_REVIEWED',
        verdict,
        decisionBrief: verdict as unknown as any,
        ledger: [
          ...prev.ledger,
          addLedgerEntry(
            'EVIDENCE_ASSESSED',
            prev.isDemoMode ? 'SYSTEM' : 'AI_REASONING',
            `Evidence synthesized. Verdict: ${verdict.category.replace(/_/g, ' ')}.`
          ),
        ],
        updatedAt: now,
        lastUpdated: now,
      }));
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const navigateTo = useCallback(
    (targetStage: WorkflowStage): boolean => {
      const check = canTransitionToStore(targetStage, state);
      if (!check.allowed) {
        setTransitionError(check.reason || 'Invalid stage transition.');
        return false;
      }
      setTransitionError(null);
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        stage: targetStage,
        currentStage: targetStage,
        updatedAt: now,
        lastUpdated: now,
      }));
      return true;
    },
    [state]
  );

  const loadDemoScenario = useCallback((scenario: 'vague_study' | 'contradictory_study') => {
    const data = scenario === 'vague_study' ? DEMO_SCENARIO_A : DEMO_SCENARIO_B;
    setState({ ...data });
    setTransitionError(null);
  }, []);

  const resetCase = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setState({
      ...INITIAL_STATE,
      id: `case_${Date.now()}`,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });
    setTransitionError(null);
  }, []);

  const abandonCase = resetCase;

  return {
    state,
    transitionError,
    clearTransitionError: () => setTransitionError(null),
    updateProblem,
    setAnalysis,
    setExperiment,
    addFinding,
    removeFinding,
    setVerdict,
    navigateTo,
    loadDemoScenario,
    resetCase,
    abandonCase,
    canTransitionTo: (targetStage: WorkflowStage) => canTransitionToStore(targetStage, state),
  };
}
