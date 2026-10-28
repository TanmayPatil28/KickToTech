# ProblemPilot — Comprehensive Specification Inventory & Requirements Catalog

**Document Version:** 1.0.0  
**Author:** spec_miner_1 (Teamwork Specification Mining Agent)  
**Date:** 2026-10-28  
**Authoritative Sources:** `ORIGINAL_REQUEST.md`, `ARCHITECTURE.md`, `PROJECT.md`

---

## 1. Executive Summary & System Mission

**ProblemPilot** is a disciplined, AI-assisted problem-validation application engineered for engineers, student innovators, and founders. Its foundational philosophy rejects startup theater, vanity validation, and superficial enthusiasm. Instead, it enforces rigorous scientific scrutiny:
- It systematically breaks down unverified assumptions.
- It differentiates hard empirical observations from hearsay, opinions, and enthusiasm.
- It designs low-effort, non-leading, past-behavior validation experiments (in the spirit of *The Mom Test*).
- It scores user-collected findings against explicit hypotheses.
- It delivers grounded, restrained decision briefs bounded by honest epistemic limits (strictly prohibiting terms like "PROVEN" or "GUARANTEED MARKET DEMAND").

---

## 2. 5-Stage Core Validation Workflow & State Machine

The core domain workflow is governed by a deterministic, strictly guarded finite state machine (FSM).

### 2.1 State Definitions

| State Name | Stage Index | Stage Purpose | Primary User Actions | Transition Prerequisites |
|---|---|---|---|---|
| `DRAFT` | 1 | Define Problem & Context | Enter idea, target user, context, existing observations, constraints. | Initial state on launch or reset. |
| `ANALYZED` | 2 | Challenge Assumptions | Review clarity score, risk-ranked assumptions, evidence gaps, alternative explanations. | `idea` length >= 10 chars, non-whitespace. Successful call to `/api/analyze`. |
| `TEST_DEFINED` | 3 | Design Validation Experiment | Review generated experiment, inquiry questions, signals, limitations; customize parameters. | Must have active `AnalysisResult` with >= 1 assumption. Successful call to `/api/test`. |
| `FINDINGS_ENTERED` | 4 | Record Findings Ledger | Add empirical observations, categorize source types, link to assumptions. | Must have recorded >= 1 valid finding in the Evidence Ledger. |
| `EVIDENCE_REVIEWED` | 5 | Evidence Review & Decision Brief | Review synthesized verdict, supported vs unsupported claims, remaining risks, next steps. | Requires >= 1 recorded finding. State must not be dirty. Successful call to `/api/review`. |

---

### 2.2 State Transition Matrix & Guard Rules

```
 ┌─────────┐      submit valid idea       ┌──────────┐
 │  DRAFT  │ ───────────────────────────> │ ANALYZED │
 └─────────┘                              └──────────┘
      ▲                                         │
      │                                         │ select / design test
      │ (backwards nav allowed at any time)     ▼
      │                                   ┌──────────────┐
      │                                   │ TEST_DEFINED │
      │                                   └──────────────┘
      │                                         │
      │                                         │ enter >= 1 finding
      │                                         ▼
      │                                   ┌──────────────────┐
      │                                   │ FINDINGS_ENTERED │
      │                                   └──────────────────┘
      │                                         │
      │                                         │ run review synthesis
      │                                         ▼
      │                                   ┌───────────────────┐
      │ ───────────────────────────────── │ EVIDENCE_REVIEWED │
      └────────────────────────────────── └───────────────────┘
```

#### Exact Guarding Rules:
1. **DRAFT → ANALYZED**:
   - **Guard**: `problemInput.idea.trim().length >= 10` and `problemInput.targetUser.trim().length > 0`.
   - **Rejection**: Whitespace-only, empty, or strings < 10 characters produce inline client validation errors and prevent API execution.
2. **ANALYZED → TEST_DEFINED**:
   - **Guard**: Must possess a valid, non-null `analysisResult` containing at least one assumption in `assumptions[]`.
   - **Rejection**: Directly clicking Stage 3 or entering Stage 3 URL is blocked; user remains in `ANALYZED` with a prompt to generate or complete analysis.
3. **TEST_DEFINED → FINDINGS_ENTERED**:
   - **Guard**: At least one finding must be entered into `findings[]` (`findings.length >= 1`).
   - **Rejection**: Proceeding without any findings is disallowed. Button to proceed is disabled with tooltip: *"Record at least one observation or interview finding to proceed."*
4. **FINDINGS_ENTERED → EVIDENCE_REVIEWED**:
   - **Guard**: `findings.length >= 1` AND `isDirty === false`.
   - **Rejection**: Blocked if findings array is empty or if the original problem statement has been altered without re-running analysis.
5. **Backwards Navigation Rule**:
   - Users may freely navigate back to any previously unlocked stage (e.g. from Stage 4 back to Stage 1 or Stage 2) via the stage progress indicator or step buttons.
   - **Data Preservation Invariant**: Navigating backwards **never** deletes or clears entered findings, generated experiments, or notes. All previously populated form state is preserved.
6. **Case Abandonment & Reset Rule**:
   - A global "Reset Case" action is accessible at all stages.
   - **Guard**: Must trigger a modal confirmation dialog: *"Reset this case? All entered problem details, experiment designs, and findings will be cleared. This action cannot be undone."*
   - Upon confirmed reset, local storage is cleared and state returns to `DRAFT`.

---

## 3. Problem Statement Modification & Dirty State Invalidation Rules

When a user modifies the foundation of the case after an analysis or experiment has already been generated, the system must protect evidence integrity.

### 3.1 Dirty State Detection
- The system stores a baseline snapshot of `ProblemInput` at the moment `/api/analyze` succeeds: `lastAnalyzedProblemInput`.
- Whenever the user edits any field of `ProblemInput` in Stage 1:
  - If `problemInput.idea !== lastAnalyzedProblemInput.idea` OR `problemInput.targetUser !== lastAnalyzedProblemInput.targetUser` OR `problemInput.context !== lastAnalyzedProblemInput.context`:
    - `isDirty` state is set to `true`.

