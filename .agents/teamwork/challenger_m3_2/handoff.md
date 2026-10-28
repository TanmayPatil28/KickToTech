# Milestone 3 Challenger 2 Verification Report: OutdatedBanner & Non-Destructive Navigation

**Verdict**: **APPROVE**

## 1. Observation

### 1.1 Dirty Problem Statement Handling & Outdated Banner
- In `src/components/common/OutdatedBanner.tsx` (lines 15-46):
  - Renders with `role="alert"`, Amber warning palette (`bg-amber-950/60 border-amber-600/80 text-amber-200`), and `AlertTriangle` icon.
  - Header text: `"Analysis Outdated — Problem Statement Modified"`
  - Description: `"The core problem formulation was edited after the current analysis was generated. Existing assumptions, experiments, and evidence mappings may no longer reflect the revised hypothesis."`
  - Re-analysis action button (lines 35-44): Tactile secondary button labelled `"Re-run Analysis"` with `RotateCcw` icon. When triggered, invokes `onReanalyze`, navigating back to Stage 1 (`DRAFT`).
- In `src/App.tsx` (lines 175-183):
  - Conditionally displays `OutdatedBanner` above the two-column workspace whenever `isDirty && currentStage !== 'DRAFT'`.
- In `src/components/stages/` (`Stage2Assumptions.tsx:53`, `Stage3Experiment.tsx:42`, `Stage4Findings.tsx:99`, `Stage5Verdict.tsx:135`):
  - Each stage view conditionally renders `<OutdatedBanner onReanalyze={...} />` when `isDirty === true`.
- In `src/components/sidebar/HypothesisCard.tsx` (lines 47-64):
  - When `isDirty === true`, renders an alert container: `"Problem Modified (Analysis Outdated)"` with explanation `"Formulation was edited. Re-run analysis to synchronize evidence with your new statement."` and action button `"Re-analyze Now"`.

### 1.2 Stage 5 Gating When Dirty
- In `src/store/stateMachine.ts` (lines 243-248):
  ```typescript
  case 'EVIDENCE_REVIEWED': {
    if (!state.findings || state.findings.length < 1) {
      return { allowed: false, reason: 'At least one evidence finding must be recorded before requesting an evidence review.' };
    }
    if (state.isDirty || state.isProblemStale) {
      return { allowed: false, reason: 'The problem statement was modified after analysis was generated. You must re-run analysis before reviewing evidence.' };
    }
    return { allowed: true };
  }
  ```
- In `src/domain/stateMachine.ts` (lines 105-109):
  ```typescript
  if (state.isProblemStale || state.isDirty) {
    return {
      allowed: false,
      reason: 'Cannot review verdict with a stale problem statement. Re-analyze first.',
    };
  }
  ```
- In `src/components/layout/StageProgressBar.tsx` (lines 76-79):
  - `const check = canNavigateTo ? canNavigateTo(stage) : { allowed: isCompleted || isCurrent };`
  - `const isClickable = isCompleted || (isPending && check.allowed);`
  - For Stage 5 (`idx > currentIndex`), `check.allowed` is `false` when dirty. The button renders with `disabled=""`, `cursor-not-allowed`, and title tooltip displaying the gating reason.
- In `tests/empirical-challenger-m3-2.test.ts` (lines 274-365):
  - Verified pure transition `transitionTo('EVIDENCE_REVIEWED', dirtyState)` returns `{ success: false }`.
  - Verified re-analysis resets hash and `isDirty: false`, which unblocks `canTransitionToStore('EVIDENCE_REVIEWED')` to return `{ allowed: true }`.

### 1.3 Non-Destructive Backwards Navigation
- In `src/store/stateMachine.ts` (lines 286-340):
  - `transitionTo`: executes pure stage updates (`state.currentStage = targetStage`) while copying `state.findings`, `state.experiment`, `state.analysis`, `state.problem`, and `state.ledger` by reference without clearing any data.
- In `src/components/layout/StageProgressBar.tsx` (lines 73-78):
  - `isCompleted = idx < currentIndex;`
  - `isClickable = isCompleted || ...`
  - All previously visited stages remain clickable at all times.
- In UI Stage components:
  - `Stage5Verdict`: `"Review Findings Ledger"` (`onBackToFindings`) returns to Stage 4.
  - `Stage4Findings`: `"Back to Experiment"` (`onBackToExperiment`) returns to Stage 3.
  - `Stage3Experiment`: `"Back to Assumptions"` (`onBackToAnalysis`) returns to Stage 2.
  - `Stage2Assumptions`: `"Refine Formulation"` (`onEditProblem`) returns to Stage 1.
