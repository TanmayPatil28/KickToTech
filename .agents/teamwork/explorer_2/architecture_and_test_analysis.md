# ProblemPilot: Architecture, Testing Infrastructure & UI Composition Analysis

**Author:** explorer_2  
**Date:** 2026-10-28  
**Scope:** Architecture, Testing Harness for 14 PRD Scenarios, Module Contracts, Anti-Slop UI Layout, and Failure Mode Analysis for ProblemPilot.

---

## Executive Summary

ProblemPilot is an AI-assisted, disciplined problem validation workspace that prevents founders and engineers from falling in love with unvalidated solutions. This investigation establishes the complete technical blueprint for implementation:
1. **Testing Infrastructure:** A dual-layer testing architecture featuring Vitest + native Node 22 test runner that verifies all 14 PRD test scenarios (Tiers 1–4) deterministically via `npm test` without flaky browser binary installations.
2. **Architecture:** A unified Vite + Node server middleware architecture executing API endpoints (`/api/analyze`, `/api/test`, `/api/review`) in Node with zero client key leakage, coupled with a typed client state machine store, localStorage synchronization, and deterministic offline Demo Mode.
3. **UI Composition:** A two-column responsive analytical dashboard strictly complying with Anti-Slop UI guidelines (neutral tones, physical feedback, spring easing, zero AI rainbow gradients, zero fake charts, responsive collapse for mobile).
4. **Boundary Contracts & Failure Modes:** Rigorous TypeScript interfaces, Zod schema validation, bounded retry loops, and fail-safe defenses against hallucinated flattery, stale analyses, and malformed outputs.

---

## 1. Testing Strategy & Test Harness Design (14 PRD Scenarios across Tiers 1–4)

### 1.1 Test Runner Evaluation & Recommendation

| Runner Option | Advantages | Trade-offs | Recommendation |
|---|---|---|---|
| **Vitest** | Native Vite integration, fast ESM execution, shared TSConfig, rich assertion library (`describe`, `it`, `expect`), mocking utilities. | Requires adding `vitest` dependency (`npm i -D vitest`). | **Primary Recommendation** for Unit, Store, and Integration tests. |
| **Node.js Test Runner (`node:test`)** | Native in Node 22 (`node --test`), zero external dependencies, zero install failures, fast. | Less rich reporter UI, requires `tsx` or type stripping flags for TypeScript. | **Secondary / Fallback Harness** to guarantee testability even if npm packages fail. |
| **Playwright E2E** | Real browser rendering and user interaction testing. | Requires downloading browser binaries (300MB+), prone to network timeouts/sandbox restrictions in CI/CD. | Not recommended for core `npm test` in constrained environments. |
| **Custom Automated Test Suite (`tests/run-all-tests.ts`)** | Deterministic, runs directly under `npm test`, programmatic execution of all 14 scenarios against the API handlers and state machine. | Requires maintaining assertion helper scripts. | **Recommended Integration Layer** executing via Vitest / Node runner. |