### 3.2 System Response to Dirty State
1. **Visual Outdated Indicator**:
   - A persistent, prominent warning banner appears across Stages 2, 3, 4, and 5:
     `⚠️ OUTDATED ASSESSMENTS: The original problem statement was modified after this analysis was generated. Existing assumptions and experiments may no longer reflect your current focus.`
   - Status badges on assumptions and experiment cards display an `OUTDATED / STALE` pill tag.
2. **Progression Gating**:
   - The user is **strictly prevented** from advancing to Stage 5 (`EVIDENCE_REVIEWED`) while `isDirty === true`.
   - The review trigger button is disabled, displaying: *"Re-analysis Required Before Evidence Review"*.
3. **Re-Analysis Reconciliation**:
   - A one-click button *"Update Analysis with New Problem"* triggers `/api/analyze` with the modified input.
   - When the re-analysis completes:
     - `lastAnalyzedProblemInput` is updated.
     - `isDirty` reverts to `false`.
     - Existing user findings in the Evidence Ledger are **retained**; findings previously tagged with obsolete assumption IDs are flagged for re-association rather than deleted.

---

## 4. Canonical Data Schemas & TypeScript Definitions

The application strictly implements the following TypeScript schemas:

```typescript
// ==========================================
// 1. Stage 1: Problem Definition
// ==========================================
export interface ProblemInput {
  idea: string;               // Core proposal / problem description (min 10 chars)
  targetUser: string;         // Stated beneficiary or stakeholder group
  context: string;            // Physical/operational setting when problem occurs
  existingEvidence?: string;  // Prior observations, historical data, or pilot feedback
  constraints?: string;       // Budget, time, regulatory, or technical boundaries
}

// ==========================================
// 2. Stage 2: Clarity & Assumptions Critique
// ==========================================
export type ClarityRating = 'clear' | 'incomplete' | 'vague';
export type RiskLevel = 'high' | 'medium' | 'low';
export type EvidenceStatus = 'unverified' | 'partially_supported' | 'supported';

export interface Assumption {
  id: string;                 // Deterministic ID, e.g. "ASM-1", "ASM-2"
  claim: string;              // Specific proposition assumed to be true
  reason: string;             // Why this matters to viability / lethal risk if false
  risk: RiskLevel;            // Impact on project if assumption is false
  status: EvidenceStatus;     // Current verification status
  evidenceNeeded: string[];   // Concrete empirical facts required to substantiate
  nextAction: string;         // Immediate tactical action to test
}

export interface EvidenceGap {
  description: string;        // Critical missing knowledge piece
  importance: RiskLevel;      // Level of risk posed by this information gap
  howToInvestigate: string;   // Recommended method to close this gap
}

export interface AnalysisResult {
  problemClarity: {
    status: ClarityRating;    // 'clear' | 'incomplete' | 'vague'
    explanation: string;      // Analytical breakdown of clarity
    missingDetails: string[]; // Specific missing data points (if incomplete/vague)
  };
  refinedProblemStatement: string; // Tighter, grounded problem framing
  targetUserAmbiguity: string;     // Critique of user persona specificity
  assumptions: Assumption[];       // Comprehensive extracted assumptions
  evidenceGaps: EvidenceGap[];     // Key unknowns needing investigation
  alternativeExplanations: string[]; // Rival hypotheses for the observed problem
  existingWorkarounds: string[];   // Current habits, tools, or hacks used today
  highestRiskUncertainty: string;  // Single most dangerous unverified leap
  suggestedValidationObjective: string; // What Stage 3 experiment must focus on
}

// ==========================================
// 3. Stage 3: Validation Experiment Design
// ==========================================
export interface ValidationExperiment {
  id: string;                 // e.g. "EXP-1"
  title: string;              // Concise experiment title
  objective: string;          // What uncertainty this test isolates
  hypothesis: string;         // Falsifiable hypothesis statement
  targetParticipants: string; // Exact profile and sample size (e.g. "5 freelance designers")
  method: string;             // e.g. "Past-behavior retrospective interview"
  steps: string[];            // Sequential execution protocol
  inquiryQuestions: string[]; // Strict non-leading, past-behavior questions
  evidenceToRecord: string[]; // Observable data points, quotes, or timestamps to log
  supportingSignals: string[];// Objective indicators validating the hypothesis
  weakeningSignals: string[]; // Objective indicators invalidating the hypothesis
  limitations: string[];      // Epistemic blindspots (what this test cannot prove)
  estimatedEffort: string;    // Resource estimation (e.g. "2 hours, 5 interviews, $0")
}

// ==========================================
// 4. Stage 4: Recorded Findings Ledger
// ==========================================
export type FindingSourceType =
  | 'direct_observation'           // Witnessed user behavior, logs, screenshare
  | 'user_reported_experience'    // Interview quote describing specific past action
  | 'interpretation'              // Subjective inference or founder impression
  | 'assumption';                 // Unverified claim repeated by user

export interface Finding {
  id: string;                      // e.g. "FND-1"
  description: string;             // Raw factual record of what happened or was said
  sourceType: FindingSourceType;   // Evidentiary weight classification
  relatedAssumptionId?: string;    // Foreign key to Assumption.id
  contextNotes?: string;           // Environment, participant details, date
  isCredibleObservation: boolean;  // True if concrete past behavior; false if opinion
  timestamp: string;               // ISO 8601 recording timestamp
}

// ==========================================
// 5. Stage 5: Decision Brief & Verdict
// ==========================================
export type VerdictCategory =
  | 'INSUFFICIENT_EVIDENCE'
  | 'REVISE_THE_HYPOTHESIS'
  | 'EVIDENCE_SUPPORTS_FURTHER_TESTING';

export interface AssumptionStatusUpdate {
  id: string;
  newStatus: EvidenceStatus;
  reason: string;
}

export interface Verdict {
  category: VerdictCategory;       // One of the 3 strictly allowed categories
  rationale: string;               // Exhaustive evidentiary synthesis
  updatedProblemStatement: string; // Refined problem definition incorporating findings
  supportedClaims: string[];       // Claims validated by credible observations
  unsupportedClaims: string[];     // Claims lacking sufficient empirical backing
  contradictoryFindings: string[]; // Observations that refuted assumptions
  remainingUncertainties: string[];// Key unknowns lingering after this test cycle
  assumptionStatusUpdates: AssumptionStatusUpdate[]; // Updated statuses for each assumption
  recommendedNextExperiment: string; // Next logical validation step
}

// ==========================================
// 6. Application State & Storage Persistence
// ==========================================
export type WorkflowStage =
  | 'DRAFT'
  | 'ANALYZED'
  | 'TEST_DEFINED'
  | 'FINDINGS_ENTERED'
  | 'EVIDENCE_REVIEWED';

export interface CaseState {
  version: number;                 // Schema versioning for migrations (e.g. 1)
  currentStage: WorkflowStage;
  highestCompletedStage: WorkflowStage;
  isDirty: boolean;
  isDemo: boolean;
  demoScenarioId?: 'vague_study' | 'contradictory_study';
  problemInput: ProblemInput;
  lastAnalyzedProblemInput?: ProblemInput;
  analysisResult?: AnalysisResult;
  experiment?: ValidationExperiment;
  alternativeExperiment?: ValidationExperiment;
  findings: Finding[];
  verdict?: Verdict;
  updatedAt: string;
}
```

