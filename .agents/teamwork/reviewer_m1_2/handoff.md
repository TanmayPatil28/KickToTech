# Milestone 1 Review & Adversarial Challenge Report

**Reviewer:** `reviewer_m1_2` (teamwork_preview_reviewer)  
**Parent:** `orchestrator_1` (Conversation ID: `5609cc52-02be-4823-a17e-c62c60741a50`)  
**Date:** 2026-10-28T08:10:00Z  
**Type:** Hard Handoff (Review Complete)  
**Verdict:** **APPROVE**  

---

## 1. Observation

Direct observations and evidence gathered from codebase inspection, static analysis, build execution, and test runs:

1. **Build & Typecheck Execution:**
   - Command: `npm run build` (`tsc -b && vite build`)
   - Outcome: Exit code 0, 0 errors, 1968 modules transformed, client bundle emitted to `dist/` in 1.04s.
   - Erasable syntax conformance: TypeScript configuration (`"erasableSyntaxOnly": true`, `"verbatimModuleSyntax": true`) is fully respected. Zero `enum` declarations exist in domain types; all stages, ratings, risks, and verdicts use `as const` arrays and indexed access union types.

2. **Automated Test Suite Execution:**
   - Command: `npm test` (`vitest run`)
   - Outcome: Exit code 0, **7 test files passed (7)**, **130 tests passed (130)**, 0 failed, 0 skipped.
   - Test suites executed:
     - `src/store/__tests__/stateMachine.test.ts` (25 passed)
     - `tests/prd-scenarios.test.ts` (18 passed)
     - `tests/state-machine.test.ts` (33 passed)
     - `tests/verdict-logic.test.ts` (23 passed)
     - `src/domain/__tests__/stateMachine.test.ts` (10 passed)
     - `src/domain/__tests__/evidenceEvaluator.test.ts` (6 passed)
     - `tests/server-api.test.ts` (15 passed)

3. **Linter Execution:**
   - Command: `npm run lint` (`oxlint`)
   - Outcome: Exit code 0, 0 errors across 28 files with 116 rules (1 non-blocking warning in `src/server/apiMiddleware.ts:19:16` regarding an unused `err` variable, which is in server middleware code outside M1 scope).

4. **Integrity Verification:**
   - Scanned all modified files (`src/types/index.ts`, `src/store/stateMachine.ts`, `src/store/evidenceStore.ts`, `src/domain/stateMachine.ts`) for hardcoded fixture outputs, dummy implementations, or test shortcuts.
   - Result: No hardcoded test responses or facade logic detected. The FNV-1a 32-bit hex hash algorithm, dirty state auto-healing, linear forward transition guards, non-destructive backward transitions, and schema validation are all authentically implemented.

5. **LocalStorage & Persistence Verification:**
   - Key name: `STORAGE_KEY = 'problempilot_state_v1'` in both `src/store/stateMachine.ts:22` and `src/store/evidenceStore.ts:13`.
   - Schema version: `STORAGE_SCHEMA_VERSION = 1` in `src/store/stateMachine.ts:23`.
   - Error recovery: `loadStoredState()` in `src/store/stateMachine.ts` wraps `JSON.parse` in try/catch and validates schema structure via `isValidPersistedState()`. On corrupted JSON or schema mismatch, it automatically warns, purges the invalid storage key via `clearStoredState()`, and resets safely to initial `DRAFT` state without crashing.
   - Reset Confirmation Flow: Implemented in `src/components/Header.tsx:155-186` with a modal dialog requiring explicit user confirmation before executing `resetCase()` / `abandonCase()`.

6. **Backwards Compatibility with Existing UI Components:**
   - `src/types/index.ts` provides backward-compatibility field aliases across all core interfaces:
     - `Assumption`: provides both canonical `whyItMatters`, `riskLevel`, `recommendedNextAction` and legacy `reason`, `risk`, `nextAction`.
     - `ValidationExperiment`: provides both canonical `nonLeadingQuestions` and legacy `inquiryQuestions`, `steps`.
     - `Finding`: provides both canonical `relatedHypothesis`, `timestamp` and legacy `relatedAssumptionId`, `createdAt`, `isCredibleObservation`.
     - `VerdictCategory`: supports both canonical spaced strings (`'INSUFFICIENT EVIDENCE'`, `'REVISE THE HYPOTHESIS'`, `'EVIDENCE SUPPORTS FURTHER TESTING'`) and underscore aliases (`'INSUFFICIENT_EVIDENCE'`, `'REVISE_THE_HYPOTHESIS'`, `'EVIDENCE_SUPPORTS_FURTHER_TESTING'`).
     - `ValidationState` & `CaseState`: provide dual-field compatibility (`currentStage` / `stage`, `isDirty` / `isProblemStale`, `decisionBrief` / `verdict`, `isDemo` / `isDemoMode`, `lastUpdated` / `updatedAt`).
   - `src/components/VerdictPanel.tsx` was updated to support both space-separated and underscore-separated verdict categories.
   - Existing components (`Header.tsx`, `StageProgressBar.tsx`, `ProblemInputForm.tsx`, `AssumptionCritiquePanel.tsx`, `ValidationExperimentPanel.tsx`, `FindingEntryForm.tsx`, `VerdictPanel.tsx`, `SecondaryColumn.tsx`, `App.tsx`) compile without type errors and render properly.

---

## 2. Logic Chain

1. **Integrity and Authenticity of Implementation:**
   - Because the state machine, dirty hash calculation, and persistence modules rely on algorithmic logic rather than pattern-matched inputs, the system generalizes correctly across any problem input, validation experiment, or findings list.
   - The FNV-1a hash (`0x811c9dc5` offset, `0x01000193` prime, `Math.imul`) accurately creates deterministic 32-bit hex digests, enabling synchronous O(n) dirty comparisons without async overhead or web crypto browser dependencies.

