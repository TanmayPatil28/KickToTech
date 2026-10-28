# State Machine Transitions & Guard Rules Strategy (`src/store/stateMachine.ts`)

**Author:** explorer_m1_2 (Teamwork Explorer Agent)  
**Milestone:** Milestone 1 — Core Domain Schemas, State Machine & Store  
**Authoritative References:** `ORIGINAL_REQUEST.md`, `PROJECT.md`, `spec_inventory.md`, `tsconfig.app.json`  

---

## 1. Executive Summary

ProblemPilot enforces a disciplined, 5-stage validation workflow. To protect epistemic integrity and prevent vanity validation or skip-ahead behavior, state transitions must be strictly guarded in application logic.

This document defines the exact implementation strategy for the state machine transitions, guard rules, action creators, and updater functions in `src/store/stateMachine.ts`:
1. **Strictly Linear, Guarded Forward Progression:** Users cannot skip forward across uncompleted stages. Each stage requires specific artifacts before unlocking the next stage.
2. **Free, Non-Destructive Backward Navigation:** Users may freely return to earlier stages (e.g. from Stage 4 back to Stage 1 or 2). All entered findings, hypothesis definitions, experiments, and ledger entries are completely preserved and never erased.
3. **Dirty-State Progression Gating:** Modifying the problem statement after analysis sets `isDirty = true`, which allows reviewing prior steps with a warning banner, but strictly locks advancing to Stage 5 (`EVIDENCE_REVIEWED`) until a re-analysis is executed.
4. **Lightweight, Zero-Dependency Architecture:** Pure TypeScript transition functions and deterministic reducer logic compliant with `"erasableSyntaxOnly": true`, wrapped in a React 19 hook (`useValidationStore` / `useStateMachine`) with zero external runtime dependencies.

---

## 2. Stage Transition Matrix & Guard Rules

### 2.1 The 5 Workflow Stages

```typescript
export const STAGE_ORDER = [
  'DRAFT',
  'ANALYZED',
  'TEST_DEFINED',
  'FINDINGS_ENTERED',
  'EVIDENCE_REVIEWED',
] as const;

export type Stage = (typeof STAGE_ORDER)[number];
```

| Index | Stage Identifier | Purpose | Artifact Required to Enter / Complete |
|---|---|---|---|
| **1** | `DRAFT` | Define Problem & Context | Problem inputs (`idea`, `targetUser`, `context`) |
| **2** | `ANALYZED` | Challenge Assumptions | Completed AI analysis (`analysis.assumptions.length > 0`) |
| **3** | `TEST_DEFINED` | Validation Experiment Design | Defined experiment (`experiment !== null`) |
| **4** | `FINDINGS_ENTERED` | Record Findings Ledger | At least 1 empirical observation (`findings.length >= 1`) |
| **5** | `EVIDENCE_REVIEWED` | Evidence Review & Verdict | Decision brief (`verdict !== null`), `isDirty === false` |

---

### 2.2 Complete 5x5 Transition Matrix

The table below illustrates all possible transitions from `Current Stage` (row) to `Target Stage` (column):

| From \ To | `DRAFT` (1) | `ANALYZED` (2) | `TEST_DEFINED` (3) | `FINDINGS_ENTERED` (4) | `EVIDENCE_REVIEWED` (5) |
|---|---|---|---|---|---|
| **`DRAFT` (1)** | Idempotent (`allowed`) | **Guarded Forward:** Valid problem input + analysis complete | **Blocked:** Cannot jump 2 stages ahead | **Blocked:** Cannot jump 3 stages ahead | **Blocked:** Cannot jump 4 stages ahead |
| **`ANALYZED` (2)** | **Free Backward:** Non-destructive | Idempotent (`allowed`) | **Guarded Forward:** Requires analyzed idea (assumptions generated) | **Blocked:** Cannot jump 2 stages ahead | **Blocked:** Cannot jump 3 stages ahead |
| **`TEST_DEFINED` (3)** | **Free Backward:** Non-destructive | **Free Backward:** Non-destructive | Idempotent (`allowed`) | **Guarded Forward:** Requires experiment defined | **Blocked:** Cannot jump 2 stages ahead |
| **`FINDINGS_ENTERED` (4)** | **Free Backward:** Non-destructive | **Free Backward:** Non-destructive | **Free Backward:** Non-destructive | Idempotent (`allowed`) | **Guarded Forward:** Requires >= 1 finding AND `isDirty === false` |
| **`EVIDENCE_REVIEWED` (5)** | **Free Backward:** Non-destructive | **Free Backward:** Non-destructive | **Free Backward:** Non-destructive | **Free Backward:** Non-destructive | Idempotent (`allowed`) |