---

## 5. Server API Architecture & Gemini Integration Contracts

All AI inference is executed strictly server-side behind `/api/*` endpoints running within Vite/Node middleware or backend server.

### 5.1 Credential Protection & Security Constraints
- `GEMINI_API_KEY` is loaded exclusively from server environment variables (`process.env.GEMINI_API_KEY`).
- **Zero Client Leakage**: The client code bundle and runtime network inspector never receive, transmit, or inspect the API key.
- Server returns HTTP 500/401 with structured JSON `{ success: false, error: "GEMINI_API_KEY not configured on server" }` if missing.

---

### 5.2 API Endpoint Specifications

#### 1. `POST /api/analyze`
- **Purpose**: Evaluates problem clarity, identifies ambiguity, extracts assumptions with risk ratings, flags evidence gaps.
- **Request Body**:
  ```json
  {
    "problem": {
      "idea": "An app for college students to study together",
      "targetUser": "College students",
      "context": "Exam prep week",
      "existingEvidence": "Talked to 2 roommates",
      "constraints": "No budget"
    },
    "isDemo": false,
    "demoScenario": null
  }
  ```
- **Validation**:
  - Rejects if `problem.idea` is empty or < 10 characters (HTTP 400).
- **Successful Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "problemClarity": {
        "status": "vague",
        "explanation": "The proposed study mechanism is undefined and target audience is too broad.",
        "missingDetails": ["Specific academic subject or study mode", "Frequency of problem", "Current alternatives tried"]
      },
      "refinedProblemStatement": "Undergraduate students in stem courses lack structured peer accountability for weekly problem sets.",
      "targetUserAmbiguity": "College students span diverse majors, schedules, and study preferences.",
      "assumptions": [
        {
          "id": "ASM-1",
          "claim": "Students struggle to find study partners on their own.",
          "reason": "If students already have group chats, tool adoption will be zero.",
          "risk": "high",
          "status": "unverified",
          "evidenceNeeded": ["Observed failed attempts to form study groups"],
          "nextAction": "Ask 5 students how they formed their last study session"
        }
      ],
      "evidenceGaps": [
        {
          "description": "No data on whether existing campus platforms or WhatsApp already solve this.",
          "importance": "high",
          "howToInvestigate": "Inventory active student Discord/WhatsApp channels"
        }
      ],
      "alternativeExplanations": ["Students prefer studying alone due to pacing differences"],
      "existingWorkarounds": ["WhatsApp group chats", "Discord study servers", "Library drop-in"],
      "highestRiskUncertainty": "Students may not want more peer study interaction",
      "suggestedValidationObjective": "Determine past-week study coordination failures"
    },
    "isDemo": false
  }
  ```

#### 2. `POST /api/test`
- **Purpose**: Generates a tightly scoped, non-leading validation experiment based on analyzed assumptions.
- **Request Body**:
  ```json
  {
    "problem": { /* ProblemInput */ },
    "analysis": { /* AnalysisResult */ },
    "isDemo": false
  }
  ```
- **Validation**:
  - Requires valid `analysis` object with `assumptions.length > 0` (HTTP 400).
- **Successful Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "primary": {
        "id": "EXP-1",
        "title": "Past-Week Study Struggle Retrospective",
        "objective": "Verify if students actively sought peer study help in the past 7 days",
        "hypothesis": "At least 3 of 5 students experienced an unfulfilled desire for peer study help this week",
        "targetParticipants": "5 STEM undergraduates preparing for midterms",
        "method": "15-minute 1-on-1 retrospective past-behavior interview",
        "steps": [
          "Recruit 5 students at the science library",
          "Ask them to recount their exact study sessions over the past 7 days",
          "Record specific moments of confusion and actions taken"
        ],
        "inquiryQuestions": [
          "Walk me through the last time you got stuck on a problem set. What did you do?",
          "Did you reach out to anyone? If not, why?",
          "How did you end up finishing that assignment?"
        ],
        "evidenceToRecord": [
          "Action taken when stuck (e.g. Googled, texted peer, gave up)",
          "Time spent waiting for peer help",
          "Existing tools utilized during the session"
        ],
        "supportingSignals": [
          "Student spent >30 mins trying to contact a peer without success",
          "Student expressed frustration with existing group chat noise"
        ],
        "weakeningSignals": [
          "Student prefers solitary study and never seeks peer help",
          "Student solved problem immediately via existing TA hours or Discord"
        ],
        "limitations": [
          "Self-selection bias towards students currently at the library",
          "Cannot measure willingness to pay"
        ],
        "estimatedEffort": "90 minutes total (5 x 15-minute interviews, $0 budget)"
      }
    },
    "isDemo": false
  }
  ```

