# Milestone 1 Handoff Report: Canonical Domain Types, Pure State Machine & Persistence

**Author:** `worker_m1` (teamwork_preview_worker)  
**Parent:** `orchestrator_1` (Conversation ID: `5609cc52-02be-4823-a17e-c62c60741a50`)  
**Date:** 2026-10-28T07:55:00Z  
**Type:** Hard Handoff (Task Complete)

---

## 1. Observation

Direct observations and evidence from project files and tool executions:

1. **Compiler Strictness & Type Erasure (`tsconfig.app.json`):**
   - `"erasableSyntaxOnly": true`, `"verbatimModuleSyntax": true`, `"noUnusedLocals": true`.
   - TypeScript enums emit runtime IIFEs and fail typecheck with `TS5137: Enums are not allowed when 'erasableSyntaxOnly' is enabled`.
   - All domain schemas must be expressed as string union types over `as const` arrays and pure interfaces.

2. **Source Code Implementation (`src/types/index.ts`):**
   - Canonical `Stage` ('DRAFT' | 'ANALYZED' | 'TEST_DEFINED' | 'FINDINGS_ENTERED' | 'EVIDENCE_REVIEWED') via `STAGES as const`.
   - Canonical `ProblemInput` (`idea`, `targetUser`, `context`, `existingObservations`, `constraints`, plus backward alias `existingEvidence`).
   - Canonical `ClarityRating` ('clear' | 'incomplete' | 'vague').
   - Canonical `RiskLevel` ('high' | 'medium' | 'low').
   - Canonical `AssumptionStatus` ('unverified' | 'partially_supported' | 'supported') with alias `EvidenceStatus`.
   - Canonical `Assumption` with `whyItMatters`, `riskLevel`, `recommendedNextAction`, and legacy aliases `reason`, `risk`, `nextAction`.
   - Canonical `ValidationExperiment` with `hypothesis`, `nonLeadingQuestions`, `evidenceToRecord`, `supportingSignals`, `weakeningSignals`, `limitations`, `estimatedEffort`, and legacy aliases `inquiryQuestions`, `steps`.
   - Canonical `SourceType` ('direct_observation' | 'user_reported' | 'interpretation' | 'assumption') and alias `FindingSourceType`.
   - Canonical `Finding` with `id`, `description`, `sourceType`, `relatedHypothesis`, `context`, `timestamp`, and legacy aliases.
   - Canonical `VerdictCategory` ('INSUFFICIENT EVIDENCE' | 'REVISE THE HYPOTHESIS' | 'EVIDENCE SUPPORTS FURTHER TESTING') and legacy underscore union.
   - Canonical `DecisionBrief` and `ValidationState` with complete backward compatibility bridges for `Verdict` and `CaseState`.

3. **State Machine & Transition Guards (`src/store/stateMachine.ts`):**
   - `DRAFT` -> `ANALYZED`: requires `validateProblemInput(problem).valid` (`idea >= 10`, `targetUser >= 3`) AND `analysis !== null`.
   - `ANALYZED` -> `TEST_DEFINED`: requires `analysis !== null && analysis.assumptions.length > 0`.
   - `TEST_DEFINED` -> `FINDINGS_ENTERED`: requires `experiment !== null` (findings not required to enter Stage 4).
   - `FINDINGS_ENTERED` -> `EVIDENCE_REVIEWED`: requires `findings.length >= 1` AND `!isDirty` (and `!isProblemStale`).
   - Backward transitions: always allowed (`targetIndex <= currentIndex`) and strictly non-destructive (findings, experiments, hypotheses, and verdicts are preserved untouched).
   - `canTransitionTo` and `transitionTo` implemented with overloads supporting both `(targetStage, state)` and `(state, targetStage)`.

4. **FNV-1a Hashing & Storage Persistence (`src/store/stateMachine.ts`, `src/store/evidenceStore.ts`):**
   - Deterministic 32-bit FNV-1a hex hash `computeProblemHash(input)` across trimmed problem fields separated by `\u001F`.
   - Auto-healing dirty tracking: `isProblemDirty(current, baselineHash)` automatically clears back to `false` when input is restored to match the baseline.
   - Standardized LocalStorage key `STORAGE_KEY = 'problempilot_state_v1'` with `STORAGE_SCHEMA_VERSION = 1`.
   - Safe parsing in `loadStoredState()` with corrupted JSON fallback purging invalid state back to pristine `DRAFT`.
   - Two-phase modal-ready `resetCase` / `abandonCase` returning to pristine `DRAFT`.
   - `useValidationStore` React hook with auto-save on state mutation.