**Recommended Setup in `package.json`:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:node": "node --import tsx --test tests/**/*.test.ts"
  }
}
```

### 1.2 The 14 PRD Test Scenarios Mapped across Tiers 1–4

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PROBLEMPILOT 14 PRD TEST SUITE MATRIX                │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 1: Core Happy Path & Problem Clarity                             │
│  ├── Scenario 1: Vague Idea Critique (Incomplete / Vague Clarity)      │
│  ├── Scenario 2: Specific Problem Decomposition (Clear Clarity & Risk) │
│  └── Scenario 3: Empty Inputs & Form Validation Guarding               │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 2: State Machine Transitions & Invalidation Guardrails            │
│  ├── Scenario 9:  Guarded State Transitions (Strict Sequence)          │
│  ├── Scenario 10: Problem Statement Modification & Outdated Flagging   │
│  └── Scenario 13: Case Reset & Abandonment Safety Modal                │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 3: Evidence Ledger Evaluation & Verdict Integrity                 │
│  ├── Scenario 6: Unsupported Findings -> INSUFFICIENT EVIDENCE         │
│  ├── Scenario 7: Contradictory Findings -> REVISE THE HYPOTHESIS       │
│  └── Scenario 8: Subjective / Empty Findings -> INSUFFICIENT EVIDENCE  │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 4: Security, Resilience, Demo Fallback & Ergonomics               │
│  ├── Scenario 4:  Malformed AI Structured Output & Bounded Retry       │
│  ├── Scenario 5:  Missing GEMINI_API_KEY Handling (No Silent Crash)    │
│  ├── Scenario 11: Mobile Viewport Responsive Ergonomics (375px)        │
│  ├── Scenario 12: Deterministic Demo Mode (Scenarios A & B Disclaimer) │
│  └── Scenario 14: Build, Typecheck, and Node 22 Runtime Verification   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Test Specification per Scenario:

1. **Scenario 1 — Vague Idea:**
   - *Input:* Broad idea, e.g. `"An AI app for students"`, target user: `"Students"`.
   - *Test Execution:* Call analyze service; verify output.
   - *Assertion:* `clarity === 'vague' || clarity === 'incomplete'`; `targetUserAmbiguity` identifies missing student sub-segment; `assumptions` array contains >= 3 entries with `riskLevel: 'high'`; recommended actions demand narrowing problem scope.
2. **Scenario 2 — Specific Problem:**
   - *Input:* High-fidelity problem: `"Mechanical engineering students at university labs spend 15 hours/week searching through legacy PDF machine manuals for torque specs because existing search tools index only text not engineering schematics."`
   - *Assertion:* `clarity === 'clear'` (or `'incomplete'` with specific nuance); assumptions parsed with unique IDs (`ASM-1`, `ASM-2`), explicit `whyItMatters`, `evidenceNeeded`, risk ratings.
3. **Scenario 3 — Empty Inputs & Form Validation:**
   - *Input:* Attempting to submit Stage 1 with empty strings, whitespace, or missing target user.
   - *Assertion:* Client validation blocks submission; state remains `DRAFT`; no network API call dispatched; inline error messages rendered.
4. **Scenario 4 — Malformed AI Output:**
   - *Input:* Server receives truncated JSON or schema-violating payload from AI mock/endpoint.
   - *Assertion:* Server schema validator catches error; triggers bounded retry (attempt 1 -> attempt 2); if unrecovered, returns HTTP 502 with structured error `{ error: 'MALFORMED_AI_OUTPUT', retryable: true }`; client displays user-friendly retry button, never crashes, and NEVER substitutes Demo Mode data secretly.
5. **Scenario 5 — Missing Credentials:**
   - *Input:* `process.env.GEMINI_API_KEY` is undefined/empty when invoking live analysis.
   - *Assertion:* Server responds with HTTP 401 `{ error: 'MISSING_API_KEY', message: 'GEMINI_API_KEY is not configured...' }`; UI displays non-blocking alert banner with one-click CTA to "Switch to Demo Mode"; app does not throw unhandled promise rejection.
6. **Scenario 6 — Unsupported Findings:**
   - *Input:* In Stage 4, user records 3 findings showing target users have no interest in the solution (e.g. `"Users find existing paper cheat-sheets faster than opening any app"`).
   - *Assertion:* Stage 5 Review returns `primaryVerdict: 'INSUFFICIENT EVIDENCE'` or `'REVISE THE HYPOTHESIS'`; `unsupportedClaims` contains the failed hypotheses; verdict text strictly lacks forbidden terms (`"PROVEN"`, `"GUARANTEED"`).
7. **Scenario 7 — Contradictory Findings:**
   - *Input:* User enters direct observations contradicting the core hypothesis (e.g. `"Lab policy strictly forbids digital devices near machinery during operation"`).
   - *Assertion:* Stage 5 Review evaluates strictly to `primaryVerdict: 'REVISE THE HYPOTHESIS'`; `contradictoryFindings` details the fatal policy conflict.
8. **Scenario 8 — Empty / Subjective Findings:**
   - *Input:* User attempts to advance to Stage 5 with 0 findings, or only records findings with `sourceType: 'assumption'` / subjective sentiment (`"My roommate thinks it's a great idea"`).
   - *Assertion:* Advancing without findings is blocked by state machine; purely subjective findings result in `primaryVerdict: 'INSUFFICIENT EVIDENCE'` with warnings that hearsay/opinions do not constitute validation evidence.
9. **Scenario 9 — State Transitions & Guarding:**
   - *Action:* Programmatically dispatch invalid stage jump, e.g. `DRAFT -> TEST_DEFINED` or `ANALYZED -> EVIDENCE_REVIEWED`.
   - *Assertion:* `canTransitionTo()` returns `false`; state remains unchanged; UI stage stepper buttons for future stages are disabled with `aria-disabled="true"`.
10. **Scenario 10 — Hypothesis / Problem Editing (Dirty Invalidation):**
    - *Action:* Complete Stage 1 & Stage 2 (`ANALYZED`), then edit problem statement in Stage 1.
    - *Assertion:* Store detects hash divergence; flags `isDirty: true`; Stage 2 displays persistent banner: `"Problem statement was modified after this analysis was generated"`; user is prompted to re-analyze or review diff.
11. **Scenario 11 — Mobile Viewport Ergonomics:**
    - *Action:* Test component layout at 375px width.
    - *Assertion:* No horizontal scroll (`window.innerWidth >= document.body.scrollWidth`); Two-column dashboard stacks into single column or tab-switched view; touch targets >= 44px; uses `min-h-[100dvh]`.
12. **Scenario 12 — Demo Mode:**
    - *Action:* Activate Demo Mode; toggle Scenario A and Scenario B.
    - *Assertion:* Deterministic data instantly loads into all 5 stages; persistent banner `SAMPLE SCENARIO — NOT REAL RESEARCH` renders in header and Stage 5 verdict card; zero network calls to Gemini API required.
13. **Scenario 13 — Case Reset / Abandonment:**
    - *Action:* Trigger reset button; cancel modal -> data intact; confirm modal -> state resets to clean `DRAFT`, `localStorage` cleared, form inputs blanked.
    - *Assertion:* Verified clean state machine transition to initial state.
14. **Scenario 14 — Build & Runtime Sanity:**
    - *Action:* Execute `tsc -b && vite build` and launch dev server.
    - *Assertion:* Exit code 0, 0 compiler diagnostics, 0 oxlint errors, bundle transforms cleanly.

---

## 2. Architectural Layout: Client & Server

```
KickToTech/
├── server/                           # Server-side API & AI services (Node.js)
│   ├── apiMiddleware.ts              # Vite connect/http middleware router
│   ├── geminiService.ts              # GoogleGenAI client, prompts, bounded retry
│   ├── schemas.ts                    # Zod schemas for request/response validation
│   └── demoData.ts                   # Deterministic Scenario A & Scenario B payloads
├── src/                              # Client-side React 19 SPA
│   ├── types/
│   │   └── validation.ts             # Strict TypeScript domain types & enums
│   ├── state/
│   │   ├── validationStateMachine.ts # Pure state transition rules & guards
│   │   ├── useValidationStore.ts     # Central reactive store & dispatchers
│   │   └── persistence.ts            # Safe LocalStorage serialization/deserialization
│   ├── services/
│   │   └── apiClient.ts              # Fetch client communicating with /api endpoints
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx            # Header, Stage Stepper, Reset, Demo Toggle
│   │   │   ├── WorkspaceLayout.tsx   # Two-column responsive anti-slop grid
│   │   │   ├── DemoBanner.tsx        # Persistent SAMPLE SCENARIO banner
│   │   │   └── DirtyBanner.tsx       # Stale analysis warning banner
│   │   ├── stages/
│   │   │   ├── Stage1DefineProblem.tsx
│   │   │   ├── Stage2ChallengeAssumptions.tsx
│   │   │   ├── Stage3ValidationTest.tsx
│   │   │   ├── Stage4RecordFindings.tsx
│   │   │   └── Stage5EvidenceReview.tsx
│   │   ├── ledger/
│   │   │   ├── EvidenceLedger.tsx    # Chronological findings timeline
│   │   │   └── AssumptionMatrix.tsx  # Dynamic assumption status & risk matrix
│   │   └── common/
│   │       ├── Button.tsx            # Tactile active:scale-[0.97] button
│   │       ├── Badge.tsx             # Restrained status tag
│   │       ├── Modal.tsx             # Accessible confirmation dialog
│   │       └── Card.tsx              # Clean neutral surface container
│   ├── App.tsx                       # Root application view
│   └── main.tsx                      # DOM entrypoint
├── tests/                            # Test Suite (14 PRD Scenarios)
│   ├── state-machine.test.ts         # Stage transitions, guards, dirty state
│   ├── api-schemas.test.ts           # Schema validation, bounded retry, error modes
│   ├── verdict-logic.test.ts         # Contradictory, unsupported, & signal weighting
│   └── prd-scenarios.test.ts         # End-to-end 14 PRD scenario assertions
├── vite.config.ts                    # Vite config registering API server middleware
└── package.json
```

### 2.1 The Vite Server Middleware Pattern (Zero-CORS, Single Command)

To satisfy Requirement R3 ("Server-side analysis endpoints utilizing Google Gemini API without client-side key leakage") and Requirement R5 ("Application starts cleanly with `npm run dev` on Node 22"):
We mount an API middleware directly in Vite's `configureServer` and `configurePreviewServer`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createApiMiddleware } from './server/apiMiddleware';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'problempilot-api-middleware',
      configureServer(server) {
        server.middlewares.use(createApiMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createApiMiddleware());
      }
    }
  ]
});
```