#### 3. `POST /api/review`
- **Purpose**: Synthesizes recorded findings against assumptions and issues an epistemically grounded verdict.
- **Request Body**:
  ```json
  {
    "problem": { /* ProblemInput */ },
    "analysis": { /* AnalysisResult */ },
    "experiment": { /* ValidationExperiment */ },
    "findings": [ /* Finding[] */ ],
    "isDemo": false
  }
  ```
- **Validation**:
  - Requires `findings` array with `findings.length >= 1` (HTTP 400).
- **Successful Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "category": "REVISE_THE_HYPOTHESIS",
      "rationale": "Direct behavioral observations revealed that 4 of 5 participants already rely on existing course Discord channels and actively avoided additional specialized communication apps.",
      "updatedProblemStatement": "Students struggle with TA response latency, not finding study partners.",
      "supportedClaims": [
        "Students experience acute frustration when stuck on STEM problem sets"
      ],
      "unsupportedClaims": [
        "Students desire a dedicated study matching app"
      ],
      "contradictoryFindings": [
        "4 of 5 students reported that existing Discord servers provide more than enough peer chat, but lack official answers."
      ],
      "remainingUncertainties": [
        "Whether TA office hours queue management represents the true operational bottleneck"
      ],
      "assumptionStatusUpdates": [
        {
          "id": "ASM-1",
          "newStatus": "unverified",
          "reason": "Refuted by direct user testimony regarding satisfaction with Discord"
        }
      ],
      "recommendedNextExperiment": "Interview 5 TAs regarding office hour queue abandonment"
    },
    "isDemo": false
  }
  ```

---

### 5.3 Error Handling & Anti-Silent-Fallback Rules

1. **Strict Prohibition Against Silent Mock Fallback**:
   - **RULE**: If a live API call fails (due to missing API key, network error, timeout, or Gemini rate limits), the server **MUST NEVER** silently substitute mock or demo data.
   - **Justification**: Silently masking live errors with simulated responses deceives users and violates engineering integrity.
   - **Enforcement**: Errors must return explicit HTTP error codes (400, 401, 500, 502, 504) with clear user-facing messages.
2. **Bounded Retry Strategy**:
   - Server implements a bounded retry loop (maximum 2 retries with exponential backoff: 500ms, 1500ms) for transient network timeouts or malformed JSON payloads from the LLM.
   - If retries fail, return a structured error response:
     `{ "success": false, "error": "AI service returned an unparseable response after 2 retries. Please refine your problem input and try again." }`
3. **Structured Output Enforcement**:
   - Uses Gemini structured JSON output mode (`responseSchema` / `responseMimeType: "application/json"`) with rigorous JSON parsing and schema validation.

---

## 6. Deterministic Demo Mode Specification

Demo Mode allows complete evaluation of ProblemPilot without requiring external API credentials or incurring network latency.

### 6.1 Persistent Visual Requirement
- Whenever Demo Mode is active, a persistent, high-contrast banner must appear across every screen:
  `[SAMPLE SCENARIO — NOT REAL RESEARCH]`
- The banner remains anchored at the top of the workspace and must not be dismissible while in demo mode.

### 6.2 Pre-Configured Demo Scenarios

#### Scenario A: Vague Student Study App
- **Trigger**: User clicks *"Load Demo A (Vague Study App)"*.
- **Pre-loaded Problem Input**:
  - `idea`: "An AI app that helps college students study better."
  - `targetUser`: "College students"
  - `context`: "College campuses during final exams"
  - `existingEvidence`: "My roommate said studying for finals is stressful."
  - `constraints`: "Zero development budget"
- **Deterministic Behavior**:
  - `/api/analyze` returns `clarity: "vague"`, flags missing study mechanics, highlights unverified assumption that "Students will adopt a new app during high-stress exam periods".
  - Stage 3 generates retrospective interview protocol.
  - Demonstrates how ProblemPilot refines broad, fuzzy founder ideas without inventing non-existent facts.

#### Scenario B: Contradictory Findings
- **Trigger**: User clicks *"Load Demo B (Contradictory Findings)"*.
- **Pre-loaded Problem Input & Experiment**:
  - `idea`: "An automated WhatsApp reminder service for freelance contractors to track unpaid invoices."
  - `targetUser`: "Freelance graphic designers and web developers"
  - `context`: "Chasing overdue client payments at month-end"
  - `hypothesis`: "Freelancers actively lose revenue due to forgetting to send follow-up payment reminders"
- **Pre-loaded Findings Ledger**:
  1. `FND-1` (`direct_observation`): "Reviewed 4 freelance accounts; all 4 use automated recurring reminders in FreshBooks or Wave."
  2. `FND-2` (`user_reported_experience`): "Participant A stated: 'I never message clients on WhatsApp about money; it feels unprofessional and invasive.'"
  3. `FND-3` (`direct_observation`): "Participant B demonstrated their current spreadsheet; non-payment is caused by client cash-flow refusal, not forgotten reminders."
- **Deterministic Verdict**:
  - Evaluates strictly to **`REVISE THE HYPOTHESIS`**.
  - Clearly identifies that the initial assumption ("freelancers forget to follow up") is refuted by observed behavior, and the proposed channel ("WhatsApp") meets severe user resistance.

---

## 7. Corrected Evidence Evaluation & Rigor Directives

ProblemPilot enforces rigorous epistemological rules to prevent false validation and startup self-deception:

1. **Primary Verdict Category Exclusivity**:
   Every decision brief must terminate in exactly **one** of three allowed verdicts:
   - `INSUFFICIENT EVIDENCE`
   - `REVISE THE HYPOTHESIS`
   - `EVIDENCE SUPPORTS FURTHER TESTING`
2. **Strict Prohibition Against Overconfident Language**:
   - The application and AI prompts **strictly forbid** outputting words like `"PROVEN"`, `"VALIDATED"`, `"GUARANTEED MARKET DEMAND"`, or `"PRODUCT-MARKET FIT ACHIEVED"`.
   - The maximum possible endorsement is `EVIDENCE SUPPORTS FURTHER TESTING`.
3. **Evidentiary Hierarchy**:
   - Findings are weighted by `sourceType`:
     1. `direct_observation` (Highest weight): Physically witnessed actions, screenshares, receipts, analytics.
     2. `user_reported_experience` (High weight): Specific factual stories of past personal actions ("Last Tuesday I paid $50 for...").
     3. `interpretation` (Low weight): Founder opinions, inferences, or speculative beliefs.
     4. `assumption` (Zero weight): Unverified second-hand claims or user predictions of future behavior ("I would totally buy this").
4. **Subjective or Empty Assertions Lead to `INSUFFICIENT EVIDENCE`**:
   - Findings like "My friends thought this was awesome" or "Everyone I talked to loved the concept" provide zero behavioral evidence. The system flags them as hearsay/opinions and defaults to `INSUFFICIENT EVIDENCE`.
5. **Weighted Contradiction Analysis**:
   - A single contradictory finding does not blindly trigger `REVISE THE HYPOTHESIS` if the finding is an isolated subjective interpretation.
   - However, when direct behavioral observations contradict core lethal assumptions, the system firmly issues `REVISE THE HYPOTHESIS`.

---

## 8. UI/UX Anti-Slop Analytical Workspace Specification

The user interface adheres to the anti-slop guidelines:

### 8.1 Visual Aesthetics & Layout
- **Two-Column Asymmetric Dashboard**:
  - **Left/Main Column (60-65% width on desktop)**: Active stage workspace, structured input forms, interactive cards, execution steps.
  - **Right/Secondary Column (35-40% width on desktop)**: Persistent analytical overview, active hypothesis summary, real-time assumption status tracker, evidence gaps, and chronological Evidence Ledger.
- **Palette**:
  - Neutral, calm foundations: Slate (`#0f172a`, `#1e293b`, `#f8fafc`, `#f1f5f9`).
  - Restrained semantic status accents:
    - Amber/Orange: `unverified` / Warning / Outdated state
    - Sky/Blue: `partially_supported` / Informational
    - Emerald/Green: `supported` / Strong signal
    - Rose/Crimson: `high risk` / Contradictory finding
    - Violet/Muted: `vague` clarity
  - **Strictly Banned**: Rainbow AI gradients, glowing neon card borders, decorative fake analytics graphs, generic stock illustrations.