---

### 2.3 Forward Transition Guard Rules

Forward transitions must satisfy both structural sequence rules and artifact prerequisite rules:

#### 1. `DRAFT` → `ANALYZED` (Stage 1 → Stage 2)
- **Input Validation Guard:**
  - `problem.idea.trim().length >= 10`: Problem proposal must contain at least 10 non-whitespace characters.
  - `problem.targetUser.trim().length >= 3`: Target user must be specified with at least 3 non-whitespace characters.
- **Artifact Guard:**
  - When transitioning active stage to `ANALYZED`, `state.analysis` must be populated (`state.analysis !== null`).
  - *Trigger Mechanism:* Initiated by clicking "Analyze Problem" which calls `/api/analyze`. On HTTP 200, the analysis is saved to state and stage advances to `ANALYZED`. Direct clicks to Stage 2 before analysis is run are rejected with:
    `"Analysis must be completed before advancing to the ANALYZED stage."`

#### 2. `ANALYZED` → `TEST_DEFINED` (Stage 2 → Stage 3)
- **Artifact Guard:**
  - `state.analysis !== null`
  - `state.analysis.assumptions && state.analysis.assumptions.length > 0`
- **Rejection Reason:**
  `"A valid problem analysis with at least one assumption is required before designing a test."`
- *Note:* In Stage 3, the user reviews and selects/customizes the validation experiment. Advancing to Stage 3 does *not* require the experiment to be already finished; entering Stage 3 is where experiment design takes place.

#### 3. `TEST_DEFINED` → `FINDINGS_ENTERED` (Stage 3 → Stage 4)
- **Artifact Guard:**
  - `state.experiment !== null`
  - `state.experiment.hypothesis.trim().length > 0`
  - `state.experiment.inquiryQuestions && state.experiment.inquiryQuestions.length > 0`
- **Rejection Reason:**
  `"A validation experiment must be defined and selected before proceeding to record findings."`
- *Critical Bug Fix Identified in Current Codebase:*
  Existing `src/domain/stateMachine.ts:91` erroneously demanded `state.findings.length > 0` to enter `FINDINGS_ENTERED`. This created a catch-22: users on Stage 3 could not navigate to Stage 4 (`Stage4Findings.tsx`) to enter findings because findings did not exist yet!  
  **Rule Clarification:** Transition from `TEST_DEFINED` to `FINDINGS_ENTERED` requires only an **active experiment defined**. Entering findings occurs within Stage 4.

#### 4. `FINDINGS_ENTERED` → `EVIDENCE_REVIEWED` (Stage 4 → Stage 5)
- **Artifact Guard:**
  - `state.findings && state.findings.length >= 1`
  - At least 1 finding must exist in the ledger.
- **Dirty-State Invalidation Guard:**
  - `state.isDirty === false` (or `!state.isProblemStale`)
  - If the user returned to Stage 1 and edited the problem formulation (`idea`, `targetUser`, or `context`), `isDirty` is set to `true`.
  - While `isDirty === true`, transition to Stage 5 is **strictly blocked**.
- **Rejection Reasons:**
  - If 0 findings: `"At least one evidence finding must be recorded before requesting an evidence review."`
  - If `isDirty`: `"The problem statement was modified after the initial analysis was generated. You must re-run analysis to synchronize evidence before reviewing the verdict."`