**Key Architectural Benefits:**
1. **Zero Client Leakage:** `process.env.GEMINI_API_KEY` is accessed solely inside `server/geminiService.ts` running in Node.js. It is never prefixed with `VITE_` and never bundled into the client browser JavaScript.
2. **Same Origin / No CORS:** Client requests go to relative paths `/api/analyze`, `/api/test`, `/api/review`. No cross-origin preflight requests or CORS configuration required.
3. **Single Process Lifecycle:** Running `npm run dev` starts both the client bundler and the backend API server instantaneously.

---

## 3. Anti-Slop UI/UX & Responsive Layout Composition

Adhering strictly to the workspace guidelines:

### 3.1 Design Principles & Palette
- **No Rainbow AI Slop:** No iridescent violet-pink gradients, no floating particle blobs, no fake marketing sparklers.
- **Color Discipline:**
  - Neutral Base: Slate/Stone neutral dark palette (`bg-stone-950`, surfaces `bg-stone-900`, borders `border-stone-800`, text `text-stone-100` and `text-stone-400`).
  - Semantic Status Only:
    - Vague / High Risk / Contradictory: Subtle rose/red (`text-rose-400`, `bg-rose-950/40`, `border-rose-800/60`).
    - Incomplete / Medium Risk / Insufficient: Warm amber (`text-amber-400`, `bg-amber-950/40`, `border-amber-800/60`).
    - Clear / Supported / Low Risk: Muted emerald (`text-emerald-400`, `bg-emerald-950/40`, `border-emerald-800/60`).
    - Unverified / Neutral: Cool slate (`text-stone-400`, `bg-stone-800/50`).
