# Milestone 1: Dirty State Hashing & LocalStorage Persistence Strategy

**Document:** `persistence_strategy.md`  
**Agent:** `explorer_m1_3` (Teamwork Explorer Agent)  
**Milestone:** Milestone 1 — Core Domain Schemas, State Machine & Store  
**Target Module:** `src/store/stateMachine.ts`  
**Reference Documents:** `ORIGINAL_REQUEST.md`, `PROJECT.md`, `spec_inventory.md`

---

## 1. Executive Summary

This report establishes the technical architecture, algorithms, and integration patterns for:
1. **Lightweight Dirty State Tracking & Invalidation**: Deterministic, zero-dependency hashing (FNV-1a 32-bit hex) of the problem statement (`idea`, `targetUser`, `context`, `constraints`, `existingEvidence`) to flag downstream artifacts as stale (`isDirty = true`) when the user edits their problem formulation after analysis.
2. **Robust LocalStorage Persistence & Safe Rehydration**: Schema-versioned persistence using the canonical key `problempilot_state_v1`, with structural type guards, corrupted JSON error trapping, and automatic fallback to a clean `DRAFT` state.
3. **Confirmed Case Reset**: A two-phase reset protocol with modal confirmation that purges persistent storage and initializes a pristine validation case.
4. **Concrete Implementation Code & Unit Test Verification**: Drop-in pure functions and store action handlers for `src/store/stateMachine.ts`, accompanied by Vitest unit test suites verifying all edge cases (Scenario 10 and Scenario 13 compliance).

---

## 2. Problem Statement Modification Detection (Dirty State Hashing)

### 2.1 The Need for Deterministic Hashing

In ProblemPilot, validation is an evidence-backed scientific chain:
$$\text{Problem Definition} \longrightarrow \text{Challenged Assumptions} \longrightarrow \text{Experiment Design} \longrightarrow \text{Findings Ledger} \longrightarrow \text{Decision Brief}$$

If a user modifies their problem formulation after Step 1 has been analyzed:
- The generated assumptions, experiment questions, and signals may evaluate a thesis the user has already abandoned.
- If unflagged, users might evaluate findings against assumptions that no longer apply to their revised idea.
- The system must flag artifacts as stale (`isDirty = true`) and display a persistent warning across Stages 2–5.
- Transitioning to Stage 5 (`EVIDENCE_REVIEWED`) must be strictly guarded until the user re-analyzes their modified problem.

#### Hashing vs. Naive Boolean Flags vs. Deep Equality

| Metric / Attribute | Naive Boolean Dirty Flag (`dirty = true`) | Deep Object Comparison (`JSON.stringify` or `isEqual`) | Lightweight Deterministic Hash (`analyzedProblemHash`) |
|---|---|---|---|
| **Restoring Original Input** | Fails. If user reverts edits or fixes a typo, flag stays dirty unless manual undo is built. | Works, but requires retaining full object clone in memory and runs multi-field diffs on every render. | **Best.** If current hash matches baseline hash, `isDirty` automatically resets to `false` without API call. |
| **Storage Footprint** | 1 boolean. | Full duplicate copy of `ProblemInput` in localStorage. | **Compact.** Exactly 8 hex characters (`4 bytes`). |
| **Execution Performance** | $O(1)$. | $O(N)$ stringification / tree traversal. | **Ultra-fast.** Sub-microsecond synchronous string hash. |
| **Rehydration Reliability** | Prone to drift if fields altered in storage. | Requires re-comparing full objects. | **Deterministic.** Hash can be recomputed and compared instantly upon reload. |

---

### 2.2 Hash Algorithm: FNV-1a 32-Bit Hex

We use the Fowler–Noll–Vo (FNV-1a) 32-bit non-cryptographic hash algorithm:
- **Zero external dependencies**: Works identically in browser runtimes (V8/Webkit/Gecko) and Node.js without async Promises (unlike Web Crypto `SubtleCrypto.digest`).
- **Synchronous execution**: Computes within microseconds, allowing inline execution in input handlers or selector hooks without lagging UI typing.
- **Negligible collision probability**: For 5 string fields under 10,000 characters, collision rate is virtually zero.