- **Typography**: Clean, high-legibility sans-serif (`Inter`, `system-ui`). No unprompted decorative serif headers.

### 8.2 Responsive & Interaction Mechanics
- **Mobile Adaptability**: Two-column layout collapses to a vertical stacked layout on screens `< 768px`. Evidence Ledger collapses into an accessible slide-over drawer or toggleable bottom sheet. Minimum touch target of 44x44px.
- **Micro-Interactions**:
  - Active button states feature `scale(0.97)` tactile feedback.
  - Transitions use `ease-out` (never sluggish `ease-in`) with durations capped at 200–250ms.
  - Form validation errors render inline with clear correction instructions.

---

## 9. The 14 Hackathon PRD Test Scenarios & Acceptance Criteria

Every implementation must be verified against the following 14 test scenarios:

### Scenario 1 (S1): Vague Idea Evaluation
- **Preconditions**: Application at Stage 1 (`DRAFT`).
- **Input**: `idea: "An AI app for students"`, `targetUser: "Students"`, `context: "School"`.
- **Action**: Submit `/api/analyze`.
- **Expected Outcome**:
  - Stage advances to `ANALYZED`.
  - Clarity rating is classified as `vague` or `incomplete`.
  - Explanatory breakdown identifies missing details (target user specificity, problem mechanism).
  - High-risk unverified assumptions are generated highlighting these omissions.

### Scenario 2 (S2): Specific Problem Evaluation
- **Preconditions**: Application at Stage 1 (`DRAFT`).
- **Input**: Well-bounded problem (e.g. "Mechanical engineering students at large universities wait >45 minutes during weekly lab sessions to get TA sign-offs on CAD tolerance checks, delaying assignment submission").
- **Action**: Submit `/api/analyze`.
- **Expected Outcome**:
  - Clarity rating is classified as `clear`.
  - Assumptions focus on verifiable operational metrics (e.g., actual queue times, TA availability bottlenecks).

### Scenario 3 (S3): Empty / Whitespace Inputs
- **Preconditions**: Application at Stage 1 (`DRAFT`).
- **Input**: Empty strings or `"   "` in required fields (`idea`, `targetUser`).
- **Action**: Click "Analyze Problem".
- **Expected Outcome**:
  - Form submission is blocked on client.
  - Red inline validation errors appear ("Problem idea must be at least 10 characters").
  - No network request is dispatched.

### Scenario 4 (S4): Malformed AI / Schema Validation Failure
- **Preconditions**: Server receives malformed/truncated JSON from upstream Gemini API.
- **Action**: Server validates JSON response against schema.
- **Expected Outcome**:
  - Server automatically initiates bounded retry (up to 2 times).
  - If retry fails, server returns HTTP 500/502 with structured error message.
  - Client catches error and displays non-crashing banner: *"Unable to parse analysis. Please check your inputs and try again."*
  - Application does NOT crash or break state.

### Scenario 5 (S5): Missing Credentials
- **Preconditions**: Server runtime environment has no `GEMINI_API_KEY`.
- **Action**: User submits live problem analysis.
- **Expected Outcome**:
  - Server responds with HTTP 500: `{ "success": false, "error": "GEMINI_API_KEY is not configured on the server." }`.
  - Client displays a clear, actionable error banner advising user to supply API key or use Demo Mode.
  - **CRITICAL**: System does NOT silently spoof or substitute sample data.