- **Typography:** Crisp sans-serif (Inter/system-ui), high legibility, strict typographic scale. Avoid decorative serif fonts.
- **Physical Tactile Feedback:**
  - Buttons feature `transition-transform duration-150 ease-out active:scale-[0.97]` for immediate physical feel.
  - Entrances animate from `opacity: 0, scale: 0.98` with `ease-out`, never `scale(0)`.
  - Durations kept <= 200ms.

### 3.2 Two-Column Responsive Workspace Grid

```
┌────────────────────────────────────────────────────────────────────────┐
│ [ProblemPilot Logo]   [1: Define] ─> [2: Challenge] ─> [3: Test] ...   │
│ [SAMPLE SCENARIO — NOT REAL RESEARCH]         [Demo: B]  [Reset Case]  │
├─────────────────────────────────────────┬──────────────────────────────┤
│ PRIMARY WORKSPACE (lg:col-span-7)       │ CONTEXT LEDGER (lg:col-span-5│
│                                         │                              │
│ Stage Active Card:                      │ Core Problem & Hypothesis:   │
│ ┌─────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ Stage 2: Challenge Assumptions      │ │ │ Target: MechE Students   │ │
│ │ Clarity: [INCOMPLETE]               │ │ │ Hypothesis: Schematics.. │ │
│ │                                     │ │ └──────────────────────────┘ │
│ │ Assumptions Matrix:                 │ │ Assumption Status:           │
│ │ • ASM-1: [HIGH] Unverified          │ │ • ASM-1: Unverified          │
│ │ • ASM-2: [MED]  Partially Supported │ │ • ASM-2: Partially Supported │
│ │                                     │ │                              │
│ │ Actions: [Design Validation Test]   │ │ Evidence Ledger (Chronology):│
│ └─────────────────────────────────────┘ │ • 10:14 - Observation (obs) │
│                                         │ • 10:22 - User Interview     │
└─────────────────────────────────────────┴──────────────────────────────┘
```

