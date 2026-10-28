## 2026-10-28T08:35:57Z
You are worker_m3, a teamwork_preview_worker.
Your working directory is: c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\worker_m3
Your parent is orchestrator_1 (conversation ID: 5609cc52-02be-4823-a17e-c62c60741a50).

Read:
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\PROJECT.md
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\TEST_READY.md
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\types\index.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\store\stateMachine.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\store\evidenceStore.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\services\api.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Ownership:
You exclusively own:
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\components\ (all components)
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\App.tsx
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\index.css
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\index.html
DO NOT modify `tests/`, `server/`, or `TEST_INFRA.md`.

Design & Anti-Slop Guidelines (MANDATORY):
1. Restrained, modern analytical workspace: Slate/Stone/Zinc neutral palette, clean typography, purposeful status colors.
2. ZERO rainbow AI gradients, ZERO fake decorative vanity charts/graphs.
3. Tactile feedback: `active:scale-[0.97]` on all buttons and interactive controls.
4. Easing & Timing: Smooth transitions under 300ms using `ease-out`. Never use `ease-in`.
5. Two-column responsive workspace layout:
   - Left / Main column: Active Stage Task & Forms (Stage 1 Define, Stage 2 Assumptions, Stage 3 Experiment, Stage 4 Findings, Stage 5 Decision Brief).
   - Right / Secondary column: Persistent Core Hypothesis, Assumption Matrix summary, and Chronological Evidence Ledger.
   - Responsive collapse down to mobile (< 1024px stacked or tabbed view, touch targets >= 44px, `min-h-[100dvh]`).
6. Clear visibility of dirty state: If problem statement was edited post-analysis, show an explicit warning banner that previous analysis is outdated and require re-analysis.

Tasks:
Milestone 3: Analytical Workspace & 5-Stage Form Views:
1. Implement/polish the 5 Stage Form Views in `src/components/stages/`:
   - `Stage1Define.tsx`: Problem formulation (idea, targetUser, context, existingObservations, constraints), validation warnings, "Analyze Problem" action calling `/api/analyze`.
   - `Stage2Assumptions.tsx`: Clarity rating indicator (`clear | incomplete | vague`), missing details callout, assumption cards with unique IDs, risk levels (`high | medium | low`), verification status, evidence needed, next action, and "Design Experiment" button.
   - `Stage3Experiment.tsx`: Validation experiment card showing hypothesis, non-leading inquiry questions, supporting vs weakening signals, limitations, estimated effort, and "Proceed to Log Findings" button.
   - `Stage4Findings.tsx`: Evidence entry form capturing description, source type (`direct_observation | user_reported | interpretation | assumption`), related hypothesis, context, adding to findings ledger, and "Review Evidence & Verdict" button (requires >= 1 finding).
   - `Stage5Verdict.tsx`: Decision brief view rendering strictly one of the 3 allowed verdict categories (`INSUFFICIENT EVIDENCE`, `REVISE THE HYPOTHESIS`, `EVIDENCE SUPPORTS FURTHER TESTING`), updated problem statement, supported/unsupported claims, contradictory findings, remaining uncertainties, and recommended next steps. (NEVER display "PROVEN" or "GUARANTEED MARKET DEMAND").
2. Implement sidebar components in `src/components/sidebar/`:
   - `HypothesisCard.tsx`: Persistent core hypothesis.
   - `AssumptionSummary.tsx`: Matrix of assumptions grouped by status and risk.
   - `EvidenceLedger.tsx`: Chronological ledger listing all recorded findings with classification tags and timestamps.
3. Implement layout & common components:
   - `Header.tsx`: Title, stage progress bar with non-destructive step clicking, demo badge, reset button with confirmation modal.
   - `OutdatedBanner.tsx`: Prominent warning banner when `isDirty === true` with "Re-run Analysis" quick action.
   - `TactileButton.tsx`: Button component with `active:scale-[0.97]` tactile press.
4. Integrate into `src/App.tsx`:
   - Bind `useValidationStore` (or `useEvidenceStore`), handle loading states, API errors, dirty banners, and responsive mobile collapse.
5. Verify build, tests, and linter:
   - `npm run build`
   - `npm test`
   - `npm run lint`
   Verify 0 errors.

Write handoff.md in your working directory and message parent (5609cc52-02be-4823-a17e-c62c60741a50).