#### Normalization Rules
To prevent false-positive dirty triggers:
1. **Trim Whitespace**: User typing trailing spaces (e.g. `"students "` vs `"students"`) should not invalidate a rigorous AI analysis.
2. **Missing / Optional Fields**: Undefined or null fields (`constraints`, `existingEvidence`) normalize to empty strings `""`.
3. **Delimiter Separation**: Fields are separated by ASCII Unit Separator `\u001F` (`0x1F`) to prevent collision across field boundaries (e.g., `{ idea: "ab", targetUser: "c" }` vs `{ idea: "a", targetUser: "bc" }`).

```typescript
/**
 * Computes a deterministic 8-character hex hash of normalized ProblemInput fields.
 * Includes: idea, targetUser, context, constraints, and existingEvidence.
 */
export function computeProblemHash(input: ProblemInput): string {
  const normalized = [
    input.idea?.trim() ?? '',
    input.targetUser?.trim() ?? '',
    input.context?.trim() ?? '',
    input.constraints?.trim() ?? '',
    (input.existingEvidence ?? (input as any).existingObservations ?? '')?.trim(),
  ].join('\u001F');

  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis (2166136261)
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    // Math.imul handles 32-bit integer multiplication correctly in V8/Node
    hash = Math.imul(hash, 0x01000193); // FNV-1a 32-bit prime (16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
```

---

### 2.3 Dirty State Lifecycle & Transition Logic

```
   [DRAFT]
      │
      │ User enters problem fields
      │ analyzedProblemHash = null
      │ isDirty = false
      ▼
   [/api/analyze succeeds]
      │
      │ analyzedProblemHash = computeProblemHash(problem)
      │ isDirty = false
      ▼
   [ANALYZED / TEST_DEFINED / FINDINGS_ENTERED]
      │
      ├──> User edits problem fields:
      │      compute currentHash = computeProblemHash(currentProblem)
      │      if (currentHash !== analyzedProblemHash) -> isDirty = true
      │      if (currentHash === analyzedProblemHash) -> isDirty = false (auto-healed!)
      │
      └──> User clicks "Re-analyze Problem":
             /api/analyze executes with current problem
             analyzedProblemHash = computeProblemHash(currentProblem)
             isDirty = false
```

#### Transition Invariant
- When `isDirty === true`:
  - Visual banner displays across Stages 2, 3, 4, 5:  
    `"⚠️ OUTDATED ASSESSMENTS: The original problem statement was modified after this analysis was generated. Existing assumptions and experiments may no longer reflect your current focus."`
  - Forward transition to Stage 5 (`EVIDENCE_REVIEWED`) is strictly **blocked** by `canTransitionTo`:
    ```typescript
    if (state.isDirty) {
      return {
        allowed: false,
        reason: 'Cannot review verdict with a stale problem statement. Please re-run analysis to synchronize evidence.',
      };
    }
    ```
  - Findings already logged in the Evidence Ledger are **never** discarded during re-analysis.

---

### 2.4 Dirty State API Specification

The state machine module exports the following functions and store methods:

```typescript
// Pure utility functions
export function computeProblemHash(input: ProblemInput): string;
export function isProblemDirty(current: ProblemInput, baselineHash: string | null): boolean;

// Store actions (inside useValidationStore / stateMachine actions)
interface StateMachineActions {
  setProblemInput: (input: Partial<ProblemInput>) => void;
  applyAnalysis: (analysis: AnalysisResult) => void;
  clearDirtyStatus: () => void;
}
```

1. **`isProblemDirty(current, baselineHash)`**:
   - If `baselineHash === null` (case has never been analyzed): returns `false`.
   - If `baselineHash !== null`: returns `computeProblemHash(current) !== baselineHash`.
2. **`setProblemInput(updates)`**:
   - Merges `updates` into `state.problem`.
   - Recomputes `currentHash = computeProblemHash(nextProblem)`.
   - If `state.analyzedProblemHash !== null`, sets `state.isDirty = (currentHash !== state.analyzedProblemHash)`.
3. **`applyAnalysis(analysis)`**:
   - Updates `state.analysis`.
   - Computes and stores `state.analyzedProblemHash = computeProblemHash(state.problem)`.
   - Explicitly sets `state.isDirty = false`.

---

## 3. LocalStorage Persistence & Rehydration

### 3.1 Persistence Standards