### Scenario 6 (S6): Unsupported Findings Evaluation
- **Preconditions**: Application at Stage 4 (`FINDINGS_ENTERED`).
- **Input**: Findings entered consist purely of subjective statements: "My friend said it's cool", "People seemed excited about the idea".
- **Action**: Submit `/api/review`.
- **Expected Outcome**:
  - Synthesis classifies findings as `interpretation` or `assumption` lacking empirical weight.
  - Primary verdict is strictly `INSUFFICIENT EVIDENCE`.
  - Recommendation directs user to collect direct behavioral observations.

### Scenario 7 (S7): Contradictory Findings Evaluation
- **Preconditions**: Application at Stage 4 with hypothesis that users need automated reminder software.
- **Input**: Enter direct observations: "5 of 5 interviewed users already use automated calendar reminders and explicitly refused to install another tool."
- **Action**: Submit `/api/review`.
- **Expected Outcome**:
  - Primary verdict is strictly `REVISE THE HYPOTHESIS`.
  - Contradictory findings are explicitly cited in the decision brief.

### Scenario 8 (S8): Empty Findings Guard
- **Preconditions**: Application at Stage 4 with 0 findings in ledger.
- **Action**: User attempts to trigger Stage 5 Review or navigate to Stage 5.
- **Expected Outcome**:
  - Action is blocked.
  - Review button is disabled.
  - User alert indicates: *"At least one finding must be recorded before requesting an evidence review."*

### Scenario 9 (S9): State Transitions & Guarding
- **Preconditions**: Application at Stage 1 (`DRAFT`).
- **Action**: User attempts to jump directly to Stage 3 or Stage 5 via UI buttons or URL tampering.
- **Expected Outcome**:
  - Guard logic intercepts transition and redirects to current active stage (`DRAFT`).
  - Stage 3 cannot be entered without Stage 2 analysis; Stage 5 cannot be entered without Stage 4 findings.

### Scenario 10 (S10): Hypothesis / Problem Editing (Dirty State)
- **Preconditions**: Application at Stage 3 or 4 with active analysis.
- **Action**: User navigates back to Stage 1 and edits the core `idea` text.
- **Expected Outcome**:
  - `isDirty` flag is activated.
  - Warning banner displays: *"Previous analysis may be outdated due to modified problem statement."*
  - Advancing to Stage 5 Review is locked until "Re-analyze" is executed.

### Scenario 11 (S11): Mobile Layout & Responsiveness
- **Preconditions**: Viewport resized to 375px (mobile screen width).
- **Action**: Navigate through all 5 stages of the application.
- **Expected Outcome**:
  - No horizontal page clipping or unwanted scrollbars.
  - Right-hand Evidence Ledger collapses cleanly into an expandable panel or bottom drawer.
  - Touch buttons adhere to minimum 44px tap targets.

### Scenario 12 (S12): Deterministic Demo Mode
- **Preconditions**: Clean application launch.
- **Action**: User clicks "Load Demo Scenario A" or "Load Demo Scenario B".
- **Expected Outcome**:
  - Pre-seeded problem, analysis, and findings populate instantly without making external network calls.
  - High-visibility banner `SAMPLE SCENARIO — NOT REAL RESEARCH` remains persistently visible across all screens.

### Scenario 13 (S13): Reset / Abandon Case
- **Preconditions**: Application holds populated data in Stage 4.
- **Action**: User clicks "Reset Case".
- **Expected Outcome**:
  - Confirmation modal appears requiring user acknowledgement.
  - Upon confirmation, LocalStorage is cleared and application returns cleanly to Stage 1 `DRAFT` in pristine initial state.
  - Cancelling the modal preserves all existing data.

### Scenario 14 (S14): Build & Runtime Verification
- **Preconditions**: Node.js runtime environment (v20+ / v22).
- **Action**:
  1. Run `npm run build` / `tsc -b`.
  2. Start server with `npm run dev`.
- **Expected Outcome**:
  - TypeScript compilation passes with zero type errors (`0 errors`).
  - Development server starts cleanly without unhandled runtime exceptions.

---