**Mobile Responsiveness (375px–768px):**
- Layout shifts from `grid-cols-12` to a stacked layout with an accessible segmented toggle at the top: `[ Workspace ] [ Ledger & Context (3) ]`.
- Users can switch between editing their stage task and viewing the live ledger without information overload.
- Container uses `min-h-[100dvh]` to prevent iOS Safari dynamic toolbar jumping.

---

## 4. Module Boundaries & Interface Contracts

### 4.1 State Machine Store <-> UI Stage Views

```typescript
// src/types/validation.ts

export type Stage = 
  | 'DRAFT' 
  | 'ANALYZED' 
  | 'TEST_DEFINED' 
  | 'FINDINGS_ENTERED' 
  | 'EVIDENCE_REVIEWED';

export type ClarityRating = 'clear' | 'incomplete' | 'vague';
export type RiskLevel = 'high' | 'medium' | 'low';
export type VerificationStatus = 'unverified' | 'partially_supported' | 'supported';
export type SourceType = 'direct_observation' | 'user_reported_experience' | 'interpretation' | 'assumption';
export type VerdictCategory = 'INSUFFICIENT EVIDENCE' | 'REVISE THE HYPOTHESIS' | 'EVIDENCE SUPPORTS FURTHER TESTING';

export interface ProblemDefinition {
  statement: string;
  targetUser: string;
  context: string;
  existingEvidence?: string;
  constraints?: string;
}

export interface Assumption {
  id: string; // "ASM-1", "ASM-2", etc.
  claim: string;
  whyItMatters: string;
  evidenceNeeded: string;
  riskLevel: RiskLevel;
  status: VerificationStatus;
  recommendedAction: string;
}

export interface ProblemAnalysis {
  clarity: ClarityRating;
  clarityFeedback: string;
  targetUserAmbiguity: string;
  assumptions: Assumption[];
  evidenceGaps: string[];
  alternativeExplanations: string[];
  existingWorkaroundQuestions: string[];
  createdAt: number;
}

export interface InquiryQuestion {
  question: string;
  rationale: string;
  isNonLeading: boolean;
}

export interface ExperimentDesign {
  coreHypothesis: string;
  inquiryQuestions: InquiryQuestion[];
  evidenceToRecord: string[];
  supportingSignals: string[];
  weakeningSignals: string[];
  limitations: string[];
  estimatedEffort: string;
}

export interface Finding {
  id: string;
  description: string;
  sourceType: SourceType;
  relatedHypothesisId?: string;
  context?: string;
  timestamp: number;
}

export interface DecisionBrief {
  updatedProblemStatement: string;
  primaryVerdict: VerdictCategory;
  verdictRationale: string;
  supportedClaims: Array<{ claim: string; findingRefId?: string; rationale: string }>;
  unsupportedClaims: Array<{ claim: string; findingRefId?: string; rationale: string }>;
  contradictoryFindings: Array<{ findingRefId: string; contradictionDetails: string }>;
  remainingUncertainties: string[];
  recommendedNextSteps: string[];
  reviewedAt: number;
}
```

