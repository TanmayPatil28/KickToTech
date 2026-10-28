# ProblemPilot — The Evidence Challenge
## Canonical Architecture & System Specification (Single Source of Truth)

---

### 1. System Topology & Technology Stack

- **Framework**: Vite 8 + React 19 + TypeScript (Strict mode)
- **Styling**: Tailwind CSS v4 + Lucide Icons (restrained analytical palette, zero AI-slop gradients)
- **AI Core**: Google Gemini API (`@google/genai` on server side) using `GEMINI_API_KEY` from environment
- **Backend Architecture**: Vite Development Middleware / Node Server API endpoints:
  - `POST /api/analyze` — Evaluates initial problem clarity, extracts assumptions, detects evidence gaps
  - `POST /api/test` — Generates focused, non-leading validation experiment & alternative
  - `POST /api/review` — Synthesizes submitted user findings against assumptions and issues a grounded verdict
- **Client Persistence**: LocalStorage with schema versioning, dirty-state detection, and confirmed reset
- **Demo Mode**: 100% deterministic local scenarios with persistent `SAMPLE SCENARIO — NOT REAL RESEARCH` badge

---

### 2. Canonical Data Models & Schemas

```typescript
// 1. Problem Input (Stage 1)
export interface ProblemInput {
  idea: string;               // Core proposal / idea
  targetUser: string;         // Stated beneficiary
  context: string;            // When/where the problem occurs
  existingEvidence?: string;  // Prior observations (if any)
  constraints?: string;       // Time, participant access, budget
}

// 2. Clarity & Critique (Stage 2)
export type ClarityRating = 'clear' | 'incomplete' | 'vague';
export type RiskLevel = 'high' | 'medium' | 'low';
export type EvidenceStatus = 'unverified' | 'partially_supported' | 'supported';

export interface Assumption {
  id: string;                 // e.g. "ASM-1"
  claim: string;              // Specific proposition
  reason: string;             // Why this matters to viability
  risk: RiskLevel;            // Impact if assumption is false
  status: EvidenceStatus;     // Verification level
  evidenceNeeded: string[];   // Concrete facts required
  nextAction: string;         // Immediate test action
}

export interface EvidenceGap {
  description: string;
  importance: RiskLevel;
  howToInvestigate: string;
}

export interface AnalysisResult {
  problemClarity: {
    status: ClarityRating;
    explanation: string;
    missingDetails: string[];
  };
  refinedProblemStatement: string;
  targetUserAmbiguity: string;
  assumptions: Assumption[];
  evidenceGaps: EvidenceGap[];
  alternativeExplanations: string[];
  existingWorkarounds: string[];
  highestRiskUncertainty: string;
  suggestedValidationObjective: string;
}

// 3. Validation Experiment (Stage 3)
export interface ValidationExperiment {
  id: string;
  title: string;
  objective: string;
  hypothesis: string;
  targetParticipants: string;
  method: string;             // e.g. "Past-behavior retrospective interview"
  steps: string[];
  inquiryQuestions: string[]; // Non-leading, past-behavior questions
  evidenceToRecord: string[];
  supportingSignals: string[];
  weakeningSignals: string[];
  limitations: string[];
  estimatedEffort: string;    // e.g. "2 hours, 5 interviews"
}

// 4. Recorded Finding (Stage 4)
export type FindingSourceType =
  | 'direct_observation'
  | 'user_reported_experience'
  | 'interpretation'
  | 'assumption';

export interface Finding {
  id: string;                 // e.g. "FND-1"
  description: string;
  sourceType: FindingSourceType;
  relatedAssumptionId?: string;
  contextNotes?: string;
  isCredibleObservation: boolean;
}

// 5. Decision Brief & Verdict (Stage 5)
export type VerdictCategory =
  | 'INSUFFICIENT_EVIDENCE'
  | 'REVISE_THE_HYPOTHESIS'
  | 'EVIDENCE_SUPPORTS_FURTHER_TESTING';

export interface Verdict {
  category: VerdictCategory;
  rationale: string;
  updatedProblemStatement: string;
  supportedClaims: string[];
  unsupportedClaims: string[];
  contradictoryFindings: string[];
  remainingUncertainties: string[];
  assumptionStatusUpdates: Array<{
    id: string;
    newStatus: EvidenceStatus;
    reason: string;
  }>;
  recommendedNextExperiment: string;
}
```

---

### 3. Workflow State Machine & Transition Rules

```
DRAFT
  │  (submit valid idea)
  ▼
ANALYZED
  │  (select / refine test)
  ▼
TEST_DEFINED
  │  (enter >= 1 finding)
  ▼
FINDINGS_ENTERED
  │  (run evidence synthesis)
  ▼
EVIDENCE_REVIEWED
```

