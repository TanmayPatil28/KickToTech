# Original User Request

## 2026-10-28T07:15:49Z

ProblemPilot is a disciplined, AI-assisted problem-validation application for engineers, student innovators, and founders that challenges unverified assumptions, distinguishes evidence from enthusiasm, proposes practical validation experiments, evaluates user-submitted findings, and issues grounded decision briefs.

Working directory: c:\Users\Tanmay\OneDrive\Desktop\KickToTech
Integrity mode: development

## Requirements

### R1. 5-Stage Core Validation Workflow & State Machine
Implement an explicit, enforceable state machine: `DRAFT` -> `ANALYZED` -> `TEST_DEFINED` -> `FINDINGS_ENTERED` -> `EVIDENCE_REVIEWED`.
- **Stage 1 (Define Problem):** Collect idea/problem, target user, context, existing observations/evidence, and optional constraints. Help users refine broad solution ideas (e.g. "An AI app for students") without inventing missing facts.
- **Stage 2 (Challenge Assumptions):** Structured analytical critique identifying problem clarity (`clear | incomplete | vague`), target-user ambiguity, unverified assumptions with risk levels (`high | medium | low`), evidence gaps, alternative explanations, and existing workaround questions. For each assumption, provide a unique ID, claim, why it matters, evidence needed, risk level, status (`unverified | partially_supported | supported`), and recommended next action.
- **Stage 3 (Validation Experiment Design):** Actionable, small, practical test design specifying hypothesis, non-leading inquiry questions, evidence to record, supporting vs weakening signals, limitations, and estimated effort.
- **Stage 4 (Record Findings):** Structured evidence entry capturing finding description, source type (direct observation, user-reported experience, interpretation, assumption), related hypothesis, and context.
- **Stage 5 (Evidence Review & Verdict):** Reassess hypothesis against submitted findings. Produce updated problem statement, supported claims, unsupported claims, contradictory findings, remaining uncertainties, and exactly one primary verdict category:
  - `INSUFFICIENT EVIDENCE`
  - `REVISE THE HYPOTHESIS`
  - `EVIDENCE SUPPORTS FURTHER TESTING`
  (Never use "PROVEN" or "GUARANTEED MARKET DEMAND").

### R2. State Transitions & Evidence Integrity
- Enforce strict transition rules in application logic. Users cannot skip required stages simply by manipulating buttons or URLs.
- If the user modifies the original problem statement after an analysis or test is generated, visibly flag previous assessments as potentially outdated and require re-analysis where appropriate.
- Allow returning to earlier stages without losing entered findings or hypotheses. Support abandoning/resetting a case with confirmation.
- Classify evidence clearly: `UNVERIFIED`, `PARTIALLY SUPPORTED`, or `SUPPORTED BY CURRENT EVIDENCE`, with explanatory rationales.

### R3. Secure AI Architecture & Transparent Demo Fallback
- Server-side analysis endpoints (`/api/analyze`, `/api/test`, `/api/review`) utilizing the Google Gemini API with `GEMINI_API_KEY` from the environment without client-side key leakage.
- Strict schema validation for structured JSON responses with bounded retry on malformed outputs.
- Graceful error handling for missing credentials, timeouts, or network failures.
- Deterministic, clearly labeled Demo Mode with Scenario A (Vague study app) and Scenario B (Contradictory findings) marked persistently with `SAMPLE SCENARIO — NOT REAL RESEARCH`. Never silently substitute sample data for live failures.

### R4. Premium Analytical Workspace & Interaction Design
- Build a restrained, modern analytical workspace following anti-slop guidelines: neutral background, clear typography, purposeful status colors, zero rainbow AI gradients, zero decorative fake graphs.
- Two-column dashboard: Left/Main column for current stage task & forms; Right/Secondary column for current hypothesis, assumption status summary, evidence gaps, and chronological Evidence Ledger.
- Keyboard accessible, responsive down to mobile viewports, responsive tactile feedback, smooth transitions, and local storage persistence across browser refreshes.

### R5. Verification, Documentation & Submission Readiness
- README.md with product summary, setup commands, environment variable configuration, demo mode instructions, testing steps, and known limitations.
- All 14 test scenarios specified in the hackathon PRD verified (vague idea, specific problem, empty inputs, malformed AI, missing credentials, unsupported findings, contradictory findings, empty findings, state transitions, hypothesis editing, mobile layout, demo mode, reset, build/runtime check).

## Acceptance Criteria

### Workflow & Logic
- [ ] Application starts cleanly with `npm run dev` on Node 22 without unhandled exceptions.
- [ ] Entering a vague idea produces an `incomplete` or `vague` clarity rating with explicit missing details identified.
- [ ] Generating an analysis produces structured assumptions with ID, risk, and verification status.
- [ ] Stage transitions are guarded: stage 3 cannot be entered without an analyzed idea; stage 5 cannot be completed without recorded findings.
- [ ] Recording contradictory findings evaluates to `REVISE THE HYPOTHESIS`.
- [ ] Recording subjective/empty findings evaluates to `INSUFFICIENT EVIDENCE`.
- [ ] Changing the problem statement flags previous analysis as outdated.
- [ ] Demo Mode operates deterministically and displays `SAMPLE SCENARIO — NOT REAL RESEARCH` persistently.

### Verification & Performance
- [ ] Typecheck (`tsc --noEmit` or `npm run build`) passes with zero errors.
- [ ] End-to-end browser walkthrough completes the 5-stage loop and renders the decision brief.
- [ ] API keys remain server-side and are never exposed in browser network inspection.
