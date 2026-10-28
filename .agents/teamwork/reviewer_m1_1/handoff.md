# Review & Adversarial Challenge Report: Milestone 1

**Reviewer:** `reviewer_m1_1` (teamwork_preview_reviewer)  
**Roles:** Reviewer & Adversarial Critic  
**Parent:** `orchestrator_1` (Conversation ID: `5609cc52-02be-4823-a17e-c62c60741a50`)  
**Date:** 2026-10-28T08:00:00Z  
**Type:** Hard Handoff (Review Complete)  
**Verdict:** **APPROVE**

---

## Review Summary

- **Verdict:** **APPROVE**
- **Integrity Assessment:** **PASS — NO INTEGRITY VIOLATIONS DETECTED**
  - No hardcoded test results embedded in source code.
  - Genuine implementations of FNV-1a hashing, state transition logic, and LocalStorage persistence.
  - No shortcuts, facades, or fabricated outputs.
- **Compiler Strictness:** Verified zero TypeScript enums across `src/` and `tests/`; full conformance with `erasableSyntaxOnly: true`.
- **Build & Test Verification:**
  - `npm run build` (`tsc -b && vite build`) passed with exit code 0 (`built in 959ms`).
  - `npm test` (`vitest run`) passed 7/7 test suites and 130/130 automated tests with 0 failures.

---

## 1. Observation

Direct observations and evidence collected during independent verification:

1. **Compiler Flags & Enum Search:**
   - `tsconfig.app.json` line 22 specifies `"erasableSyntaxOnly": true`.
   - Ripgrep regex search `\benum\s+[A-Za-z0-9_]+` across `src/` returned **0 matches**.
   - Ripgrep regex search `\benum\s+[A-Za-z0-9_]+` across `tests/` returned **0 matches**.
   - In `src/types/index.ts`, all stage, clarity, risk, status, source, and verdict constants are defined using `as const` arrays and indexed union types (e.g. `export const STAGES = [...] as const; export type Stage = (typeof STAGES)[number];`).

2. **State Transition Guards (`src/store/stateMachine.ts` lines 163–255):**
   - Stage order index enforces sequential navigation: `DRAFT` (0) -> `ANALYZED` (1) -> `TEST_DEFINED` (2) -> `FINDINGS_ENTERED` (3) -> `EVIDENCE_REVIEWED` (4).
   - Forward skipping is blocked: `if (targetIndex > currentIndex + 1)` returns `{ allowed: false, reason: "Cannot jump from ... directly to ..." }`.
   - Stage 2 (`ANALYZED`): requires `validateProblemInput(state.problem).valid` (`idea.length >= 10`, `targetUser.length >= 3`) and `state.analysis !== null`.
   - Stage 3 (`TEST_DEFINED`): requires `state.analysis !== null && state.analysis.assumptions.length > 0`.
   - Stage 4 (`FINDINGS_ENTERED`): requires `state.experiment !== null` and `!state.isDirty && !state.isProblemStale`. It does **not** block entry if findings array is empty.
   - Stage 5 (`EVIDENCE_REVIEWED`): requires `state.findings && state.findings.length >= 1` and `!state.isDirty && !state.isProblemStale`.
   - Backward transitions: `if (targetIndex <= currentIndex)` returns `{ allowed: true }`.

3. **Non-Destructive Navigation (`src/store/stateMachine.ts` lines 324–333):**
   - In `transitionTo`:
     ```typescript
     const nextState: ValidationState = {
       ...state,
       currentStage: targetStage,
       stage: targetStage,
       highestCompletedStage: nextHighest,
       highestUnlockedStage: nextHighest,
       lastUpdated: now,
       updatedAt: now,
     };
     ```
   - Findings, experiments, analysis, and decision brief remain completely preserved when navigating backward.

4. **Dirty State Detection & Auto-Healing (`src/store/stateMachine.ts` lines 119–158):**
   - Pure 32-bit FNV-1a hex hashing (`computeProblemHash`) normalizes trimmed problem fields joined by ASCII Unit Separator (`\u001F`).
   - `isProblemDirty(current, baselineOrHash)` supports both string hash comparison and `ProblemInput` object comparison.
   - Auto-healing verified: when edited fields are restored to match the baseline hash, `isProblemDirty` automatically evaluates to `false`.