#### State Machine Transition Matrix:

```
Current Stage        Allowed Next Transition            Guard Conditions
────────────────────────────────────────────────────────────────────────────────────────
DRAFT                ANALYZED                           problem.statement.trim() >= 10 chars
                                                        problem.targetUser.trim() >= 3 chars
ANALYZED             TEST_DEFINED                       analysis !== null
                                                        analysis.assumptions.length >= 1
TEST_DEFINED         FINDINGS_ENTERED                   experiment !== null
                                                        findings.length >= 1
FINDINGS_ENTERED     EVIDENCE_REVIEWED                  findings.length >= 1
                                                        verdict generated
ANY STAGE            DRAFT (Reset)                      User confirmation required
ANY STAGE            ANY PREVIOUS STAGE                 Always allowed; preserves all findings
```

### 4.2 Server API Endpoints <-> Gemini AI Service <-> Demo Mocks

#### API Endpoints Contract:
- `POST /api/analyze`:
  - Request: `{ problem: string; targetUser: string; context: string; existingEvidence?: string; constraints?: string; isDemo?: boolean; scenario?: 'A' | 'B' }`
  - Response: `{ success: true; data: ProblemAnalysis }` | `{ success: false; error: string; code: string }`
- `POST /api/test`:
  - Request: `{ problem: string; targetUser: string; assumptions: Assumption[]; isDemo?: boolean; scenario?: 'A' | 'B' }`
  - Response: `{ success: true; data: ExperimentDesign }` | `{ success: false; error: string; code: string }`
- `POST /api/review`:
  - Request: `{ problem: string; targetUser: string; hypothesis: string; assumptions: Assumption[]; findings: Finding[]; isDemo?: boolean; scenario?: 'A' | 'B' }`
  - Response: `{ success: true; data: DecisionBrief }` | `{ success: false; error: string; code: string }`

#### Gemini Prompting Strategy & Response Validation:
1. **System Instruction:**
   `"You are ProblemPilot's rigorous analytical critic. Your role is disciplined falsification and assumption testing. Do not flatter the user. Differentiate evidence from enthusiasm. You must output strictly valid JSON conforming to the requested schema. Never use the word 'PROVEN' or 'GUARANTEED' in any verdict."`
2. **Structured JSON Configuration:**
   Using `@google/genai` with `responseMimeType: "application/json"` and explicit Zod / JSON schemas.
3. **Bounded Retry Loop:**
   If `JSON.parse` fails or Zod validation fails, retry up to 2 times with temperature reduced to `0.1` and an appended corrective prompt. If all retries fail, respond with explicit HTTP 502 error.

### 4.3 Persistence Layer <-> State Machine

- Key: `problempilot_case_v1`
- Serialization Strategy:
  - On every stage transition or finding addition, serialize `{ stage, problem, analysis, experiment, findings, verdict, isDirty, isDemoMode, demoScenarioId }`.
  - On app load: Parse JSON in a `try...catch`. Validate the version key. If parse fails or structure is corrupted, safely initialize default state and clean corrupted key.
  - Reset Action: Invokes `localStorage.removeItem('problempilot_case_v1')`.