## 10. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| F-01 | Workflow | 5-Stage Finite State Machine | Strict linear progression through DRAFT, ANALYZED, TEST_DEFINED, FINDINGS_ENTERED, EVIDENCE_REVIEWED. | Stage transition trigger events | Updated `currentStage` in state store | Blocks invalid forward transitions | `ORIGINAL_REQUEST.md` §R1, `ARCHITECTURE.md` §3 |
| F-02 | Workflow | Non-Destructive Backward Navigation | Allows user to navigate to any earlier stage without wiping entered findings or hypotheses. | Target stage click | Stage view updates; preserves data | None (safe operation) | `ORIGINAL_REQUEST.md` §R2, `ARCHITECTURE.md` §3 |
| F-03 | Workflow | Confirmed Case Reset | Clears all case data and local storage after explicit user confirmation dialog. | Reset button click + modal confirm | State reset to pristine `DRAFT` | Cancelling modal preserves existing state | `ORIGINAL_REQUEST.md` §R2, `ARCHITECTURE.md` §3 |
| F-04 | Integrity | Problem Statement Dirty State Tracking | Detects when core problem definition is edited after analysis, flagging downstream artifacts as stale. | Change event on `idea` or `targetUser` | `isDirty: true`, warning banner shown | Progression to Stage 5 locked until re-analyzed | `ORIGINAL_REQUEST.md` §R2, `ARCHITECTURE.md` §3 |
| F-05 | Analysis | AI Problem Clarity Rating | Evaluates problem definition into `clear`, `incomplete`, or `vague` with explicit missing details. | `ProblemInput` object | `problemClarity` object with status & details | HTTP 400 if idea < 10 chars | `ORIGINAL_REQUEST.md` §R1, `ARCHITECTURE.md` §2 |
| F-06 | Analysis | Risk-Ranked Assumption Extraction | Extracts core assumptions with unique ID, lethal risk level (`high/medium/low`), and needed evidence. | `ProblemInput` | Array of `Assumption` objects | Returns empty array or error if AI output malformed | `ORIGINAL_REQUEST.md` §R1, `ARCHITECTURE.md` §2 |
| F-07 | Analysis | Evidence Gap & Workaround Identification | Identifies critical unknowns and catalogs existing habits/workarounds used by users today. | `ProblemInput` | `evidenceGaps[]`, `existingWorkarounds[]` | Fallbacks to empty array on parse issue | `ORIGINAL_REQUEST.md` §R1, `ARCHITECTURE.md` §2 |
| F-08 | Experiment | Validation Experiment Design | Generates practical, non-leading inquiry questions, evidence to record, and effort estimate. | `ProblemInput` + `AnalysisResult` | `ValidationExperiment` object | HTTP 400 if analysis missing | `ORIGINAL_REQUEST.md` §R1, `ARCHITECTURE.md` §2 |
| F-09 | Evidence | Structured Finding Entry Ledger | Captures empirical observations with source type (`direct_observation`, `user_reported`, etc.) and hypothesis link. | Finding description, source type, notes | New `Finding` added to ledger | Blocks empty description submission | `ORIGINAL_REQUEST.md` §R1, `ARCHITECTURE.md` §2 |
| F-10 | Verdict | Grounded Decision Brief Synthesis | Synthesizes findings into supported/unsupported claims, updated problem, and 1 of 3 verdicts. | Findings array + Experiment + Problem | `Verdict` object | HTTP 400 if findings array is empty | `ORIGINAL_REQUEST.md` §R1, `ARCHITECTURE.md` §2 |
| F-11 | Verdict | Overconfidence Prohibition Filter | Enforces exclusion of words like "PROVEN" or "GUARANTEED MARKET DEMAND" from verdicts. | Raw AI verdict text | Sanitized/bounded verdict categories | System prompt + validation reject forbidden tokens | `ORIGINAL_REQUEST.md` §R1, `ARCHITECTURE.md` §4 |
| F-12 | API | Server-Side Gemini API Proxy | Exposes `/api/analyze`, `/api/test`, `/api/review` on server; keeps `GEMINI_API_KEY` hidden from client. | Client HTTP requests | JSON response payloads | HTTP 500 if key missing; never leaks key | `ORIGINAL_REQUEST.md` §R3, `ARCHITECTURE.md` §5 |
| F-13 | API | Bounded Retry & Schema Validation | Validates LLM responses against strict JSON schemas with up to 2 retries on malformed syntax. | Raw LLM output string | Validated typed object | HTTP 502/500 if retries exhausted | `ORIGINAL_REQUEST.md` §R3, `ARCHITECTURE.md` §5 |
| F-14 | Demo | Deterministic Scenario A (Vague Study App) | Pre-seeded scenario demonstrating refinement of broad, incomplete ideas without hitting API. | Select Demo A trigger | Instant deterministic analysis and test | None (mock data always succeeds) | `ORIGINAL_REQUEST.md` §R3, `ARCHITECTURE.md` §6 |
| F-15 | Demo | Deterministic Scenario B (Contradictory Findings) | Pre-seeded scenario demonstrating `REVISE THE HYPOTHESIS` verdict on conflicting evidence. | Select Demo B trigger | Instant pre-loaded findings & verdict | None (mock data always succeeds) | `ORIGINAL_REQUEST.md` §R3, `ARCHITECTURE.md` §6 |
| F-16 | Demo | Persistent Demo Watermark Banner | Visual badge reading `SAMPLE SCENARIO — NOT REAL RESEARCH` anchored on all screens in demo mode. | `isDemo === true` in state | Rendered banner at top of workspace | Non-dismissible while demo active | `ORIGINAL_REQUEST.md` §R3, `ARCHITECTURE.md` §6 |
| F-17 | Security | Anti-Silent-Fallback Enforcement | Prohibits live API failures from silently switching to demo/mock data without explicit user knowledge. | API failure event | Explicit error message presented to user | Rejects automatic silent degradation | `ORIGINAL_REQUEST.md` §R3, `ARCHITECTURE.md` §5 |
| F-18 | Storage | Schema-Versioned LocalStorage | Automatically saves and restores state across browser reloads with schema version check. | State store mutations | Synchronized `localStorage` JSON | Handles corrupted storage by proposing clean reset | `ORIGINAL_REQUEST.md` §R4, `ARCHITECTURE.md` §1 |
| F-19 | UI/UX | Two-Column Analytical Workspace | Left column for active stage tasks/forms; Right column for persistent ledger and hypothesis overview. | Workspace state | Two-column responsive desktop layout | Collapses to single column on mobile (<768px) | `ORIGINAL_REQUEST.md` §R4, `ARCHITECTURE.md` §1 |
| F-20 | UI/UX | Anti-Slop Visual System | Neutral slate theme, purposeful status pills, zero rainbow AI gradients, zero fake decorative graphs. | Design tokens & Tailwind classes | Polished, disciplined typography & UI | Rejects generic AI aesthetic defaults | `ORIGINAL_REQUEST.md` §R4, USER_RULE |
| F-21 | UI/UX | Tactile Feedback & Spring Easing | `scale(0.97)` active press state, ease-out transitions < 250ms, no sluggish `ease-in`. | User click/tap events | Immediate physical touch/press response | None | USER_RULE |

---

## 11. Edge Cases & Boundary Conditions