#### Transition Invariants & Guard Rules:
1. **DRAFT → ANALYZED**: Requires non-empty `idea` (min 10 characters). Reject whitespace-only.
2. **ANALYZED → TEST_DEFINED**: Requires valid analysis with at least one assumption and an experiment.
3. **TEST_DEFINED → FINDINGS_ENTERED**: Requires at least one recorded finding. Cannot skip straight to verdict.
4. **FINDINGS_ENTERED → EVIDENCE_REVIEWED**: Requires non-empty findings array.
5. **Backwards Navigation**: User can return to any previous stage without destroying entered data.
6. **Hypothesis Modification (Dirty State)**:
   - If the user modifies the problem statement or target user after `ANALYZED`:
     - Visually flag existing analysis as `OUTDATED / STALE`.
     - Disable progression to `EVIDENCE_REVIEWED` until "Re-analyze with updated problem" is performed.
7. **Reset**: Requires explicit confirmation modal before clearing local case state.

---

### 4. Corrected Evidence Evaluation Rules (Lead Directive §5)

1. **No Automatic "Revise Hypothesis" on every contradiction**:
   - A single contradictory finding must be weighed by its source type (`direct_observation` vs `interpretation`), sample breadth, and relevance.
   - If findings are small or context-specific, explain that the finding narrows the scope rather than invalidating the core hypothesis.
2. **Never Output "PROVEN" or "GUARANTEED MARKET DEMAND"**:
   - Stage 5 upper bound is strictly `EVIDENCE SUPPORTS FURTHER TESTING`.
3. **Empty or Purely Subjective Assertions = `INSUFFICIENT_EVIDENCE`**:
   - Entries such as "Everyone loves this idea" or "My friend said it's great" lack concrete behavioral observations and must be classified as unsupported interpretations.
4. **Finding-to-Claim Mapping**:
   - A finding unrelated to a specific assumption cannot change that assumption's status.
   - User-entered text alone does not promote an assumption to `SUPPORTED` without evidence of observed behavior.

---

### 5. API Contracts & Boundary Validation

All endpoints run on the server side (`/api/*`), reading `process.env.GEMINI_API_KEY`.

#### `POST /api/analyze`
- **Request**: `{ problem: ProblemInput, isDemo?: boolean, demoScenario?: 'vague_study' | 'contradictory_study' }`
- **Response**: `{ success: boolean, data?: AnalysisResult, error?: string, isDemo?: boolean }`
- **Validation**: Rejects empty `idea`, validates returned JSON against `AnalysisResult` schema.

#### `POST /api/test`
- **Request**: `{ problem: ProblemInput, analysis: AnalysisResult, isDemo?: boolean }`
- **Response**: `{ success: boolean, data?: { primary: ValidationExperiment, alternative?: ValidationExperiment }, error?: string }`

#### `POST /api/review`
- **Request**: `{ problem: ProblemInput, analysis: AnalysisResult, experiment: ValidationExperiment, findings: Finding[], isDemo?: boolean }`
- **Response**: `{ success: boolean, data?: Verdict, error?: string, isDemo?: boolean }`
- **Validation**: Requires `findings.length > 0`. Validates that verdict category is strictly one of the 3 allowed categories.

---

### 6. Deterministic Demo Scenarios

1. **Scenario A — Vague Student Study App**:
   - Input: `"An AI app that helps college students study better."`
   - Analysis: Flags clarity as `vague`/`incomplete`, identifies undefined study bottleneck, missing evidence of existing tool failures.
   - Test: Retrospective past-week study struggle interview (5 students, specific past assignments).
2. **Scenario B — Contradictory Findings**:
   - Pre-loaded findings showing students struggle with planning, but already use Google Calendar and Notion successfully and express zero willingness to adopt another app.
   - Verdict: Evaluates to `REVISE_THE_HYPOTHESIS` with clear explanation that the problem of "planning" exists, but existing workarounds are deemed satisfactory by users.
3. **Demo Banner**: Persistent badge `SAMPLE SCENARIO — NOT REAL RESEARCH` visible on all screens during demo sessions.

---

### 7. Task Ownership & Gate Sequence

- **Gate 1 (Architecture & Contracts)**: *Complete* (This document & baseline build check).
- **Gate 2 (Core Domain Logic & Store)**: Typed data models, state machine transitions, dirty-state tracking, LocalStorage persistence, evidence scoring engine.
- **Gate 3 (Minimum Complete Workflow)**: Full 5-stage UI loop with mock/deterministic data, form validation, step progression.
- **Gate 4 (AI Integration & Server Endpoints)**: Vite middleware server integration with `@google/genai`, schema validation, bounded retries, robust error handling, demo fallback.
- **Gate 5 (Product Experience & Anti-Slop UI)**: Restrained analytical layout, two-column workspace, Evidence Ledger, timeline progress, mobile responsiveness, keyboard accessibility.
- **Gate 6 (Independent Verification & 14 Test Suite)**: Automated vitest/playwright suite covering all 14 PRD tests, zero console errors, production build verification, README.md.