---

## 5. Potential Edge Cases & Boundary Failure Modes

| Edge Case / Failure Mode | Scenario ID | Risk Level | Architectural Mitigation |
|---|---|---|---|
| **1. Unconfigured API Key** | Scenario 5 | High | Server detects missing `GEMINI_API_KEY`, immediately returns 401 with `{ code: 'MISSING_API_KEY' }`. Client renders non-blocking alert banner offering 1-click switch to Demo Mode. App never crashes. |
| **2. Malformed AI Output / Incomplete JSON** | Scenario 4 | High | Server executes bounded retry (max 2 attempts). If still invalid, returns 502 with retryable flag. UI displays retry button without wiping form inputs. Never silently substitute mock data! |
| **3. AI Flattery / Hallucinated Product Proof** | Scenario 6, 7 | Critical | Server enforces strict schema enum for `primaryVerdict`: `['INSUFFICIENT EVIDENCE', 'REVISE THE HYPOTHESIS', 'EVIDENCE SUPPORTS FURTHER TESTING']`. Any response containing forbidden tokens (`"PROVEN"`, `"GUARANTEED"`) fails validation and is sanitized or re-prompted. |
| **4. Problem Statement Tampering (Dirty State)** | Scenario 10 | Medium | Store computes SHA-256 or fast hash of `statement + targetUser` upon analysis. If user later edits Stage 1 fields, `isDirty` turns `true`. Banner alerts user that downstream analysis is outdated and requires re-analysis. |
| **5. Submitting Zero Findings** | Scenario 8 | Medium | Stage 4 button "Proceed to Verdict Review" is disabled until `findings.length >= 1`. Server endpoint `/api/review` validates `findings.length >= 1` and rejects empty payloads. |
| **6. Vague / Trivial Solutions** | Scenario 1 | Low | Stage 1 provides a "Solution Refiner" helper. Stage 2 challenge analysis enforces `clarity: 'vague' \| 'incomplete'` for non-specific problems and pinpoints missing variables. |
| **7. Contradictory Evidence Overlooked** | Scenario 7 | High | Review endpoint algorithm explicitly prompts model to cross-examine findings against assumptions. If any finding has `sourceType === 'direct_observation'` and weakens a high-risk assumption, verdict defaults to `'REVISE THE HYPOTHESIS'`. |
| **8. Silent Fallback Confusion** | Scenario 12 | Critical | Prohibition: Demo data is ONLY loaded when user clicks Demo Mode or loads Scenario A/B. When active, header renders persistent high-contrast banner `SAMPLE SCENARIO — NOT REAL RESEARCH`. Never mask an API failure by silently loading demo data. |
| **9. Accidental Case Reset** | Scenario 13 | Medium | "Reset Case" button triggers an accessible confirmation modal. State is only purged after user explicitly confirms the reset. |
| **10. Mobile Viewport Clipping** | Scenario 11 | Low | Mobile layout tested at 375px; uses `min-h-[100dvh]`, flex stacking, responsive table wrapping, and tabbed view for Workspace vs Context Ledger. |

---

## 6. Verification & Implementation Roadmap for Workers

To verify this architecture independently, follow these steps:
1. **Dependencies to install:**
   - `vitest` (for test runner)
   - `zod` (for strict schema validation across server & client)
2. **Build Verification:**
   - Run `npm run build` (`tsc -b && vite build`) -> Expected: 0 errors.
   - Run `npm test` -> Expected: All 14 scenarios pass.
3. **Runtime Verification:**
   - Run `npm run dev` on Node 22 -> Expected: Starts cleanly on `http://localhost:5173`.
   - Test `/api/analyze` with sample payload -> Expected: Clean JSON response.
   - Test Demo Mode toggle -> Expected: Instant deterministic load with persistent disclaimer.