- In `tests/empirical-challenger-m3-2.test.ts` (lines 430-555, 715-745):
  - Stepped back from Stage 4 and Stage 5 through Stages 3, 2, 1. Verified 100% of findings (count, IDs, descriptions, source types, context notes), experiment, analysis, and problem fields are retained verbatim.
  - Exercised 10 continuous round-trip cycles between `DRAFT` and `FINDINGS_ENTERED`. Zero data degradation observed.

### 1.4 Reset Confirmation Flow
- In `src/components/layout/Header.tsx` (lines 132-214):
  - Clicking the `"New Case"` button sets `showResetConfirm = true`.
  - Does NOT call `onReset` immediately.
  - Renders a modal backdrop with heading `"Start New Validation Case?"` and warning:
    `"This action will reset your entered problem statement, analysis critique, validation experiments, and recorded findings ledger. Unsaved evidence will be permanently cleared."`
  - Provides two tactile buttons:
    - `"Cancel"`: calls `setShowResetConfirm(false)` without touching state.
    - `"Confirm Reset"`: calls `setShowResetConfirm(false)` and invokes `onReset()`.
- In `src/store/evidenceStore.ts` (lines 363-374):
  - `resetCase`: removes `STORAGE_KEY` from `localStorage` and resets state to clean `INITIAL_STATE` at `stage: 'DRAFT'`.

---

## 2. Logic Chain

1. **Dirty Handling Verification**:
   - Direct inspection and empirical testing of `OutdatedBanner` confirms it renders with `role="alert"`, the designated copy, and a `"Re-run Analysis"` tactile button.
   - Verified that `isDirty = true` triggers this banner across Stage 2, Stage 3, Stage 4, Stage 5, and the right sidebar's `HypothesisCard`.
   - Verified that `canTransitionToStore('EVIDENCE_REVIEWED', dirtyState)` and `canTransitionToDomain(dirtyState, 'EVIDENCE_REVIEWED')` disallow transition to Stage 5, rendering the Stage 5 progress bar stepper button disabled until a re-analysis resets `isDirty: false`.
2. **Backwards Navigation Verification**:
   - Direct execution of `transitionTo('TEST_DEFINED')`, `transitionTo('ANALYZED')`, and `transitionTo('DRAFT')` from an advanced state with 2 logged findings, full experiment, and analysis demonstrates that all data structures in `state.findings`, `state.experiment`, `state.analysis`, and `state.problem` remain 100% identical.
   - Stepping back from Stage 5 preserves the synthesized verdict.
   - UI stage components provide clear, accessible tactile back buttons (`"Review Findings Ledger"`, `"Back to Experiment"`, `"Back to Assumptions"`, `"Refine Formulation"`).
3. **Reset Flow Verification**:
   - `Header.tsx` enforces that `onReset` cannot be triggered accidentally: clicking `"New Case"` opens a confirmation dialog requiring explicit user affirmation via `"Confirm Reset"`.
   - Cancelling leaves the state intact; confirming purges `localStorage` and restores `INITIAL_STATE`.
4. **Build & Quality Gates**:
   - `npm test`: 14 passed (310 tests, 0 failures).
   - `npm run build`: `tsc -b && vite build` built cleanly in 1.44s.
   - `npm run lint`: `oxlint` reported 0 errors and 0 warnings across 54 files.

---

## 3. Caveats

- In `Stage4Findings.tsx`, the primary button at the bottom (`"Review Evidence & Synthesize Verdict"`) disables when `findings.length === 0 || isLoading`, but does not explicitly check `isDirty`. However, `OutdatedBanner` is rendered prominently at the top of the form with `"Re-run Analysis"`, `StageProgressBar` disables advancing to Stage 5, and the state machine transition guards strictly prevent Stage 5 transition while dirty.

---

## 4. Conclusion

The implementation of `OutdatedBanner`, dirty problem statement handling, guarded Stage 5 advancement, non-destructive backward navigation, and reset confirmation flow satisfies all requirements in `ORIGINAL_REQUEST.md` (§R2) and `PROJECT.md` (F03, F04, F06).

**Verdict: APPROVE**.

---

## 5. Verification Method

To independently reproduce and verify this report:

1. Run the test suite:
   ```bash
   npx vitest run tests/empirical-challenger-m3-2.test.ts
   npm test
   ```
   *Expected*: 14 test files pass, 310/310 tests pass with 0 failures.

2. Run the production build:
   ```bash
   npm run build
   ```
   *Expected*: Zero TypeScript or Vite bundle errors.

3. Run the linter:
   ```bash
   npm run lint
   ```
   *Expected*: 0 warnings, 0 errors.

4. Inspect test code:
   `tests/empirical-challenger-m3-2.test.ts`
