# Milestone 3 Challenger Verification Report: 5-Stage Workflow UI & State Transitions

**Verdict**: `REQUEST_CHANGES`

---

## 1. Observation

### 1.1 Test Suite & Build Status
- Ran full test suite command:
  ```bash
  npm test
  ```
  Result: 14 test files passed, 310/310 tests passed (including 27 newly authored empirical challenger tests in `tests/empirical-challenger-m3.test.ts` and 21 in `tests/empirical-challenger-m3-2.test.ts`).
- Ran production build command:
  ```bash
  npm run build
  ```
  Result: `tsc -b && vite build` succeeded cleanly in 819ms with zero errors.
- Ran linter command:
  ```bash
  npm run lint
  ```
  Result: `oxlint` reported 0 errors across 54 files.

### 1.2 Component Rendering Observations Across Stages 1–5
1. **Stage 1 (Define Problem - `Stage1Define.tsx`)**:
   - Empty input state: Displays character count warnings (`0/10 chars min`, `0/3 chars min`). Submit button has `disabled=""` attribute.
   - Validation threshold: Inputs below 10 characters for `idea` or below 3 characters for `targetUser` display validation errors. Valid inputs enable submit button with text `"Analyze Problem & Challenge Assumptions"`.
   - Presets: "Vague Idea" and "Specific Problem" buttons are rendered with tactile active press (`active:scale-[0.97]`).
   - Epistemic note: Displays Honest AI notice emphasizing clarity critiques and prohibiting solution-first pitching.
2. **Stage 2 (Challenge Assumptions - `Stage2Assumptions.tsx`)**:
   - Clarity indicators: Renders `clear` (emerald), `incomplete` (amber), and `vague` (rose) with semantic icons and missing details lists.
   - Assumption cards: Renders unique IDs (`ASM-1`, `ASM-2`, etc.), risk badges (`HIGH RISK`, `MEDIUM RISK`, `LOW RISK`), status badges (`UNVERIFIED`, `PARTIALLY SUPPORTED`, `SUPPORTED`), required evidence lists, and recommended next actions.
   - Alternative explanations, workarounds, and highest-risk uncertainties are properly structured.
   - Stale detection: When `isDirty=true`, renders `OutdatedBanner` with `"Analysis Outdated — Problem Statement Modified"` and re-run action.
3. **Stage 3 (Validation Experiment - `Stage3Experiment.tsx`)**:
   - Experiment card: Renders core hypothesis under test, objective, estimated effort (e.g. `"1.5 hours"`), and target participant cohort.
   - Inquiry questions: Renders non-leading past-behavior questions under `"Non-Leading Past-Behavior Inquiry Questions"` with the badge `"Past Actions Only • Zero Hypotheticals"`.
   - Signals & limits: Distinct corroborating supporting signals (emerald) and counter-evidence weakening signals (rose), along with explicit `"Test Limitations & Epistemic Bounds:"`.
   - Action controls: "Back to Assumptions" and "Proceed to Log Findings" buttons rendered.
4. **Stage 4 (Record Findings - `Stage4Findings.tsx`)**:
   - Form inputs: Textarea for observed behavior, dropdown with 4 canonical source types (`direct_observation`, `user_reported`, `interpretation`, `assumption`), related assumption selector mapped to assumption IDs, and context notes input.
   - Presets: Quick test injections (`+ Contradiction`, `+ Supporting Signal`, `+ Subjective Praise`) rendered.
   - Guard check: When `findings.length === 0`, "Review Evidence & Synthesize Verdict" button is `disabled`, warning `"At least 1 finding required to synthesize verdict"` is displayed, and empty state `"No findings logged yet."` is shown. When `findings.length >= 1`, button is enabled with `"Sufficient evidence to review"`.
   - Delete controls: Findings list renders each record with source tag, timestamp, and trash icon calling `onRemoveFinding(id)`.