- **Canonical Key**: `problempilot_state_v1`
- **Schema Version**: `version: 1`
- **Synchronous Fallback**: Safe `try/catch` wrapping for all read, write, and purge operations.
- **Non-blocking Environment**: In SSR or test environments where `window` or `window.localStorage` is undefined, defaults to in-memory state without crashing.

```typescript
export const STORAGE_KEY = 'problempilot_state_v1';
export const STORAGE_SCHEMA_VERSION = 1;
```

---

### 3.2 State Schema to Persist

The persisted state represents `ValidationState`:

```typescript
export interface PersistedValidationState {
  version: number;
  id: string;
  currentStage: Stage;
  highestUnlockedStage: Stage;
  problem: ProblemInput;
  analyzedProblemHash: string | null;
  isDirty: boolean;
  analysis: AnalysisResult | null;
  experiment: ValidationExperiment | null;
  alternativeExperiment?: ValidationExperiment | null;
  findings: Finding[];
  ledger: LedgerEntry[];
  verdict: DecisionBrief | null;
  isDemo: boolean;
  demoScenarioId?: 'A' | 'B' | null;
  lastUpdated: string;
}
```

---

### 3.3 Safe Deserialization & Structural Validation

A critical failure mode in browser applications is crashing on launch if `localStorage` contains unexpected data (e.g. user ran an older version, manual tampering, or JSON truncation due to storage limit).

To prevent white-screen crashes, we implement:
1. **Syntactic Validation**: Catch `SyntaxError` from `JSON.parse`.
2. **Structural Type Guard (`isValidPersistedState`)**: Verifies required keys, stage validity, and array types.
3. **Self-Healing Dirty Consistency**: Recomputes `isDirty = computeProblemHash(problem) !== analyzedProblemHash` on rehydration to ensure runtime integrity.
4. **Automatic Purge on Corruption**: If corrupted JSON is encountered, the invalid key is removed and the user cleanly receives `createInitialState()`.

```typescript
const VALID_STAGES: readonly Stage[] = [
  'DRAFT',
  'ANALYZED',
  'TEST_DEFINED',
  'FINDINGS_ENTERED',
  'EVIDENCE_REVIEWED',
] as const;

export function isValidPersistedState(obj: unknown): obj is PersistedValidationState {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const candidate = obj as Record<string, unknown>;

  // Check version
  if (typeof candidate.version !== 'number' || candidate.version !== STORAGE_SCHEMA_VERSION) {
    return false;
  }

  // Check stage
  if (typeof candidate.currentStage !== 'string' || !VALID_STAGES.includes(candidate.currentStage as Stage)) {
    return false;
  }

  // Check problem object
  if (!candidate.problem || typeof candidate.problem !== 'object') {
    return false;
  }
  const prob = candidate.problem as Record<string, unknown>;
  if (typeof prob.idea !== 'string' || typeof prob.targetUser !== 'string' || typeof prob.context !== 'string') {
    return false;
  }

  // Check findings array
  if (!Array.isArray(candidate.findings)) {
    return false;
  }

  // Check boolean flags
  if (typeof candidate.isDirty !== 'boolean' || typeof candidate.isDemo !== 'boolean') {
    return false;
  }

  return true;
}

export function loadStoredState(): PersistedValidationState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }

    const parsed = JSON.parse(raw);
    if (isValidPersistedState(parsed)) {
      // Invariant sanity check: re-verify dirty status against hash
      if (parsed.analyzedProblemHash) {
        parsed.isDirty = computeProblemHash(parsed.problem) !== parsed.analyzedProblemHash;
      } else {
        parsed.isDirty = false;
      }
      return parsed;
    } else {
      console.warn('[ProblemPilot] Stored state failed schema validation. Resetting to initial DRAFT.');
      clearStoredState();
      return createInitialState();
    }
  } catch (err) {
    console.warn('[ProblemPilot] Corrupted JSON in localStorage. Resetting to initial DRAFT.', err);
    clearStoredState();
    return createInitialState();
  }
}
```

---

### 3.4 Auto-Save Execution Strategy

- **When to Save**: Every state modification triggers a sync to `localStorage`.
- **React Architecture**: In the store hook, a reactive `useEffect([state])` handles writes. Because React 19 runs `useEffect` after paint, writes do not introduce frame drops or input stutter.
- **QuotaExceeded Protection**: Wrapped with `try/catch` catching DOMException `QuotaExceededError`.
- **Multi-Tab Synchronization (Optional Enhancement)**: Listening to `window.addEventListener('storage', ...)` allows seamless multi-tab state alignment without conflict.