#### 5. Forward Skipping / Jumping Guard
- Any forward jump where `targetIndex > currentIndex + 1`:
  - **Rejection Reason:**
    `"Cannot jump from ${state.currentStage} directly to ${targetStage}. Required intermediate steps must be completed in order."`
  - *Exception for Previously Unlocked Stages:* If a user already reached Stage 4, returned to Stage 1 to re-read their problem without changing it (`isDirty === false`), they may navigate directly back to any stage $\le$ `highestCompletedStage` because those stages were already unlocked and their artifacts exist.

---

### 2.4 Backward Transitions: Free & Non-Destructive Invariant

A foundational design requirement is that returning to earlier stages must be frictionless:

1. **Unconditional Allowance:**
   `targetIndex <= currentIndex` is always `{ allowed: true }`.
2. **Non-Destructive Invariant:**
   Moving backward from Stage 4 or Stage 5 to Stage 1, 2, or 3 **never** clears, deletes, or resets:
   - `findings[]`: All entered observations, source classifications, and notes remain intact in the Evidence Ledger.
   - `experiment`: Defined test questions, hypotheses, and signals remain intact.
   - `analysis`: Generated assumptions, clarity ratings, and gaps remain intact.
   - `verdict`: Previous decision brief remains intact unless re-evaluated.
   - `ledger[]`: Audit trail history remains intact.
3. **State Mutation:**
   Navigating backward strictly mutates `state.currentStage = targetStage` and updates `state.updatedAt`. No other fields are altered.

---

## 3. Function Signatures & API Contracts

### 3.1 `canTransitionTo`

Enforces guard rules synchronously against the target stage and the current state snapshot.

```typescript
export interface TransitionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Evaluates whether a transition from state.currentStage to targetStage is permissible.
 * Supports both forward progression guards and unlocked-stage re-navigation.
 */
export function canTransitionTo(
  targetStage: Stage,
  state: ValidationState
): TransitionCheckResult;
```

#### Exact Implementation Logic:
```typescript
export function canTransitionTo(
  targetStage: Stage,
  state: ValidationState
): TransitionCheckResult {
  const currentIndex = STAGE_ORDER.indexOf(state.currentStage);
  const targetIndex = STAGE_ORDER.indexOf(targetStage);

  if (targetIndex === -1) {
    return { allowed: false, reason: `Unknown target stage: ${targetStage}` };
  }

  // 1. Backward or same-stage navigation is always allowed
  if (targetIndex <= currentIndex) {
    return { allowed: true };
  }

  // 2. Disallow jumping ahead more than 1 stage past highest completed stage
  const highestIndex = STAGE_ORDER.indexOf(state.highestCompletedStage || state.currentStage);
  if (targetIndex > highestIndex + 1 && targetIndex > currentIndex + 1) {
    return {
      allowed: false,
      reason: `Cannot jump from ${state.currentStage} directly to ${targetStage}. Required intermediate steps must be completed.`,
    };
  }

  // 3. Stage-specific prerequisites
  switch (targetStage) {
    case 'ANALYZED': {
      const inputVal = validateProblemInput(state.problem);
      if (!inputVal.valid) {
        return { allowed: false, reason: inputVal.errors.join(' ') };
      }
      if (!state.analysis) {
        return {
          allowed: false,
          reason: 'Analysis must be completed before advancing to the ANALYZED stage.',
        };
      }
      return { allowed: true };
    }

    case 'TEST_DEFINED': {
      if (!state.analysis || !state.analysis.assumptions || state.analysis.assumptions.length === 0) {
        return {
          allowed: false,
          reason: 'A valid problem analysis with at least one assumption is required before designing a test.',
        };
      }
      return { allowed: true };
    }

    case 'FINDINGS_ENTERED': {
      if (!state.experiment) {
        return {
          allowed: false,
          reason: 'A validation experiment must be defined before recording findings.',
        };
      }
      return { allowed: true };
    }

    case 'EVIDENCE_REVIEWED': {
      if (!state.findings || state.findings.length === 0) {
        return {
          allowed: false,
          reason: 'At least one evidence finding must be recorded before requesting an evidence review.',
        };
      }
      if (state.isDirty) {
        return {
          allowed: false,
          reason: 'The problem statement was modified after analysis was generated. You must re-run analysis before reviewing evidence.',
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}
```