5. **Stage 5 (Decision Brief - `Stage5Verdict.tsx`)**:
   - Verdict categories: Explicitly renders one of the three canonical categories: `INSUFFICIENT EVIDENCE`, `REVISE THE HYPOTHESIS`, or `EVIDENCE SUPPORTS FURTHER TESTING`. Normalizes underscore format (`REVISE_THE_HYPOTHESIS`).
   - Prohibited word verification: Passing prohibited strings (such as `verdict: "PROVEN"` or `category: "GUARANTEED MARKET DEMAND"`) safely falls back to `INSUFFICIENT EVIDENCE`. "PROVEN" is never rendered as a verdict title. The only occurrence of "PROVEN" in the component is inside the negative disclaimer in the Epistemic Integrity Notice (`"Hypotheses are never declared 'PROVEN' nor is market demand guaranteed from initial pilot signals."`).
   - Grounded sections: Decision Rationale, Refined Problem Statement Post-Evidence, Supported Claims, Unsupported Claims, Contradictory Findings, Remaining Uncertainties, and Recommended Next Steps are all rendered.

### 1.3 Critical Defect Observed: Workflow Lockup at Stage 3 -> Stage 4 Transition
Direct empirical observations of code and runtime state machine guards:

1. In `src/domain/stateMachine.ts`, lines 82–96:
   ```typescript
   case 'FINDINGS_ENTERED': {
     if (!state.experiment) {
       return { allowed: false, reason: 'An active experiment must be defined before recording findings.' };
     }
     if (!state.findings || state.findings.length === 0) {
       return { allowed: false, reason: 'At least one evidence finding must be recorded before proceeding.' };
     }
     if (state.isProblemStale || state.isDirty) {
       return {
         allowed: false,
         reason: 'The problem statement was modified after the initial analysis. Please re-run analysis to synchronize evidence.',
       };
     }
     return { allowed: true };
   }
   ```
2. In `src/store/stateMachine.ts`, lines 218–234:
   ```typescript
   case 'FINDINGS_ENTERED': {
     // Transition from TEST_DEFINED to FINDINGS_ENTERED requires an active experiment defined.
     // (Do NOT require findings to enter Stage 4!).
     if (!state.experiment) {
       return {
         allowed: false,
         reason: 'A validation experiment must be defined before proceeding to record findings.',
       };
     }
     if (state.isDirty || state.isProblemStale) {
       return {
         allowed: false,
         reason: 'The problem statement was modified after the initial analysis. Please re-run analysis to synchronize evidence.',
       };
     }
     return { allowed: true };
   }
   ```
3. In `src/store/evidenceStore.ts`, line 18 and lines 335–342:
   ```typescript
   import { canTransitionTo as canTransitionToDomain } from '../domain/stateMachine.ts';
   ...
   const navigateTo = useCallback(
     (targetStage: WorkflowStage): boolean => {
       // Check guards using domain guard first (supports legacy tests) or store guard
       const check = canTransitionToDomain(state, targetStage);
       if (!check.allowed) {
         setTransitionError(check.reason || 'Invalid stage transition.');
         return false;
       }
   ```
4. In `src/store/evidenceStore.ts`, line 392:
   ```typescript
   canTransitionTo: (targetStage: WorkflowStage) => canTransitionToStore(targetStage, state),
   ```
5. In `src/components/stages/Stage3Experiment.tsx`, lines 225–233:
   ```tsx
   <TactileButton
     variant="primary"
     size="lg"
     onClick={onProceedToFindings}
     icon={<ArrowRight className="w-4 h-4" />}
     iconPosition="right"
   >
     Proceed to Log Findings
   </TactileButton>
   ```
   where in `src/App.tsx`, lines 213–218:
   ```tsx
   <Stage3Experiment
     experiment={state.experiment}
     onProceedToFindings={() => navigateTo('FINDINGS_ENTERED')}
     onBackToAnalysis={() => navigateTo('ANALYZED')}
     onReanalyze={() => navigateTo('DRAFT')}
     isDirty={isDirty}
   />
   ```
6. In `src/store/evidenceStore.ts`, lines 286–308:
   ```typescript
   const removeFinding = useCallback(
     (id: string) => {
       setState((prev) => {
         const nextFindings = prev.findings.filter((f) => f.id !== id);
         const nextStage: WorkflowStage =
           nextFindings.length === 0 && prev.stage === 'FINDINGS_ENTERED'
             ? 'TEST_DEFINED'
             : prev.stage;
   ```