5. **LocalStorage Persistence & Safety (`src/store/stateMachine.ts` lines 346–424):**
   - Standardized key `STORAGE_KEY = 'problempilot_state_v1'` with `STORAGE_SCHEMA_VERSION = 1`.
   - `isValidPersistedState(obj)` validates version, stage membership in `STAGE_ORDER`, problem field types, and findings array type.
   - Corrupted JSON or schema mismatch falls back cleanly to `createInitialValidationState()` and purges bad localStorage items without runtime crash.

6. **Build & Test Outputs:**
   - Command: `npm run build`
     - Result: `tsc -b && vite build` completed in 959ms, exit code 0.
   - Command: `npm test`
     - Result: 7 test files passed, 130 tests passed, 0 failed, exit code 0.
   - Command: `npm run lint`
     - Result: 0 errors across 28 files (1 pre-existing warning in `src/server/apiMiddleware.ts:19` regarding unused catch variable `err`).

---

## 2. Logic Chain

1. **From TypeScript Constraints to Schema Architecture:**
   - Observation 1 demonstrates that `"erasableSyntaxOnly": true` is enforced by the compiler.
   - Because TypeScript enums emit non-erasable JavaScript runtime code, any `enum` declaration would fail compilation with `TS5137`.
   - The use of `as const` arrays and indexed string union types in `src/types/index.ts` complies with runtime type erasure and passes `tsc -b`.

2. **From PRD Epistemic Rules to State Machine Transitions:**
   - Requirement R1 forbids unfounded claims of "PROVEN" and requires guarded workflow progression.
   - Observation 2 confirms that premature jumps (e.g. `DRAFT` directly to `TEST_DEFINED` or `EVIDENCE_REVIEWED`) are rejected with descriptive reasons.
   - Prerequisite checks ensure that an experiment cannot be designed without assumptions, and evidence cannot be reviewed without recorded empirical findings (`findings.length >= 1`).
   - Observation 3 confirms that backward navigation does not wipe recorded findings or hypotheses, allowing non-destructive exploratory review.

3. **From Dirty State Requirement to Invalidation Enforcement:**
   - Requirement R2 mandates that editing problem formulation after analysis flags previous work as outdated.
   - Observation 4 confirms that editing core problem fields changes the FNV-1a hash, triggering `isDirty = true` and `isProblemStale = true`.
   - Observation 2 confirms that `isDirty = true` prevents advancing to `EVIDENCE_REVIEWED`, enforcing re-analysis before a decision brief can be issued.

4. **From Integrity Check to Approval:**
   - Independent verification via clean build (exit code 0), zero failing tests (130/130 passing), and absence of synthetic workarounds or facades proves the implementation meets Milestone 1 requirements.

---

## 3. Findings

### [Minor] Finding 1: Scope Difference Between Hash-Based and Object-Based Dirty Checks

- **What:** In `src/store/stateMachine.ts`, `computeProblemHash` includes `constraints` and `existingObservations`/`existingEvidence` in the hash computation (lines 124–125), whereas `isProblemDirty(current, baselineObject)` only compares `idea`, `targetUser`, and `context` (lines 153–156).
- **Where:** `src/store/stateMachine.ts:120-135` and `src/store/stateMachine.ts:151-157`.
- **Why:** In `useValidationStore`, the store compares `computeProblemHash(nextProblem) !== prev.analyzedProblemHash`. Consequently, in the React store, editing `constraints` after analysis will set `isDirty = true`. However, when calling `isProblemDirty(modified, baselineProblem)` with two objects, changing constraints returns `false`.
- **Impact:** Very low. In practice, modifying constraints in the UI may reasonably prompt re-analysis. All 130 tests currently pass because tests specifically verify each branch.
- **Suggestion:** For future milestones (M3), align `computeProblemHash` to only hash core problem formulation fields (`idea`, `targetUser`, `context`) if optional constraints should never invalidate an analysis.

---

