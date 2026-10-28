# Project: ProblemPilot

Disciplined, AI-assisted problem-validation application for engineers, student innovators, and founders that challenges unverified assumptions, distinguishes evidence from enthusiasm, proposes practical validation experiments, evaluates user-submitted findings, and issues grounded decision briefs.

## Architecture

ProblemPilot uses a unified full-stack architecture running on Node 22:
- **Client (Frontend)**: React 19 + TypeScript (~7.0.2) + Tailwind CSS v4 + Lucide React. Built with Vite 8.
- **Server (Backend)**: Vite Connect HTTP middleware (`server/apiMiddleware.ts`) integrated into `vite.config.ts`. Intercepts `/api/analyze`, `/api/test`, `/api/review`, reading `process.env.GEMINI_API_KEY` server-side with zero client-side key exposure.
- **AI Engine**: Google Gemini API via official `@google/genai` SDK using strict JSON schema output formatting and bounded retries.
- **State & Storage**: Pure state machine function with guarded stage transitions (`DRAFT` -> `ANALYZED` -> `TEST_DEFINED` -> `FINDINGS_ENTERED` -> `EVIDENCE_REVIEWED`), dirty-state invalidation hashing, and `localStorage` persistence.
- **UI Design System**: Restrained modern analytical workspace following anti-slop guidelines: neutral Stone/Slate palette, two-column responsive grid (Left: active task/forms; Right: persistent context & chronological Evidence Ledger), tactile active press (`scale-[0.97]`), zero fake decorative graphs, zero rainbow AI gradients.

```
┌────────────────────────────────────────────────────────┐
│                   Vite Dev Server                      │
│                  (localhost:5173)                      │
│                                                        │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │   React 19 SPA Client    │  │ Server Middleware  │  │
│  │                          │  │ /api/analyze       │  │
│  │ ┌──────────────────────┐ │  │ /api/test          │  │
│  │ │ Two-Column Workspace │ │  │ /api/review        │  │
│  │ │ - Stage 1-5 Views    │ │  └─────────┬──────────┘  │
│  │ │ - Evidence Ledger    │ │            │             │
│  │ │ - Demo Mode Banner   │ │            ▼             │
│  │ └──────────────────────┘ │  ┌────────────────────┐  │
│  │                          │  │ Google GenAI SDK   │  │
│  │ ┌──────────────────────┐ │  │ (@google/genai)    │  │
│  │ │ State Machine Store  │ │  │ process.env.       │  │
│  │ │ - Guards & Dirty     │ │  │   GEMINI_API_KEY   │  │
│  │ │ - localStorage Sync  │ │  └─────────┬──────────┘  │
│  └─┴──────────┬───────────┴─┘            │             │
└───────────────┼──────────────────────────┼─────────────┘
                │                          │
                ▼                          ▼
         Browser Storage               Google Gemini
```

## Feature Inventory