---

## 2. Logic Chain

1. **User Workflow Sequence**: In a fresh user session, the user enters problem details in Stage 1 and analyzes it (advancing to `ANALYZED`), then clicks "Design Validation Experiment" in Stage 2 (advancing to `TEST_DEFINED`). At this moment, the user has an experiment, but `state.findings` is empty (`[]`).
2. **Form Accessibility**: In `App.tsx`, `Stage4Findings` is ONLY rendered when `currentStage === 'FINDINGS_ENTERED'`. There is NO finding entry form rendered during `currentStage === 'TEST_DEFINED'`. Therefore, the user must transition to `FINDINGS_ENTERED` in order to see and use the finding entry form.
3. **Execution Failure**: On Stage 3 (`TEST_DEFINED`), the user clicks "Proceed to Log Findings" (`onProceedToFindings`). This calls `navigateTo('FINDINGS_ENTERED')`.
4. **Guard Evaluation**: In `evidenceStore.ts`, `navigateTo` invokes `canTransitionToDomain(state, 'FINDINGS_ENTERED')` from `src/domain/stateMachine.ts`. Lines 86–88 evaluate:
   ```typescript
   if (!state.findings || state.findings.length === 0) {
     return { allowed: false, reason: 'At least one evidence finding must be recorded before proceeding.' };
   }
   ```
   Because `state.findings.length === 0`, `check.allowed` evaluates to `false`.
5. **State Trap**: `navigateTo` sets `transitionError` to `"At least one evidence finding must be recorded before proceeding."` and aborts the transition (`return false`). The stage remains `'TEST_DEFINED'`. The user is completely blocked from navigating to Stage 4.
6. **UI Contradiction / Split-Brain**: In `StageProgressBar.tsx`, the clickable status of Stage 4 is determined via `canNavigateTo`, which calls `canTransitionToStore` (`src/store/stateMachine.ts`). `canTransitionToStore` correctly allows entering Stage 4 with 0 findings. Thus, the Stage 4 step button appears active and clickable in the top progress bar. However, clicking it invokes `onNavigate` (`navigateTo`), which runs `canTransitionToDomain` and fails with an error alert. The UI advertises Stage 4 as available, but clicking it rejects the user.
7. **Deletion Lockout Trap**: If a user is on Stage 4 (e.g. loaded via demo mode) and removes their only finding, `removeFinding` executes `nextFindings.length === 0 && prev.stage === 'FINDINGS_ENTERED' ? 'TEST_DEFINED' : prev.stage`, demoting the user back to Stage 3 (`TEST_DEFINED`). Once demoted to Stage 3 with 0 findings, the user is permanently locked out from re-entering Stage 4 to record a new finding.
8. **Requirement Conflict**: The PRD and PROJECT.md contract specify:
   - "stage transitions are guarded: stage 3 cannot be entered without an analyzed idea; stage 5 cannot be completed without recorded findings."
   - "blocking Stage 5 advancement if findings = 0"
   Neither document ever specifies that Stage 4 cannot be entered without recorded findings. Stage 4 is the evidence collection station where findings are created.

---

## 3. Caveats

- **Scope & Non-Destructive Challenger Protocol**: Per the review-only constraint (`"Review-only — do NOT modify implementation code"`, `"Report any failures as findings — do NOT fix them yourself"`), this agent did not modify `src/store/evidenceStore.ts` or `src/domain/stateMachine.ts`. The defect was verified empirically through automated test execution and code tracing.
- **Component Styling & Anti-Slop Compliance**: The visual styling, typography, responsive two-column grid, mobile tab toggles, and `<300ms` `active:scale-[0.97]` tactile transitions in `src/components/` and `src/index.css` are exceptionally well-implemented and fully conform to all user anti-slop guidelines.
- **Legacy Test Dependency**: In `tests/state-machine.test.ts` lines 348–358, there is an existing legacy test asserting `blocks transition to FINDINGS_ENTERED when findings array is empty`. When fixing the domain guard, that legacy test must also be updated to assert that entering Stage 4 with 0 findings is permitted, while entering Stage 5 with 0 findings is blocked (consistent with `tests/state-machine-adversarial.test.ts` line 259).

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 3 cannot be approved for production sign-off in its current state because the core user journey from Stage 3 (`TEST_DEFINED`) to Stage 4 (`FINDINGS_ENTERED`) is blocked by an invalid guard in `src/domain/stateMachine.ts` and `src/store/evidenceStore.ts`.

