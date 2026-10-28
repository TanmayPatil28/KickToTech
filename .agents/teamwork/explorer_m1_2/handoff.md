# Handoff Report: State Machine Transitions & Guard Rules Strategy

**Agent:** explorer_m1_2  
**Milestone:** Milestone 1 — Core Domain Schemas, State Machine & Store  
**Target Recipient:** orchestrator_1 (`5609cc52-02be-4823-a17e-c62c60741a50`)  
**Primary Deliverable:** `c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\explorer_m1_2\transitions_strategy.md`  

---

## 1. Observation

1. **Current Guard Bug in `src/domain/stateMachine.ts`:**
   In lines 87-101 of `src/domain/stateMachine.ts`:
   ```typescript
   case 'FINDINGS_ENTERED': {
     if (!state.experiment) {
       return { allowed: false, reason: 'An active experiment must be defined before recording findings.' };
     }
     if (!state.findings || state.findings.length === 0) {
       return { allowed: false, reason: 'At least one evidence finding must be recorded before proceeding.' };
     }
     if (state.isProblemStale) {
       return {
         allowed: false,
         reason: 'The problem statement was modified after the initial analysis. Please re-run analysis to synchronize evidence.',
       };
     }
     return { allowed: true };
   }
   ```
   Directly observed that checking `if (!state.findings || state.findings.length === 0)` when transitioning *into* `FINDINGS_ENTERED` prevents a user in Stage 3 (`TEST_DEFINED`) from navigating to Stage 4 (`Stage4Findings.tsx`) to enter their initial finding.

2. **Prompt & PRD Guard Specifications:**
   In `ORIGINAL_REQUEST.md` line 51:
   ```markdown
   - [ ] Stage transitions are guarded: stage 3 cannot be entered without an analyzed idea; stage 5 cannot be completed without recorded findings.
   ```
   And in parent dispatch:
   ```markdown
   - `DRAFT` -> `ANALYZED`: requires valid problem inputs.
   - `ANALYZED` -> `TEST_DEFINED`: requires analyzed idea (assumptions generated).
   - `TEST_DEFINED` -> `FINDINGS_ENTERED`: requires experiment defined.
   - `FINDINGS_ENTERED` -> `EVIDENCE_REVIEWED`: requires at least 1 finding entered. Also, if `isDirty` is true, Stage 5 cannot be completed without re-analysis.
   ```

3. **Non-Destructive Invariant:**
   `ORIGINAL_REQUEST.md` line 27:
   ```markdown
   - Allow returning to earlier stages without losing entered findings or hypotheses. Support abandoning/resetting a case with confirmation.
   ```
   `spec_inventory.md` line 77-78:
   ```markdown
   - Users may freely navigate back to any previously unlocked stage (e.g. from Stage 4 back to Stage 1 or Stage 2) via the stage progress indicator or step buttons.
   - **Data Preservation Invariant**: Navigating backwards **never** deletes or clears entered findings, generated experiments, or notes. All previously populated form state is preserved.
   ```

4. **Existing Test Suite & Runtime Status:**
   Executed `npx vitest run`:
   ```
   RUN  v5.0.5 C:/Users/Tanmay/OneDrive/Desktop/KickToTech
   ✓ src/domain/__tests__/stateMachine.test.ts (10 tests) 11ms
   ✓ src/domain/__tests__/evidenceEvaluator.test.ts (6 tests) 11ms
   Test Files  2 passed (2)
        Tests  16 passed (16)
   ```
   All current tests pass, but test coverage for transitioning from `TEST_DEFINED` to `FINDINGS_ENTERED` with 0 findings does not currently exist.

5. **Type Compatibility (`tsconfig.app.json`):**
   `tsconfig.app.json` specifies `"erasableSyntaxOnly": true`. Zero TypeScript runtime enums can be used; strictly string union literals and `as const` arrays are required.

---

## 2. Logic Chain