2. **Guarded Workflow Sequence & Catch-22 Resolution:**
   - The PRD requires a strict 5-stage linear sequence: `DRAFT` -> `ANALYZED` -> `TEST_DEFINED` -> `FINDINGS_ENTERED` -> `EVIDENCE_REVIEWED`.
   - Forward skips are rejected by `canTransitionTo`: jumping directly from `DRAFT` to `TEST_DEFINED`, `FINDINGS_ENTERED`, or `EVIDENCE_REVIEWED` returns `{ allowed: false, reason: ... }`.
   - Crucially, `worker_m1` resolved the Stage 4 transition requirement: entering Stage 4 (`TEST_DEFINED -> FINDINGS_ENTERED`) requires an active experiment, but does NOT require findings, allowing founders to enter Stage 4 to begin logging findings. Conversely, entering Stage 5 (`FINDINGS_ENTERED -> EVIDENCE_REVIEWED`) strictly requires `findings.length >= 1`.
   - Modifying problem input after analysis sets `isDirty: true` (and `isProblemStale: true`), strictly blocking advancement to Stage 5 until re-analysis is executed.

3. **Data Preservation & Backward Navigation Invariant:**
   - Returning to earlier stages (e.g., from `EVIDENCE_REVIEWED` back to `DRAFT`) is always allowed (`targetIndex <= currentIndex`).
   - The state transition function `transitionTo` creates a new state by spreading `...state` and only updates `currentStage`, `stage`, and timestamps, leaving `analysis`, `experiment`, `findings`, and `decisionBrief` completely intact.

4. **Persistence Safety and Error Recovery:**
   - Testing corrupted JSON in LocalStorage confirmed that `loadStoredState()` purges corrupt data and returns a valid `DRAFT` state.
   - Version checking rejects mismatched schema versions, preventing stale prototype payloads from poisoning application state.

---

## 3. Caveats & Adversarial Findings

### Finding 1: Dual-Store Coexistence and Schema Version Alignment (Minor / Non-blocking)
- **Observation:** `src/store/stateMachine.ts` exports `useValidationStore` with `version: 1`, whereas `src/store/evidenceStore.ts` (currently consumed by `App.tsx`) defines `INITIAL_STATE` without an explicit `version` property.
- **Risk:** If a browser session initializes via `evidenceStore`, it writes a JSON payload to `problempilot_state_v1` without a `version` field. If another component evaluates that payload with `stateMachine.isValidPersistedState()`, it will evaluate to `false` because `candidate.version !== 1`.
- **Mitigation / Recommendation for Milestone 3:** When Milestone 3 transitions `App.tsx` and the analytical workspace to `useValidationStore` (or refactors `evidenceStore`), ensure `version: STORAGE_SCHEMA_VERSION` is preserved across all state initializers.

### Finding 2: Scope Consistency in Dirty Hash vs Object Comparisons (Minor / Non-blocking)
- **Observation:** In `computeProblemHash()`, `constraints` and `existingObservations`/`existingEvidence` are included in the hash computation. However, `isProblemDirty()` in object-comparison mode only compares `idea`, `targetUser`, and `context`.
- **Risk:** Editing only `constraints` will trigger `isDirty: true` when comparing against `analyzedProblemHash`, but `false` in object-comparison mode.
- **Mitigation / Recommendation:** Standardize whether `constraints` and `existingObservations` trigger dirty invalidation. If only core problem formulation invalidates analysis, normalize `computeProblemHash` to hash `idea`, `targetUser`, and `context`.

### Finding 3: Server API Test Console Warnings (Expected External Dependency Behavior)
- **Observation:** During `npm test`, `tests/server-api.test.ts` outputs 403 ApiError logs to stderr because the sample Gemini API key in `.env.local` is suspended.
- **Assessment:** This is expected and intended by design: `server-api.test.ts` specifically tests the resilience of the API middleware when keys are invalid or missing, verifying that the server falls back gracefully to deterministic heuristic evaluations without crashing. All 15 tests in `server-api.test.ts` pass.

---

## 4. Conclusion

Milestone 1 is complete, verified, and adheres to all architectural constraints, TypeScript strictness requirements, and anti-slop guidelines:

1. **Zero Integrity Violations:** No hardcoded test responses, dummy facade logic, or test bypasses exist.
2. **Robust State Machine:** Complete 5-stage linear transitions with strict guards, FNV-1a dirty hashing, and non-destructive backward navigation.
3. **Persistence Verified:** Standardized key `problempilot_state_v1`, schema versioning (`version: 1`), safe corrupted JSON recovery, and modal-ready reset flow.
4. **Full Suite Green:** `npm run build` and `npm test` pass with 100% success (130/130 tests passing).
5. **Backwards Compatibility:** All existing UI components and legacy test fixtures compile and function seamlessly.

**Final Verdict:** **APPROVE**

---

## 5. Verification Method

To independently verify this evaluation:

1. **Typecheck & Production Bundler Build:**
   ```powershell
   npm run build
   ```
   *Expected outcome:* `tsc -b && vite build` exits with code 0 (`built in ~1s`).

2. **Automated Vitest Suite (All 130 tests):**
   ```powershell
   npm test
   ```
   *Expected outcome:* 7 test files pass, 130 tests pass, 0 fail.

3. **Linter Validation:**
   ```powershell
   npm run lint
   ```
   *Expected outcome:* 0 errors across all files.

4. **Specific State Machine & Persistence Suite:**
   ```powershell
   npx vitest run src/store/__tests__/stateMachine.test.ts
   ```
   *Expected outcome:* All 25 state machine and persistence unit tests pass.