5. **Build & Test Verification Commands and Results:**
   - Command: `npm run build`
     - Output: `tsc -b && vite build` exited with code 0 (`built in 820ms`).
   - Command: `npx vitest run`
     - Output: `7 passed (7)`, `130 passed (130)`, `0 failed`, exited with code 0.
   - Command: `npm run lint`
     - Output: 0 errors across 28 files with 116 rules.

---

## 2. Logic Chain

1. **From `erasableSyntaxOnly` constraint to canonical types:**
   - Because `tsconfig.app.json` enforces `--erasableSyntaxOnly`, runtime TypeScript constructs like `enum` are compiler errors.
   - Defining `const STAGES = [...] as const` and `type Stage = (typeof STAGES)[number]` creates an immutable runtime lookup array and a compile-time string union type that erases completely at compile time.
   - Providing dual-field support on `Assumption`, `ValidationExperiment`, `Finding`, `DecisionBrief`, and `ValidationState` guarantees that both canonical PRD contracts and existing pre-built codebase references compile seamlessly with zero type divergence.

2. **From PRD Epistemic Directives to Stage Guard Rules:**
   - Startup validation cannot claim "PROVEN" from small sample sizes. `VerdictCategory` is strictly bounded to 3 cautious outcomes.
   - To prevent skip-ahead vanity validation, forward transitions require prerequisite artifacts (Stage 2 requires analysis; Stage 3 requires assumptions; Stage 4 requires experiment; Stage 5 requires findings).
   - To fix the critical catch-22 identified by explorer_m1_2 where entering Stage 4 was blocked without findings, `TEST_DEFINED -> FINDINGS_ENTERED` requires only an active experiment.
   - If a founder modifies the problem statement after analysis, `isDirty` is set to `true`, strictly blocking advancement to Stage 5 until re-analysis synchronizes evidence.
   - Backward navigation must never destroy entered findings or test designs so founders can freely cross-reference context without data loss.

3. **From Dirty State & Persistence Requirements to FNV-1a & Safe Rehydration:**
   - FNV-1a computes an 8-character hex hash synchronously without external dependencies or async crypto overhead.
   - Normalizing whitespace and optional fields prevents false-positive dirty flags.
   - Comparing current problem hash against `analyzedProblemHash` provides automatic healing: if an edit is reverted or re-analyzed, `isDirty` returns to `false`.
   - Wrapping storage access in `getStorage()` and wrapping `JSON.parse` with schema validation protects against corrupted browser data or SSR/Node runtime crashes.

---

## 3. Caveats

- **External Gemini API Key in Test Output:** During `tests/server-api.test.ts`, the console logs a 403 ApiError from Google Generative Language API because the mock/sample key in `.env.local` is suspended. This is expected and intended: `tests/server-api.test.ts` specifically tests that the server handles missing/suspended keys gracefully with deterministic heuristic fallback, and all 15 tests in that suite pass.
- **Scope Discipline:** Files in `tests/` were left unmodified in accordance with instructions. 25 unit tests were added to `src/store/__tests__/stateMachine.test.ts` to test all new state machine and persistence functions.

---

## 4. Conclusion

Milestone 1 is complete and fully verified:
1. `src/types/index.ts` provides complete, canonical domain schemas under `"erasableSyntaxOnly": true` with backward compatibility bridges.
2. `src/store/stateMachine.ts` provides a pure state machine with strict forward progression guards, non-destructive backward transitions, FNV-1a dirty hashing, schema-versioned LocalStorage persistence (`problempilot_state_v1`), and the `useValidationStore` React hook.
3. `src/domain/stateMachine.ts` and `src/store/evidenceStore.ts` have been updated to utilize `src/store/stateMachine.ts` and standardized storage keys.
4. TypeScript compilation (`tsc -b`), production build (`npm run build`), linting (`npm run lint`), and Vitest (`npx vitest run`) all pass with 0 errors (130/130 tests passing).

---

## 5. Verification Method

To independently reproduce and verify this implementation:

1. **Verify TypeScript Compilation (`erasableSyntaxOnly` & strict checks):**
   ```powershell
   npx tsc -b
   ```
   *Expected outcome:* Exits with code 0, 0 errors.

2. **Verify Full Production Bundler Build:**
   ```powershell
   npm run build
   ```
   *Expected outcome:* `tsc -b && vite build` compiles client bundle into `dist/`, exits with code 0.

3. **Verify All Vitest Test Suites:**
   ```powershell
   npx vitest run
   ```
   *Expected outcome:* 7 test suites pass, 130 tests pass, 0 failed.

4. **Verify Oxlint:**
   ```powershell
   npm run lint
   ```
   *Expected outcome:* 0 errors.