1. **Step 1 (Guard Correctness):** From Observation 1 and Observation 2, Stage 4 (`FINDINGS_ENTERED`) is the view where user input occurs (`Stage4Findings.tsx`). Moving from Stage 3 (`TEST_DEFINED`) to Stage 4 requires only that an experiment is defined (`state.experiment !== null`). Requiring findings to enter Stage 4 is an off-by-one guard error; the requirement for $\ge 1$ finding belongs strictly on the transition from Stage 4 (`FINDINGS_ENTERED`) to Stage 5 (`EVIDENCE_REVIEWED`).
2. **Step 2 (Dirty-State Invalidation):** From Observation 2 and Observation 3, when `isDirty === true` (problem statement edited post-analysis), the user must be permitted to view prior stages (with a warning banner), but advancing into Stage 5 (`EVIDENCE_REVIEWED`) must be strictly blocked until re-analysis is executed.
3. **Step 3 (Backward Invariance):** From Observation 3, backward transitions (`targetIndex <= currentIndex`) must return `{ allowed: true }` unconditionally, and the reducer/updater must preserve the entire `state.findings`, `state.experiment`, `state.analysis`, and `state.ledger` without clearing or nullifying.
4. **Step 4 (Zero-Dependency State Architecture):** From Observation 5 and `PROJECT.md`, the state machine should be structured as pure TypeScript functions (`canTransitionTo`, `validateProblemInput`, `checkProblemDirty`, `validationReducer`) coupled with a lightweight React 19 hook (`useValidationStore`) that manages local storage persistence and exposes `transitionTo`. This requires zero external runtime libraries (no Redux, Zustand, or XState).

---

## 3. Caveats

1. **Type Alias Coexistence:** Existing code uses `WorkflowStage` and `CaseState`, whereas the prompt and `PROJECT.md` specify `Stage` and `ValidationState`. The implementation must export type aliases (e.g. `export type Stage = ...; export type WorkflowStage = Stage;`) to ensure zero breakage of existing files (`evidenceEvaluator.ts`, `demoData.ts`, etc.).
2. **File Consolidation:** Currently `src/domain/stateMachine.ts` holds domain guard functions and `src/store/evidenceStore.ts` holds the React hook. In `PROJECT.md`, `src/store/stateMachine.ts` is designated as the target file. The implementer should either consolidate the pure state machine logic into `src/store/stateMachine.ts` or re-export it cleanly.

---

## 4. Conclusion

The transition strategy report has been compiled in detail at:
`c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\explorer_m1_2\transitions_strategy.md`

Key recommendations for implementation:
1. Update `canTransitionTo`:
   - `DRAFT -> ANALYZED`: valid problem (`idea >= 10`, `targetUser >= 3`) + analysis present.
   - `ANALYZED -> TEST_DEFINED`: analysis present with `assumptions.length > 0`.
   - `TEST_DEFINED -> FINDINGS_ENTERED`: experiment defined (`experiment !== null`).
   - `FINDINGS_ENTERED -> EVIDENCE_REVIEWED`: `findings.length >= 1` AND `!isDirty`.
   - Backward transitions: always allowed.
2. Implement pure `validationReducer` and `transitionTo` returning `{ success: boolean; error?: string }`.
3. Preserve all entered data on backward transitions.
4. Implement the 14-scenario unit test suite detailed in Section 6 of `transitions_strategy.md`.

---

## 5. Verification Method

1. Inspect `c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\explorer_m1_2\transitions_strategy.md`.
2. Run existing Vitest tests:
   ```bash
   npx vitest run
   ```
3. Type-check with erasable syntax verification:
   ```bash
   npx tsc -b
   ```
4. Invalidation condition: If `canTransitionTo('FINDINGS_ENTERED', state)` rejects a state where `experiment !== null` and `findings = []`, the guard is invalid and will prevent normal user flow into Stage 4.