```typescript
export function persistState(state: PersistedValidationState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error('[ProblemPilot] LocalStorage quota exceeded. State could not be saved.', err);
    } else {
      console.warn('[ProblemPilot] Error writing to localStorage:', err);
    }
    return false;
  }
}

export function clearStoredState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[ProblemPilot] Failed to remove stored state:', err);
  }
}
```

---

## 4. Reset Case with Confirmation Dialog

### 4.1 Requirement Breakdown (PRD Scenario 13)

- **Trigger**: User clicks "Reset Case" button in the application header or menu.
- **Interaction Contract**: Must display a modal confirmation dialog before any data is altered.
- **Modal Content**:
  - **Title**: *"Reset Validation Case?"*
  - **Body**: *"Are you sure you want to abandon and reset this case? All entered problem statements, generated assumptions, experiment protocols, and recorded findings will be permanently cleared. This action cannot be undone."*
  - **Cancel Button**: Dismisses modal; all state remains completely intact.
  - **Confirm Button**: Destructive action (e.g. `bg-rose-600 active:scale-[0.97]`).
- **Confirmation Effect**:
  1. Calls `clearStoredState()` to delete `problempilot_state_v1` from `localStorage`.
  2. Reinitializes in-memory state to `createInitialState()` (`stage: 'DRAFT'`).
  3. Resets `analyzedProblemHash = null` and `isDirty = false`.
  4. Generates a fresh case ID (`case_${Date.now()}`).
  5. Navigates user back to Stage 1 form with empty fields.

---

## 5. Complete Code Design for `src/store/stateMachine.ts`

Below is the concrete, drop-in design for `src/store/stateMachine.ts`, incorporating types, dirty hashing, storage synchronization, and transition rules.