## 4. Adversarial Challenge & Stress-Test Results

| # | Attack Scenario | Tested Condition | Predicted / Actual Outcome | Status |
|---|-----------------|------------------|----------------------------|--------|
| 1 | Backward Navigation Data Loss | User navigates from `EVIDENCE_REVIEWED` to `DRAFT` | Findings, experiment, and analysis remain intact in state | **PASS** |
| 2 | Direct Stage Jump | User invokes `transitionTo('EVIDENCE_REVIEWED', draftState)` | Blocked by `targetIndex > currentIndex + 1` guard | **PASS** |
| 3 | Advance with Zero Findings | User attempts `FINDINGS_ENTERED -> EVIDENCE_REVIEWED` with `findings: []` | Blocked by `state.findings.length < 1` check | **PASS** |
| 4 | Corrupted LocalStorage Payload | Storage contains malformed JSON `"{bad"` or schema mismatch `version: 99` | Handled via try-catch and schema validator; safely resets to `DRAFT` | **PASS** |
| 5 | Whitespace Padding Dirty False Positive | User enters leading/trailing whitespace into problem input | Fields trimmed before FNV-1a hashing; hash identical, `isDirty` stays `false` | **PASS** |
| 6 | Edit Undo Auto-Healing | User edits problem (`isDirty: true`) then reverts to exact original text | FNV-1a hash matches baseline; `isDirty` automatically clears to `false` | **PASS** |
| 7 | Forbidden Epistemic Terms | Verify verdict strings in types and fixtures | Strictly restricted to 3 categories; "PROVEN" and "GUARANTEED MARKET DEMAND" are absent | **PASS** |

---

## 5. Verified Claims

- Zero enums in codebase -> Verified via ripgrep (`\benum\s+`) -> **PASS**
- TypeScript build passes cleanly -> Verified via `npm run build` (`tsc -b && vite build`) -> **PASS**
- All unit and integration test suites pass -> Verified via `npm test` (130/130 passing) -> **PASS**
- Backward navigation is non-destructive -> Verified via unit test & code inspection -> **PASS**
- Dirty state blocks Stage 5 review -> Verified via transition guard check & unit test -> **PASS**

---

## 6. Caveats

- **External Gemini API in Test Output:** When running `tests/server-api.test.ts`, the console outputs expected 403 API errors because the mock Google API key in `.env.local` is suspended. The test suite verifies that the server falls back gracefully to deterministic heuristic responses, and all 15 tests pass.
- **Server Middleware Oxlint Warning:** `src/server/apiMiddleware.ts:19:16` contains an unused `err` variable warning. This file belongs to Milestone 2 and does not affect Milestone 1 artifacts.

---

## 7. Conclusion

Milestone 1 satisfies all functional, architectural, and quality criteria defined in `ORIGINAL_REQUEST.md` (R1, R2) and `PROJECT.md`:
- Canonical domain types in `src/types/index.ts` adhere strictly to `"erasableSyntaxOnly": true` with zero TypeScript enums.
- The state machine in `src/store/stateMachine.ts` enforces linear stage progression, blocks unauthorized jumps, preserves data across backward navigation, detects problem edits with auto-healing FNV-1a hashing, and safely manages LocalStorage persistence under key `problempilot_state_v1`.
- Legacy compatibility bridges in `src/domain/stateMachine.ts` and `src/store/evidenceStore.ts` ensure all existing test suites pass without regression.

**Final Verdict:** **APPROVE** (Ready for Milestone 2: Server API Middleware & Gemini AI Service).

---

## 8. Verification Method

To independently verify this review:

1. **Verify `erasableSyntaxOnly` (zero enums):**
   ```powershell
   git grep -E "\benum\s+[A-Za-z0-9_]+" src/ tests/
   ```
   *Expected:* 0 matches.

2. **Verify TypeScript compilation and production build:**
   ```powershell
   npm run build
   ```
   *Expected:* Exits with code 0 (`built in ~900ms`).

3. **Verify automated test suite:**
   ```powershell
   npm test
   ```
   *Expected:* 7 test suites pass, 130 tests pass, 0 failures.
