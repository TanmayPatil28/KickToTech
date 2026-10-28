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
} from '../types';
import { canTransitionTo, isProblemDirty } from '../domain/stateMachine';
import { DEMO_SCENARIO_A, DEMO_SCENARIO_B } from '../domain/demoData';

const STORAGE_KEY = 'problempilot_case_v1';

export const INITIAL_PROBLEM: ProblemInput = {
  idea: '',
  targetUser: '',
  context: '',
  existingEvidence: '',
  constraints: '',
};

export const INITIAL_STATE: CaseState = {
  id: 'case_default',
  stage: 'DRAFT',
  problem: INITIAL_PROBLEM,
  lastAnalyzedProblem: undefined,
  isProblemStale: false,
  analysis: null,
  experiment: null,
  alternativeExperiment: null,
  findings: [],
  ledger: [],
  verdict: null,
  isDemoMode: false,
  updatedAt: new Date().toISOString(),
};

function loadStoredState(): CaseState {
  if (typeof window === 'undefined') return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.stage && parsed.problem) {
      return parsed as CaseState;
    }
  } catch (err) {
    console.warn('Failed to parse saved ProblemPilot case from localStorage. Resetting to initial.', err);
  }
  return INITIAL_STATE;
}

export function useEvidenceStore() {
  const [state, setState] = useState<CaseState>(loadStoredState);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Sync to local storage
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
        const stale = isProblemDirty(nextProblem, prev.lastAnalyzedProblem);
        const nextState: CaseState = {
          ...prev,
          problem: nextProblem,
          isProblemStale: stale,
          updatedAt: new Date().toISOString(),
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
          analysis,
          lastAnalyzedProblem: { ...prev.problem },
          isProblemStale: false,
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
          updatedAt: new Date().toISOString(),
        };
      });
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const setExperiment = useCallback(
    (experiment: ValidationExperiment) => {
      setState((prev) => ({
        ...prev,
        stage: 'TEST_DEFINED',
        experiment,
        ledger: [
          ...prev.ledger,
          addLedgerEntry('TEST_SELECTED', 'USER', `Selected validation experiment: "${experiment.title}".`),
        ],
        updatedAt: new Date().toISOString(),
      }));
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const addFinding = useCallback(
    (findingInput: Omit<Finding, 'id' | 'createdAt'>) => {
      const newFinding: Finding = {
        ...findingInput,
        id: `FND-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => {
        const nextFindings = [...prev.findings, newFinding];
        const nextStage: WorkflowStage =
          prev.stage === 'TEST_DEFINED' ? 'FINDINGS_ENTERED' : prev.stage;

        return {
          ...prev,
          stage: nextStage,
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
          updatedAt: new Date().toISOString(),
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
        const nextStage: WorkflowStage =
          nextFindings.length === 0 && prev.stage === 'FINDINGS_ENTERED'
            ? 'TEST_DEFINED'
            : prev.stage;

        return {
          ...prev,
          stage: nextStage,
          findings: nextFindings,
          updatedAt: new Date().toISOString(),
        };
      });
      setTransitionError(null);
    },
    []
  );

  const setVerdict = useCallback(
    (verdict: Verdict) => {
      setState((prev) => ({
        ...prev,
        stage: 'EVIDENCE_REVIEWED',
        verdict,
        ledger: [
          ...prev.ledger,
          addLedgerEntry(
            'EVIDENCE_ASSESSED',
            prev.isDemoMode ? 'SYSTEM' : 'AI_REASONING',
            `Evidence synthesized. Verdict: ${verdict.category.replace(/_/g, ' ')}.`
          ),
        ],
        updatedAt: new Date().toISOString(),
      }));
      setTransitionError(null);
    },
    [addLedgerEntry]
  );

  const navigateTo = useCallback(
    (targetStage: WorkflowStage): boolean => {
      const check = canTransitionTo(state, targetStage);
      if (!check.allowed) {
        setTransitionError(check.reason || 'Invalid stage transition.');
        return false;
      }
      setTransitionError(null);
      setState((prev) => ({
        ...prev,
        stage: targetStage,
        updatedAt: new Date().toISOString(),
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
    setState({
      ...INITIAL_STATE,
      id: `case_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    });
    setTransitionError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

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
  };
}