---

### 3.2 `transitionTo` & Pure Reducer Functions

To maintain modularity and testability, transition execution is separated into:
1. A **pure state reducer** `validationReducer(state, action)`
2. An **imperative store dispatcher** `transitionTo(stage)` that checks guards before dispatching

```typescript
export interface TransitionResult {
  success: boolean;
  error?: string;
  previousStage: Stage;
  currentStage: Stage;
}

export type ValidationAction =
  | { type: 'TRANSITION_TO'; stage: Stage }
  | { type: 'UPDATE_PROBLEM'; input: Partial<ProblemInput> }
  | { type: 'APPLY_ANALYSIS'; analysis: AnalysisResult }
  | { type: 'SET_EXPERIMENT'; experiment: ValidationExperiment }
  | { type: 'ADD_FINDING'; finding: Finding }
  | { type: 'REMOVE_FINDING'; id: string }
  | { type: 'APPLY_VERDICT'; verdict: DecisionBrief }
  | { type: 'LOAD_DEMO'; scenario: 'A' | 'B'; data: ValidationState }
  | { type: 'RESET_CASE' };
```

#### Pure Reducer Implementation:
```typescript
export function validationReducer(state: ValidationState, action: ValidationAction): ValidationState {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'TRANSITION_TO': {
      const check = canTransitionTo(action.stage, state);
      if (!check.allowed) {
        // Reducer is pure; invalid transitions return existing state unmodified
        return state;
      }

      const nextHighest = getHighestStage(state.highestCompletedStage, action.stage);
      return {
        ...state,
        currentStage: action.stage,
        highestCompletedStage: nextHighest,
        lastUpdated: now,
      };
    }

    case 'UPDATE_PROBLEM': {
      const nextProblem: ProblemInput = { ...state.problem, ...action.input };
      const isDirty = checkProblemDirty(nextProblem, state.lastAnalyzedProblem);

      return {
        ...state,
        problem: nextProblem,
        isDirty,
        lastUpdated: now,
      };
    }

    case 'APPLY_ANALYSIS': {
      return {
        ...state,
        currentStage: 'ANALYZED',
        highestCompletedStage: getHighestStage(state.highestCompletedStage, 'ANALYZED'),
        analysis: action.analysis,
        lastAnalyzedProblem: { ...state.problem },
        isDirty: false,
        lastUpdated: now,
      };
    }

    case 'SET_EXPERIMENT': {
      return {
        ...state,
        currentStage: 'TEST_DEFINED',
        highestCompletedStage: getHighestStage(state.highestCompletedStage, 'TEST_DEFINED'),
        experiment: action.experiment,
        lastUpdated: now,
      };
    }

    case 'ADD_FINDING': {
      const nextFindings = [...state.findings, action.finding];
      return {
        ...state,
        findings: nextFindings,
        lastUpdated: now,
      };
    }

    case 'REMOVE_FINDING': {
      const nextFindings = state.findings.filter((f) => f.id !== action.id);
      return {
        ...state,
        findings: nextFindings,
        lastUpdated: now,
      };
    }

    case 'APPLY_VERDICT': {
      return {
        ...state,
        currentStage: 'EVIDENCE_REVIEWED',
        highestCompletedStage: 'EVIDENCE_REVIEWED',
        decisionBrief: action.verdict,
        lastUpdated: now,
      };
    }

    case 'LOAD_DEMO': {
      return {
        ...action.data,
        isDemo: true,
        demoScenario: action.scenario,
        lastUpdated: now,
      };
    }

    case 'RESET_CASE': {
      return createInitialValidationState();
    }

    default:
      return state;
  }
}

function getHighestStage(currentHighest: Stage, targetStage: Stage): Stage {
  const currentIdx = STAGE_ORDER.indexOf(currentHighest || 'DRAFT');
  const targetIdx = STAGE_ORDER.indexOf(targetStage);
  return targetIdx > currentIdx ? targetStage : currentHighest;
}
```