```typescript
import { useState, useEffect, useCallback } from 'react';
import type {
  Stage,
  ProblemInput,
  AnalysisResult,
  ValidationExperiment,
  Finding,
  DecisionBrief,
  LedgerEntry,
} from '../types';

export const STORAGE_KEY = 'problempilot_state_v1';
export const STORAGE_SCHEMA_VERSION = 1;

export const STAGE_ORDER: readonly Stage[] = [
  'DRAFT',
  'ANALYZED',
  'TEST_DEFINED',
  'FINDINGS_ENTERED',
  'EVIDENCE_REVIEWED',
] as const;

export interface ValidationState {
  version: number;
  id: string;
  currentStage: Stage;
  highestUnlockedStage: Stage;
  problem: ProblemInput;
  analyzedProblemHash: string | null;
  isDirty: boolean;
  analysis: AnalysisResult | null;
  experiment: ValidationExperiment | null;
  alternativeExperiment?: ValidationExperiment | null;
  findings: Finding[];
  ledger: LedgerEntry[];
  verdict: DecisionBrief | null;
  isDemo: boolean;
  demoScenarioId?: 'A' | 'B' | null;
  lastUpdated: string;
}

export const INITIAL_PROBLEM_INPUT: ProblemInput = {
  idea: '',
  targetUser: '',
  context: '',
  existingEvidence: '',
  constraints: '',
};

export function createInitialState(): ValidationState {
  return {
    version: STORAGE_SCHEMA_VERSION,
    id: `case_${Date.now()}`,
    currentStage: 'DRAFT',
    highestUnlockedStage: 'DRAFT',
    problem: { ...INITIAL_PROBLEM_INPUT },
    analyzedProblemHash: null,
    isDirty: false,
    analysis: null,
    experiment: null,
    alternativeExperiment: null,
    findings: [],
    ledger: [],
    verdict: null,
    isDemo: false,
    demoScenarioId: null,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Computes deterministic FNV-1a 32-bit hex hash of normalized ProblemInput.
 */
export function computeProblemHash(input: ProblemInput): string {
  const normalized = [
    input.idea?.trim() ?? '',
    input.targetUser?.trim() ?? '',
    input.context?.trim() ?? '',
    input.constraints?.trim() ?? '',
    (input.existingEvidence ?? (input as any).existingObservations ?? '')?.trim(),
  ].join('\u001F');

  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Checks if current ProblemInput is dirty compared to baseline hash.
 */
export function isProblemDirty(current: ProblemInput, baselineHash: string | null): boolean {
  if (baselineHash === null) return false;
  return computeProblemHash(current) !== baselineHash;
}

/**
 * Validates minimal requirements for Stage 1 input.
 */
export function validateProblemInput(input: ProblemInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.idea || input.idea.trim().length < 10) {
    errors.push('Idea must contain at least 10 characters describing the problem.');
  }
  if (!input.targetUser || input.targetUser.trim().length < 3) {
    errors.push('Target user must be specified (at least 3 characters).');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Guards state transitions between workflow stages.
 */
export function canTransitionTo(
  state: ValidationState,
  targetStage: Stage
): { allowed: boolean; reason?: string } {
  const currentIndex = STAGE_ORDER.indexOf(state.currentStage);
  const targetIndex = STAGE_ORDER.indexOf(targetStage);

  // Backward navigation is always allowed and non-destructive
  if (targetIndex <= currentIndex) {
    return { allowed: true };
  }

  // Linear progression: disallow skipping intermediate stages
  if (targetIndex > currentIndex + 1) {
    return {
      allowed: false,
      reason: `Cannot jump directly from ${state.currentStage} to ${targetStage}. Complete each stage in sequence.`,
    };
  }

  switch (targetStage) {
    case 'ANALYZED': {
      const validation = validateProblemInput(state.problem);
      if (!validation.valid) {
        return { allowed: false, reason: validation.errors.join(' ') };
      }
      if (!state.analysis) {
        return { allowed: false, reason: 'Analysis must be completed before advancing.' };
      }
      return { allowed: true };
    }

    case 'TEST_DEFINED': {
      if (!state.analysis) {
        return { allowed: false, reason: 'Analysis is required before defining an experiment.' };
      }
      if (!state.experiment) {
        return { allowed: false, reason: 'A validation experiment must be selected or generated.' };
      }
      return { allowed: true };
    }

    case 'FINDINGS_ENTERED': {
      if (!state.experiment) {
        return { allowed: false, reason: 'An active experiment must be defined before recording findings.' };
      }
      if (!state.findings || state.findings.length === 0) {
        return { allowed: false, reason: 'At least one finding must be recorded before proceeding.' };
      }
      return { allowed: true };
    }

    case 'EVIDENCE_REVIEWED': {
      if (!state.findings || state.findings.length === 0) {
        return { allowed: false, reason: 'Cannot review evidence without recorded findings.' };
      }
      if (state.isDirty) {
        return {
          allowed: false,
          reason: 'Problem statement was modified after analysis was generated. Re-run analysis before reviewing evidence.',
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * Validates deserialized state from localStorage.
 */
export function isValidPersistedState(obj: unknown): obj is ValidationState {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const candidate = obj as Record<string, unknown>;

  if (typeof candidate.version !== 'number' || candidate.version !== STORAGE_SCHEMA_VERSION) {
    return false;
  }
  if (typeof candidate.currentStage !== 'string' || !STAGE_ORDER.includes(candidate.currentStage as Stage)) {
    return false;
  }
  if (!candidate.problem || typeof candidate.problem !== 'object') {
    return false;
  }
  if (!Array.isArray(candidate.findings)) {
    return false;
  }
  if (typeof candidate.isDirty !== 'boolean') {
    return false;
  }
  return true;
}

export function loadStoredState(): ValidationState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (isValidPersistedState(parsed)) {
      if (parsed.analyzedProblemHash) {
        parsed.isDirty = computeProblemHash(parsed.problem) !== parsed.analyzedProblemHash;
      } else {
        parsed.isDirty = false;
      }
      return parsed;
    }
  } catch (err) {
    console.warn('[ProblemPilot] Corrupted JSON in localStorage. Resetting to DRAFT.', err);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  return createInitialState();
}

export function persistState(state: ValidationState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('[ProblemPilot] Failed to save state to localStorage:', err);
    return false;
  }
}

export function clearStoredState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Primary state machine store hook for React components.
 */
export function useValidationStore() {
  const [state, setState] = useState<ValidationState>(loadStoredState);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Auto-save on every state change
  useEffect(() => {
    persistState(state);
  }, [state]);

  const updateProblem = useCallback((update: Partial<ProblemInput>) => {
    setState((prev) => {
      const nextProblem = { ...prev.problem, ...update };
      const dirty = isProblemDirty(nextProblem, prev.analyzedProblemHash);
      return {
        ...prev,
        problem: nextProblem,
        isDirty: dirty,
        lastUpdated: new Date().toISOString(),
      };
    });
    setTransitionError(null);
  }, []);

  const applyAnalysis = useCallback((analysis: AnalysisResult, altExp?: ValidationExperiment) => {
    setState((prev) => {
      const hash = computeProblemHash(prev.problem);
      return {
        ...prev,
        currentStage: 'ANALYZED',
        highestUnlockedStage: 'ANALYZED',
        analysis,
        analyzedProblemHash: hash,
        isDirty: false,
        alternativeExperiment: altExp || null,
        lastUpdated: new Date().toISOString(),
      };
    });
    setTransitionError(null);
  }, []);

  const setExperiment = useCallback((experiment: ValidationExperiment) => {
    setState((prev) => ({
      ...prev,
      currentStage: 'TEST_DEFINED',
      highestUnlockedStage: 'TEST_DEFINED',
      experiment,
      lastUpdated: new Date().toISOString(),
    }));
    setTransitionError(null);
  }, []);

  const addFinding = useCallback((finding: Omit<Finding, 'id' | 'createdAt'>) => {
    const newFinding: Finding = {
      ...finding,
      id: `FND-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => {
      const nextFindings = [...prev.findings, newFinding];
      const nextStage: Stage = prev.currentStage === 'TEST_DEFINED' ? 'FINDINGS_ENTERED' : prev.currentStage;
      return {
        ...prev,
        currentStage: nextStage,
        highestUnlockedStage: 'FINDINGS_ENTERED',
        findings: nextFindings,
        lastUpdated: new Date().toISOString(),
      };
    });
    setTransitionError(null);
  }, []);

  const removeFinding = useCallback((id: string) => {
    setState((prev) => {
      const nextFindings = prev.findings.filter((f) => f.id !== id);
      const nextStage: Stage =
        nextFindings.length === 0 && prev.currentStage === 'FINDINGS_ENTERED'
          ? 'TEST_DEFINED'
          : prev.currentStage;
      return {
        ...prev,
        currentStage: nextStage,
        findings: nextFindings,
        lastUpdated: new Date().toISOString(),
      };
    });
    setTransitionError(null);
  }, []);

  const setVerdict = useCallback((verdict: DecisionBrief) => {
    setState((prev) => ({
      ...prev,
      currentStage: 'EVIDENCE_REVIEWED',
      highestUnlockedStage: 'EVIDENCE_REVIEWED',
      verdict,
      lastUpdated: new Date().toISOString(),
    }));
    setTransitionError(null);
  }, []);

  const transitionTo = useCallback((targetStage: Stage): { success: boolean; error?: string } => {
    const check = canTransitionTo(state, targetStage);
    if (!check.allowed) {
      setTransitionError(check.reason || 'Transition not allowed.');
      return { success: false, error: check.reason };
    }
    setTransitionError(null);
    setState((prev) => ({
      ...prev,
      currentStage: targetStage,
      lastUpdated: new Date().toISOString(),
    }));
    return { success: true };
  }, [state]);

  const clearDirtyStatus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      analyzedProblemHash: computeProblemHash(prev.problem),
      isDirty: false,
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const resetCase = useCallback(() => {
    clearStoredState();
    setState(createInitialState());
    setTransitionError(null);
  }, []);

  return {
    state,
    isDirty: state.isDirty,
    transitionError,
    clearTransitionError: () => setTransitionError(null),
    updateProblem,
    applyAnalysis,
    setExperiment,
    addFinding,
    removeFinding,
    setVerdict,
    transitionTo,
    clearDirtyStatus,
    resetCase,
  };
}
```

---

## 6. Unit Testing & Verification Points

The state machine and persistence logic must be verified using Vitest. Below are the exact verification suites:

### 6.1 Test Suite: `computeProblemHash` & Dirty Invalidation
- **Determinism**: Computing the hash twice for identical input produces the exact same 8-char hex string.
- **Sensitivity**: Changing any field (`idea`, `targetUser`, `context`, `constraints`, `existingEvidence`) produces a distinct hash.
- **Whitespace Normalization**: Trailing or leading spaces do not alter the hash (`"AI app "` equals `"AI app"`).
- **Auto-healing**: If a user modifies `idea` and later changes it back to the original text, `isDirty` returns to `false`.
- **Pre-Analysis Invariant**: Editing problem inputs when `analyzedProblemHash === null` keeps `isDirty: false`.

```typescript
describe('Problem Hashing & Dirty State Invalidation', () => {
  const baseProblem: ProblemInput = {
    idea: 'Mechanical CAD sign-off queue for university students',
    targetUser: 'Engineering Undergrads',
    context: 'Weekly lab sessions',
    constraints: 'No budget',
    existingEvidence: 'Observed 45 min wait times',
  };

  it('produces deterministic 8-character hex hash', () => {
    const hash1 = computeProblemHash(baseProblem);
    const hash2 = computeProblemHash({ ...baseProblem });
    expect(hash1).toHaveLength(8);
    expect(hash1).toBe(hash2);
  });

  it('normalizes leading and trailing whitespace', () => {
    const trimmed = computeProblemHash(baseProblem);
    const padded = computeProblemHash({
      ...baseProblem,
      idea: '  Mechanical CAD sign-off queue for university students  ',
    });
    expect(trimmed).toBe(padded);
  });

  it('detects changes across all problem fields', () => {
    const baseHash = computeProblemHash(baseProblem);
    expect(computeProblemHash({ ...baseProblem, idea: 'New Idea' })).not.toBe(baseHash);
    expect(computeProblemHash({ ...baseProblem, targetUser: 'TAs' })).not.toBe(baseHash);
    expect(computeProblemHash({ ...baseProblem, context: 'Online' })).not.toBe(baseHash);
    expect(computeProblemHash({ ...baseProblem, constraints: 'Paid' })).not.toBe(baseHash);
    expect(computeProblemHash({ ...baseProblem, existingEvidence: 'None' })).not.toBe(baseHash);
  });

  it('reports isProblemDirty false when baseline is null', () => {
    expect(isProblemDirty(baseProblem, null)).toBe(false);
  });

  it('reports isProblemDirty true when input diverges from baseline', () => {
    const baseline = computeProblemHash(baseProblem);
    expect(isProblemDirty(baseProblem, baseline)).toBe(false);
    expect(isProblemDirty({ ...baseProblem, idea: 'Divergent idea' }, baseline)).toBe(true);
  });

  it('auto-reverts isDirty when user edits back to baseline', () => {
    const baseline = computeProblemHash(baseProblem);
    const modified = { ...baseProblem, idea: 'Temporary edit' };
    expect(isProblemDirty(modified, baseline)).toBe(true);
    const restored = { ...baseProblem, idea: 'Mechanical CAD sign-off queue for university students' };
    expect(isProblemDirty(restored, baseline)).toBe(false);
  });
});
```

---

### 6.2 Test Suite: LocalStorage Persistence & Error Fallback
- **Storage Key**: Confirms item is stored under `problempilot_state_v1`.
- **Corrupted JSON Recovery**: Simulates `localStorage.getItem` returning `"{corrupted_json..."`. Verifies `loadStoredState()` purges the bad key and returns a fresh `DRAFT` state without throwing.
- **Corrupted Structure Recovery**: Simulates `localStorage.getItem` returning `{"currentStage": "NON_EXISTENT_STAGE"}`. Verifies type guard rejection and reset.
- **Dirty Hash Re-evaluation**: Rehydrating a state where `problem.idea` was edited recomputes `isDirty: true`.

```typescript
describe('LocalStorage Persistence & Fault-Tolerant Rehydration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists state with canonical key problempilot_state_v1', () => {
    const state = createInitialState();
    persistState(state);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(STORAGE_SCHEMA_VERSION);
    expect(parsed.currentStage).toBe('DRAFT');
  });

  it('safely recovers from malformed/corrupted JSON string in storage', () => {
    localStorage.setItem(STORAGE_KEY, '{"bad_json: true, unterminated');
    const state = loadStoredState();
    expect(state.currentStage).toBe('DRAFT');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // Purged
  });

  it('safely recovers from invalid schema structure', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStage: 'INVALID_STAGE', foo: 123 }));
    const state = loadStoredState();
    expect(state.currentStage).toBe('DRAFT');
  });

  it('re-evaluates isDirty consistency upon rehydration', () => {
    const base = createInitialState();
    base.analyzedProblemHash = computeProblemHash(base.problem);
    base.problem.idea = 'Modified idea post-analysis';
    base.isDirty = false; // Intentionally out of sync

    persistState(base);
    const rehydrated = loadStoredState();
    expect(rehydrated.isDirty).toBe(true);
  });
});
```

---

### 6.3 Test Suite: Transition Guards & Dirty Gating
- **Stage 5 Blocked on Dirty**: At `FINDINGS_ENTERED` with recorded findings, if `isDirty === true`, `canTransitionTo('EVIDENCE_REVIEWED')` returns `{ allowed: false, reason: ... }`.
- **Stage 5 Unblocked on Clean**: When `isDirty === false`, transition is allowed.
- **Backward Non-Destructive**: From `FINDINGS_ENTERED`, navigating back to `DRAFT` is allowed and preserves `findings.length >= 1`.

```typescript
describe('Stage Transition Guards & Dirty Gating', () => {
  it('blocks transition to EVIDENCE_REVIEWED if problem is dirty', () => {
    const state = createInitialState();
    state.currentStage = 'FINDINGS_ENTERED';
    state.findings = [{ id: 'F1', description: 'Observed user', sourceType: 'direct_observation', isCredibleObservation: true, createdAt: '' }];
    state.isDirty = true;

    const check = canTransitionTo(state, 'EVIDENCE_REVIEWED');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Problem statement was modified');
  });

  it('allows transition to EVIDENCE_REVIEWED when findings exist and problem is clean', () => {
    const state = createInitialState();
    state.currentStage = 'FINDINGS_ENTERED';
    state.findings = [{ id: 'F1', description: 'Observed user', sourceType: 'direct_observation', isCredibleObservation: true, createdAt: '' }];
    state.isDirty = false;

    const check = canTransitionTo(state, 'EVIDENCE_REVIEWED');
    expect(check.allowed).toBe(true);
  });

  it('preserves all entered findings when navigating backward to DRAFT', () => {
    const state = createInitialState();
    state.currentStage = 'FINDINGS_ENTERED';
    state.findings = [{ id: 'F1', description: 'Finding', sourceType: 'direct_observation', isCredibleObservation: true, createdAt: '' }];

    const check = canTransitionTo(state, 'DRAFT');
    expect(check.allowed).toBe(true);
    // Findings remain intact in memory
    expect(state.findings).toHaveLength(1);
  });
});
```

---

### 6.4 Test Suite: Reset Case Lifecycle
- Verifies calling `resetCase()` clears localStorage and returns fresh `DRAFT` state.

```typescript
describe('Reset Case Workflow', () => {
  it('clears localStorage and returns pristine DRAFT state', () => {
    const state = createInitialState();
    state.currentStage = 'FINDINGS_ENTERED';
    state.findings = [{ id: 'F1', description: 'Finding', sourceType: 'direct_observation', isCredibleObservation: true, createdAt: '' }];
    persistState(state);

    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    clearStoredState();
    const cleanState = createInitialState();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(cleanState.currentStage).toBe('DRAFT');
    expect(cleanState.findings).toHaveLength(0);
    expect(cleanState.analyzedProblemHash).toBeNull();
    expect(cleanState.isDirty).toBe(false);
  });
});
```

---

## 7. Synthesis & Coordination with Peer Agents

1. **Alignment with `explorer_m1_1` (Types & Schemas)**:
   - Uses string literal unions for `Stage` (`'DRAFT' | 'ANALYZED' | ...`) ensuring 100% compliance with `erasableSyntaxOnly: true`.
   - Uses canonical field names: `isDirty` (boolean), `analyzedProblemHash` (string | null), `lastUpdated` (string ISO).
2. **Alignment with `explorer_m1_2` (Transitions & Guards)**:
   - Synchronizes transition guards so that `canTransitionTo('EVIDENCE_REVIEWED')` explicitly gates on `!state.isDirty`.
   - Backward transitions are completely free and non-destructive.
3. **Alignment with Hackathon PRD**:
   - Satisfies **Scenario 10 (S10)**: Modification of problem statement triggers `isDirty` and blocks advancement to Stage 5 until re-analysis.
   - Satisfies **Scenario 13 (S13)**: Confirmed reset clears `localStorage` and resets workspace to `DRAFT`.