### Required Changes for Worker:

1. **Fix `src/store/evidenceStore.ts` (`navigateTo`)**:
   In `src/store/evidenceStore.ts` line 338, change:
   ```typescript
   // Currently:
   const check = canTransitionToDomain(state, targetStage);
   // Should be:
   const check = canTransitionToStore(targetStage, state);
   ```
   Or harmonize both domain and store guards so `navigateTo` and `canTransitionTo` use the same canonical state machine guard.
2. **Fix `src/domain/stateMachine.ts` (`canTransitionTo`)**:
   In `src/domain/stateMachine.ts` lines 86–88:
   Remove the check requiring findings to enter `FINDINGS_ENTERED`. Entering Stage 4 to record findings must only require an experiment (`!state.experiment`), not existing findings:
   ```typescript
   case 'FINDINGS_ENTERED': {
     if (!state.experiment) {
       return { allowed: false, reason: 'An active experiment must be defined before recording findings.' };
     }
     if (state.isProblemStale || state.isDirty) {
       return {
         allowed: false,
         reason: 'The problem statement was modified after the initial analysis. Please re-run analysis to synchronize evidence.',
       };
     }
     return { allowed: true };
   }
   ```
3. **Update Legacy Test in `tests/state-machine.test.ts`**:
   Update lines 348–358 of `tests/state-machine.test.ts` to assert that transition to `FINDINGS_ENTERED` is allowed when findings = 0 and experiment is present (matching `tests/state-machine-adversarial.test.ts` and `tests/empirical-challenger-m3.test.ts`).
4. **Prevent Premature Demotion on Deleting Findings in `src/store/evidenceStore.ts`**:
   In `removeFinding` (line 291), do not kick the user back to `'TEST_DEFINED'` when `nextFindings.length === 0`. The user is on the findings screen and should stay on `FINDINGS_ENTERED` so they can add a replacement finding.

---

## 5. Verification Method

To independently reproduce and verify this defect and all component checks:

1. **Run Empirical Challenger Test Suite**:
   ```bash
   npx vitest run tests/empirical-challenger-m3.test.ts
   ```
   *Expected Result*: 27 passed. Tests 7.1 and 7.2 specifically reproduce and verify the guard contradiction and lockout bug.
2. **Verify Split-Brain Guard Evaluation via CLI**:
   ```bash
   node -e "import('./src/domain/stateMachine.ts').then(domain => import('./src/store/stateMachine.ts').then(store => { const state = { stage: 'TEST_DEFINED', currentStage: 'TEST_DEFINED', problem: { idea: 'Valid idea here for machine shop', targetUser: 'Users', context: 'Lab' }, analysis: { assumptions: [{ id: 'ASM-1', claim: 'PDF search fail', riskLevel: 'high', status: 'unverified' }] }, experiment: { id: 'EXP-1', title: 'Test', hypothesis: 'Hypothesis' }, findings: [] }; console.log('Store guard (StageProgressBar):', store.canTransitionTo('FINDINGS_ENTERED', state)); console.log('Domain guard (navigateTo):', domain.canTransitionTo(state, 'FINDINGS_ENTERED')); }));"
   ```
   *Output*:
   ```
   Store guard (StageProgressBar): { allowed: true }
   Domain guard (navigateTo): { allowed: false, reason: 'At least one evidence finding must be recorded before proceeding.' }
   ```
3. **Run Full Test Suite & Build Verification**:
   ```bash
   npm test
   npm run build
   npm run lint
   ```
   *Output*: All 310 vitest tests pass, vite build completes cleanly with exit code 0, 0 linter errors.