Every requirement and discovered feature mapped directly to a milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | 5-Stage State Machine | Explicit transitions `DRAFT` -> `ANALYZED` -> `TEST_DEFINED` -> `FINDINGS_ENTERED` -> `EVIDENCE_REVIEWED` | M1 | ORIGINAL_REQUEST §R1 |
| F02 | Guarded Transitions | Prevent skipping stages (Stage 3 requires analysis; Stage 5 requires findings) | M1 | ORIGINAL_REQUEST §R2 |
| F03 | Non-Destructive Back Navigation | Returning to previous stages preserves all entered findings, hypotheses, and inputs | M1 | ORIGINAL_REQUEST §R2 |
| F04 | Dirty-State Invalidation | Editing problem statement flags previous analysis as outdated (`isDirty`) and requires re-analysis | M1 | ORIGINAL_REQUEST §R2 |
| F05 | LocalStorage Persistence | Automatically save and rehydrate validation state across browser refreshes | M1 | ORIGINAL_REQUEST §R4 |
| F06 | Reset / Abandon Case | Reset workflow state to clean slate with explicit confirmation dialog | M1 | ORIGINAL_REQUEST §R2 |
| F07 | Server API Middleware | Mount `/api/*` endpoints in Vite dev server on Node 22 without CORS issues | M2 | ORIGINAL_REQUEST §R3 |
| F08 | Server-Side Key Isolation | `GEMINI_API_KEY` accessed strictly via `process.env` on server; never exposed to browser | M2 | ORIGINAL_REQUEST §R3 |
| F09 | AI Problem Analysis (`/api/analyze`) | Critique problem clarity (`clear`/`incomplete`/`vague`), target-user ambiguity, structured assumptions | M2 | ORIGINAL_REQUEST §R1 |
| F10 | AI Test Design (`/api/test`) | Generate actionable small practical experiment: hypothesis, non-leading questions, signals, limitations | M2 | ORIGINAL_REQUEST §R1 |
| F11 | AI Verdict Review (`/api/review`) | Reassess findings against hypothesis; return exactly 1 of 3 allowed verdicts; strictly prohibit "PROVEN" | M2 | ORIGINAL_REQUEST §R1 |
| F12 | Gemini Structured Outputs & Retry | Strict JSON schema parsing with bounded 2-retry policy for malformed AI responses | M2 | ORIGINAL_REQUEST §R3 |
| F13 | Deterministic Demo Scenarios | Scenario A (Vague Study App) and Scenario B (Contradictory Findings) mock responses | M2 | ORIGINAL_REQUEST §R3 |
| F14 | Error Handling & Transparent Failure | Explicit error status codes (401 missing key, 502 AI failure); never silently substitute mock data on live error | M2 | ORIGINAL_REQUEST §R3 |
| F15 | Two-Column Analytical Workspace | Left column for active stage tasks/forms; Right column for hypothesis, assumption matrix, and ledger | M3 | ORIGINAL_REQUEST §R4 |
| F16 | Stage 1: Define Problem Form | Inputs for idea/problem, target user, context, existing observations, optional constraints | M3 | ORIGINAL_REQUEST §R1 |
| F17 | Stage 2: Challenge Assumptions View | Clarity rating indicator, assumption cards with ID, risk badge, evidence needed, status, next action | M3 | ORIGINAL_REQUEST §R1 |
| F18 | Stage 3: Validation Experiment View | Practical test card showing non-leading inquiry questions, supporting vs weakening signals, effort | M3 | ORIGINAL_REQUEST §R1 |
| F19 | Stage 4: Record Findings Form | Capture finding description, source type (observation, reported experience, interpretation, assumption), context | M3 | ORIGINAL_REQUEST §R1 |
| F20 | Stage 5: Decision Brief View | Render final verdict (`INSUFFICIENT EVIDENCE`, `REVISE THE HYPOTHESIS`, `EVIDENCE SUPPORTS FURTHER TESTING`), claims, uncertainties | M3 | ORIGINAL_REQUEST §R1 |
| F21 | Chronological Evidence Ledger | Real-time right-column ledger listing all recorded findings with classification tags and timestamps | M3 | ORIGINAL_REQUEST §R4 |
| F22 | Anti-Slop UI Styling | Stone/Slate neutral palette, tactile `active:scale-[0.97]` buttons, spring animations < 300ms, zero AI gradients | M3 | User Rules / R4 |
| F23 | Responsive Mobile Workspace | Collapsible / stacked two-column layout, touch targets >= 44px, `min-h-[100dvh]` on mobile | M3 | ORIGINAL_REQUEST §R4 |
| F24 | Persistent Demo Mode Banner | Persistent header banner `SAMPLE SCENARIO — NOT REAL RESEARCH` displayed across all screens in demo mode | M4 | ORIGINAL_REQUEST §R3 |
| F25 | Demo Scenario Selectors & Controls | Quick-load buttons for Scenario A and Scenario B, and demo mode indicator | M4 | ORIGINAL_REQUEST §R3 |
| F26 | Product Documentation | Comprehensive README.md with setup, env vars, architecture, demo mode, and 14 test scenario steps | M4 | ORIGINAL_REQUEST §R5 |
| F27 | 14-Scenario E2E Verification & Hardening | Full pass of all 14 PRD test scenarios (Tiers 1-4) plus Tier 5 white-box adversarial stress testing | M5 | ORIGINAL_REQUEST §R5 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Domain Schemas, State Machine & Store | `src/types/index.ts`, `src/store/stateMachine.ts`, transition guards, dirty state detection, localStorage sync | none | IN_PROGRESS |
| M2 | Server API Middleware & Gemini AI Service | `server/apiMiddleware.ts`, `server/geminiService.ts`, `server/demoData.ts`, `vite.config.ts`, error handling | M1 | PLANNED |
| M3 | Analytical Workspace & 5-Stage Form Views | `src/components/*`, two-column layout, Stage 1-5 views, Evidence Ledger, tactile buttons, mobile responsiveness | M1, M2 | PLANNED |
| M4 | Demo Mode Controls, Warnings & Documentation | Demo banner, scenario switchers, reset modal, README.md, build verification | M3 | PLANNED |
| M5 | 100% E2E Test Pass & Adversarial Hardening | Verify all 14 PRD scenarios (Tiers 1-4) and Tier 5 adversarial stress testing | M4, TEST_READY | PLANNED |