---

## 4. Architectural Structure (Zero Heavy Dependencies)

### 4.1 Dependency Philosophy
- **NO Redux / Redux Toolkit:** Avoids complex boilerplate, store configuration, and bundle bloat.
- **NO Zustand / MobX / Recoil:** Avoids external state manager versions that may clash with React 19.
- **NO XState:** Avoids large state machine runtime libraries (~60kB) when a pure TypeScript finite state machine pattern with union types solves the exact problem in < 250 lines of code.

### 4.2 Module Organization in `src/store/stateMachine.ts`

To comply with `PROJECT.md` specification (§Feature Inventory F01-F06 and Interface Contracts §1), `src/store/stateMachine.ts` should act as the single source of truth for state machine mechanics:

```
src/
├── types/
│   └── index.ts               # Canonical data interfaces & type aliases
├── store/
│   ├── stateMachine.ts        # Pure transition functions, guards, reducer, initial state
│   └── useValidationStore.ts  # React 19 hook with localStorage sync & action dispatchers
```

*(Alternatively, `useValidationStore` can be exported directly from `src/store/stateMachine.ts` if keeping a single store file is preferred by the project structure).*

### 4.3 Action Dispatcher API (`transitionTo`) in Hook

In the React hook (`useValidationStore`), `transitionTo` is provided as an action method:

```typescript
export function useValidationStore() {
  const [state, dispatch] = useReducer(validationReducer, loadInitialState());
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const transitionTo = useCallback(
    (targetStage: Stage): TransitionResult => {
      const check = canTransitionTo(targetStage, state);
      if (!check.allowed) {
        const errorMsg = check.reason || `Cannot transition to ${targetStage}`;
        setTransitionError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          previousStage: state.currentStage,
          currentStage: state.currentStage,
        };
      }

      setTransitionError(null);
      dispatch({ type: 'TRANSITION_TO', stage: targetStage });
      return {
        success: true,
        previousStage: state.currentStage,
        currentStage: targetStage,
      };
    },
    [state]
  );

  return {
    state,
    transitionError,
    clearTransitionError: () => setTransitionError(null),
    canTransitionTo: (stage: Stage) => canTransitionTo(stage, state),
    transitionTo,
    // other action creators...
  };
}
```

---

## 5. Dirty State & Evidence Invalidation Strategy

### 5.1 Trigger Condition
When in Stage 1 (`DRAFT`), any edit to:
- `problem.idea`
- `problem.targetUser`
- `problem.context`

Compared against `state.lastAnalyzedProblem`:
```typescript
export function checkProblemDirty(current: ProblemInput, lastAnalyzed?: ProblemInput): boolean {
  if (!lastAnalyzed) return false;
  const ideaChanged = current.idea.trim() !== lastAnalyzed.idea.trim();
  const userChanged = current.targetUser.trim() !== lastAnalyzed.targetUser.trim();
  const contextChanged = current.context.trim() !== (lastAnalyzed.context || '').trim();
  return ideaChanged || userChanged || contextChanged;
}
```

### 5.2 Transition Impact
1. **Navigating to Stage 2, 3, or 4:** Allowed, but UI displays prominent `⚠️ OUTDATED ASSESSMENTS` warning banner.
2. **Navigating to Stage 5:** **Strictly Blocked**.
   `canTransitionTo('EVIDENCE_REVIEWED', state)` returns `{ allowed: false, reason: "The problem statement was modified after analysis was generated..." }`.
3. **Clearing Dirty State:**
   - Clicking *"Re-Analyze Modified Problem"* executes `/api/analyze`.
   - On success, `APPLY_ANALYSIS` updates `lastAnalyzedProblem` to match current `problem`, resets `isDirty = false`, and unlocks Stage 5 review.

---

## 6. Unit Testing & Verification Strategy