| # | Feature | Input / Trigger | Observed / Required Behavior |
|---|---|---|---|
| E-01 | Stage 1 Input | Submitting string of 15 spaces `"               "` | Trimmed string length is 0; blocked by client validator; red error displayed; no API call made. |
| E-02 | Stage 1 Input | Entering exactly 9 characters `"Buggy app"` | Blocked; validator requires minimum 10 characters to force meaningful problem formulation. |
| E-03 | Stage 1 Input | Inputting special characters / HTML tags `<script>alert(1)</script>` | React safely escapes text during rendering; API prompt treats as raw string without execution. |
| E-04 | Stage 2 Invalidation | User analyzes Idea A, advances to Stage 3, then returns to Stage 1 and edits Idea to B | State becomes `isDirty = true`; warning banner appears; advancing to Stage 5 locked until re-analysis. |
| E-05 | Stage 3 Guarding | User bookmarks Stage 3 URL or manually sets state in devtools without Stage 2 analysis | Guard evaluates `analysisResult === null`; redirects back to Stage 1 or Stage 2 with explanation. |
| E-06 | Stage 4 Findings | User enters finding with 0 characters or only whitespace | "Add Finding" button disabled; prevents logging blank entries into Evidence Ledger. |
| E-07 | Stage 4 Findings | User records 10+ findings in ledger | Ledger handles vertical scrolling cleanly with sticky headers; right-hand summary aggregates counts. |
| E-08 | Stage 5 Guarding | User clicks "Synthesize Decision Brief" with 0 findings in ledger | Button is disabled with explanatory tooltip; review API call is prevented. |
| E-09 | Stage 5 Verdict | User submits findings that are purely hearsay: "Everyone in my dorm thought it was a cool idea" | AI synthesis weighs source as subjective opinion; issues `INSUFFICIENT EVIDENCE`; rejects promotion to supported. |
| E-10 | Stage 5 Verdict | User submits findings with overwhelming evidence refuting core assumption | Synthesis issues `REVISE THE HYPOTHESIS`; lists contradictory facts; highlights need to pivot focus. |
| E-11 | Stage 5 Output | AI generates text containing "The hypothesis is PROVEN beyond doubt" | Sanitization layer / prompt guard rejects overconfidence; clamps verdict to allowed categories. |
| E-12 | API Failure | Server loses internet connection or Gemini API returns 503 during `/api/analyze` | Client receives HTTP 503; shows red banner: *"Network error connecting to AI service."*; does NOT show demo data. |
| E-13 | Missing Key | Environment variable `GEMINI_API_KEY` is undefined or empty string | Server returns HTTP 500 `{ success: false, error: "GEMINI_API_KEY is not configured." }`; clear setup instructions shown. |
| E-14 | Demo Mode Banner | User navigates across all 5 stages in Demo Mode | Banner `[SAMPLE SCENARIO — NOT REAL RESEARCH]` remains permanently fixed at top; cannot be dismissed. |
| E-15 | Case Reset | User accidentally clicks "Reset Case" button | Modal dialog prompts: *"Are you sure? This will delete all entered data."*; data kept if Cancel clicked. |
| E-16 | LocalStorage Overflow | Browser storage quota exceeded or corrupted JSON in localStorage | Try/catch block catches parse error; notifies user and gracefully reinitializes to pristine default state. |
| E-17 | Mobile Responsiveness | User opens app on narrow screen (320px width, e.g. iPhone SE) | Layout stacks vertically; form inputs fit 100% width; ledger converts to bottom drawer or expandable section. |
| E-18 | Rapid Clicking | User double-clicks "Analyze Problem" button while request is in flight | Button enters loading state (`isAnalyzing: true`) and disables further clicks, preventing duplicate API requests. |

---

## 12. Requirement Traceability Matrix

| Requirement ID | Original Request Section | Architectural Mapping | Verification Test Scenario |
|---|---|---|---|
| **R1.1** | 5-Stage Core Validation Workflow | State Machine Store (`src/store/caseStore.ts`) | S1, S2, S9 |
| **R1.2** | Stage 1: Problem Definition & Constraints | Problem Input Form (`src/components/stage1/ProblemForm.tsx`) | S1, S2, S3 |
| **R1.3** | Stage 2: Challenge Assumptions & Clarity | Analysis View (`src/components/stage2/AnalysisView.tsx`) | S1, S2 |
| **R1.4** | Stage 3: Validation Experiment Design | Experiment View (`src/components/stage3/ExperimentView.tsx`) | S1, S2 |
| **R1.5** | Stage 4: Record Findings & Ledger | Findings Form & Ledger (`src/components/stage4/FindingsView.tsx`) | S6, S7, S8 |
| **R1.6** | Stage 5: Evidence Review & 3 Verdict Categories | Decision Brief View (`src/components/stage5/ReviewView.tsx`) | S6, S7 |
| **R2.1** | Strict Transition Guarding | FSM Guard Rules (`src/store/guards.ts`) | S8, S9 |
| **R2.2** | Dirty State Tracking & Outdated Flagging | Invalidation Store (`src/store/caseStore.ts`) | S10 |
| **R2.3** | Non-Destructive Backward Navigation | FSM Navigation (`src/components/layout/StageBar.tsx`) | S9 |
| **R2.4** | Confirmed Case Reset / Abandonment | Reset Modal Dialog (`src/components/common/ResetModal.tsx`) | S13 |
| **R3.1** | Server-Side Gemini Endpoints (`/api/*`) | Vite Dev Middleware / Node Server (`server/api.ts`) | S5, S14 |
| **R3.2** | Bounded Retries & Schema Validation | AI Service Layer (`server/geminiService.ts`) | S4 |
| **R3.3** | Graceful Error Handling & Credential Check | API Error Handler (`server/api.ts`) | S5 |
| **R3.4** | Deterministic Demo Mode & Persistent Banner | Demo Mock Service (`src/services/demoService.ts`) | S12 |
| **R3.5** | Prohibition Against Silent Mock Fallback | API Client Guard (`src/services/apiClient.ts`) | S5 |
| **R4.1** | Anti-Slop Analytical Workspace & Layout | Two-Column Layout (`src/components/layout/Workspace.tsx`) | S11 |
| **R4.2** | Responsive Tactile Feedback & Easing | Tailwind Tokens & CSS (`src/index.css`) | S11 |
| **R4.3** | LocalStorage Persistence Across Reloads | Persistence Middleware (`src/store/storage.ts`) | S10, S13 |
| **R5.1** | Production Build & TypeScript Verification | `npm run build`, `tsc -b` | S14 |
| **R5.2** | 14 PRD Test Scenarios Complete Suite | Test Harness (`tests/prd-scenarios.test.ts`) | S1–S14 |