## Interface Contracts

### 1. State Machine Store (`src/store/stateMachine.ts`) ↔ UI Components (`src/components/*`)
- **State Type**: `ValidationState`
  ```typescript
  type Stage = 'DRAFT' | 'ANALYZED' | 'TEST_DEFINED' | 'FINDINGS_ENTERED' | 'EVIDENCE_REVIEWED';
  type ClarityRating = 'clear' | 'incomplete' | 'vague';
  type RiskLevel = 'high' | 'medium' | 'low';
  type AssumptionStatus = 'unverified' | 'partially_supported' | 'supported';
  type SourceType = 'direct_observation' | 'user_reported' | 'interpretation' | 'assumption';
  type VerdictCategory = 'INSUFFICIENT EVIDENCE' | 'REVISE THE HYPOTHESIS' | 'EVIDENCE SUPPORTS FURTHER TESTING';
  ```
- **Actions**:
  - `setProblemInput(input: ProblemInput): void` -> recalculates dirty hash, sets `isDirty` if changed post-analysis.
  - `transitionTo(stage: Stage): { success: boolean; error?: string }` -> enforces linear forward guards and allows backward transitions.
  - `applyAnalysis(analysis: AnalysisResult): void` -> updates assumptions, clarity, clears `isDirty`.
  - `setExperiment(experiment: ValidationExperiment): void` -> stores test design.
  - `addFinding(finding: Omit<Finding, 'id' | 'timestamp'>): void` -> generates ID, appends to findings ledger.
  - `removeFinding(id: string): void` -> removes finding from ledger.
  - `applyReview(review: DecisionBrief): void` -> updates verdict and recommendations.
  - `loadDemo(scenario: 'A' | 'B'): void` -> loads pre-built deterministic state, sets `isDemo = true`.
  - `reset(): void` -> resets state to clean `DRAFT`.

### 2. Client API Service (`src/services/api.ts`) ↔ Server Endpoints (`server/apiMiddleware.ts`)
- **`POST /api/analyze`**:
  - Request: `{ problem: ProblemInput; isDemo?: boolean; demoScenario?: 'A' | 'B' }`
  - Response: `{ success: true; data: AnalysisResult }` | `{ success: false; error: string; code: string }`
- **`POST /api/test`**:
  - Request: `{ problem: ProblemInput; assumptions: Assumption[]; isDemo?: boolean; demoScenario?: 'A' | 'B' }`
  - Response: `{ success: true; data: ValidationExperiment }` | `{ success: false; error: string; code: string }`