All transitions must be verified with pure Vitest unit tests in `src/domain/__tests__/stateMachine.test.ts` or `src/store/__tests__/stateMachine.test.ts`:

| # | Test Case Description | Target Stage | Precondition State | Expected Result |
|---|---|---|---|---|
| **T01** | Empty idea forward transition | `ANALYZED` | `problem.idea = ""` | `allowed: false`, error contains `"at least 10 characters"` |
| **T02** | Valid idea but unanalyzed | `ANALYZED` | `problem` valid, `analysis = null` | `allowed: false`, error contains `"Analysis must be completed"` |
| **T03** | Valid problem with analysis | `ANALYZED` | `problem` valid, `analysis` populated | `allowed: true` |
| **T04** | Direct jump DRAFT to TEST_DEFINED | `TEST_DEFINED` | In `DRAFT`, `analysis = null` | `allowed: false`, error contains `"Cannot jump"` |
| **T05** | ANALYZED to TEST_DEFINED | `TEST_DEFINED` | In `ANALYZED`, `assumptions.length > 0` | `allowed: true` |
| **T06** | TEST_DEFINED to FINDINGS_ENTERED without experiment | `FINDINGS_ENTERED` | In `TEST_DEFINED`, `experiment = null` | `allowed: false`, error contains `"experiment must be defined"` |
| **T07** | TEST_DEFINED to FINDINGS_ENTERED with experiment | `FINDINGS_ENTERED` | In `TEST_DEFINED`, `experiment` valid, `findings = []` | `allowed: true` (user enters Stage 4 to record findings) |
| **T08** | FINDINGS_ENTERED to EVIDENCE_REVIEWED with 0 findings | `EVIDENCE_REVIEWED` | In `FINDINGS_ENTERED`, `findings = []` | `allowed: false`, error contains `"At least one evidence finding"` |
| **T09** | FINDINGS_ENTERED to EVIDENCE_REVIEWED with 1 finding | `EVIDENCE_REVIEWED` | In `FINDINGS_ENTERED`, `findings.length = 1`, `isDirty = false` | `allowed: true` |
| **T10** | Stage 5 blocked when `isDirty === true` | `EVIDENCE_REVIEWED` | `findings.length = 1`, `isDirty = true` | `allowed: false`, error contains `"problem statement was modified"` |
| **T11** | Free backward navigation Stage 4 to 1 | `DRAFT` | In `FINDINGS_ENTERED`, 3 findings in ledger | `allowed: true`, findings array unchanged |
| **T12** | Free backward navigation Stage 5 to 2 | `ANALYZED` | In `EVIDENCE_REVIEWED`, verdict present | `allowed: true`, verdict and findings preserved |
| **T13** | Reducer non-destructive state test | `TRANSITION_TO 'DRAFT'` | State contains analysis, experiment, findings | All nested objects identical by reference or value |
| **T14** | Re-analysis clears dirty flag | `APPLY_ANALYSIS` | `isDirty = true` | `isDirty = false`, `lastAnalyzedProblem` updated |

---

## 7. Migration & Code Compatibility Notes

1. **Type Naming Alignment:**
   - In `src/types/index.ts`, provide type aliases so both `Stage` and `WorkflowStage` work interchangeably:
     ```typescript
     export type Stage = 'DRAFT' | 'ANALYZED' | 'TEST_DEFINED' | 'FINDINGS_ENTERED' | 'EVIDENCE_REVIEWED';
     export type WorkflowStage = Stage;
     ```
   - Same for `ValidationState` and `CaseState`:
     ```typescript
     export type ValidationState = CaseState;
     ```
2. **Current `src/domain/stateMachine.ts` Fix:**
   - Update `canTransitionTo` in `src/domain/stateMachine.ts` (or `src/store/stateMachine.ts`) to fix the `FINDINGS_ENTERED` check so users can enter Stage 4 with an active experiment, rather than requiring findings prior to reaching Stage 4.
3. **Erasable Syntax Verification:**
   - Check with `npx tsc -b` or `npm run build` to confirm zero TS runtime artifacts (`enum`, namespaces) are introduced.