- **`POST /api/review`**:
  - Request: `{ problem: ProblemInput; hypothesis: string; findings: Finding[]; isDemo?: boolean; demoScenario?: 'A' | 'B' }`
  - Response: `{ success: true; data: DecisionBrief }` | `{ success: false; error: string; code: string }`
- **Error Codes**:
  - `401`: `MISSING_API_KEY` (Gemini API key not configured in environment)
  - `400`: `INVALID_INPUT` (Missing required problem/findings fields)
  - `502`: `AI_SERVICE_ERROR` (Gemini API failure or timeout after bounded retry)

### 3. Server Middleware (`server/apiMiddleware.ts`) ↔ Gemini Engine (`server/geminiService.ts`)
- `callGeminiWithSchema<T>(prompt: string, schema: Schema, options?: { maxRetries?: number }): Promise<T>`
- Automatically parses and validates against schema. If parsing fails, retries up to 2 times. If key is missing, throws `MissingApiKeyError`. Never silently returns mock data on live errors.

## Code Layout

```
KickToTech/
├── server/
│   ├── apiMiddleware.ts       # Connect/HTTP middleware for Vite dev/preview server
│   ├── geminiService.ts       # Google Gemini SDK caller with schema validation & bounded retries
│   └── demoData.ts            # Deterministic fixtures for Scenario A & Scenario B
├── src/
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces (string unions, no enum)
│   ├── store/
│   │   └── stateMachine.ts    # Pure transition functions, guards, dirty hash, localStorage
│   ├── services/
│   │   ├── api.ts             # Fetch client for /api/* endpoints
│   │   └── demoData.ts        # Client-side deterministic scenario definitions
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx     # App title, stage progress bar, demo banner, reset button
│   │   │   └── Workspace.tsx  # Two-column grid container (responsive mobile collapse)
│   │   ├── stages/
│   │   │   ├── Stage1Define.tsx      # Problem, user, context, constraints form
│   │   │   ├── Stage2Assumptions.tsx # Clarity badge, assumption cards, risk tags
│   │   │   ├── Stage3Experiment.tsx  # Test hypothesis, inquiry questions, signals
│   │   │   ├── Stage4Findings.tsx    # Evidence input form (source types, hypotheses)
│   │   │   └── Stage5Verdict.tsx     # 3 verdict categories, claims, uncertainties
│   │   ├── sidebar/
│   │   │   ├── HypothesisCard.tsx    # Persistent current core hypothesis
│   │   │   ├── AssumptionSummary.tsx # Matrix of high/medium/low unverified assumptions
│   │   │   └── EvidenceLedger.tsx    # Chronological list of recorded findings
│   │   └── common/
│   │       ├── TactileButton.tsx     # Button with scale-[0.97] active feedback
│   │       ├── Badge.tsx             # Risk and clarity badges (neutral/purposeful colors)
│   │       └── OutdatedBanner.tsx    # Warning banner when problem edited after analysis
│   ├── App.tsx                # Top-level state binding and error boundaries
│   ├── main.tsx               # React DOM root entry
│   └── index.css              # Tailwind CSS v4 directives and typography
├── tests/
│   ├── state-machine.test.ts  # Stage transition guards, dirty invalidation, local persistence
│   ├── server-api.test.ts     # Endpoint contracts, missing key handling, schema retries
│   ├── verdict-logic.test.ts  # Contradictory, unsupported, and supported verdict evaluations
│   └── prd-scenarios.test.ts  # All 14 PRD hackathon scenarios automated E2E
├── vite.config.ts             # Vite configuration mounting server/apiMiddleware.ts
├── tsconfig.json              # Solution TSConfig
├── tsconfig.app.json          # App TSConfig (erasableSyntaxOnly: true)
├── package.json               # Scripts and dependencies
└── README.md                  # Comprehensive product and testing guide
```
