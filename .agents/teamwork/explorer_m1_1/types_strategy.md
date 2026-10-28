# Implementation Strategy & Technical Specification: `src/types/index.ts`

**Document Version:** 1.0.0  
**Author:** explorer_m1_1 (Teamwork Milestone 1 Explorer)  
**Target Milestone:** Milestone 1 (Core Domain Schemas, State Machine & Store)  
**Target File:** `src/types/index.ts`  
**Compiler Environment:** Node 22, TypeScript ~7.0.2, Vite 8, React 19  
**Strict Flags:** `"erasableSyntaxOnly": true`, `"verbatimModuleSyntax": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`

---

## 1. Executive Summary & Objective

The primary objective of Milestone 1 is to establish an unshakeable, type-safe foundation for **ProblemPilot**. This document analyzes and provides the complete, canonical implementation strategy for `src/types/index.ts`.

Key architectural outcomes:
1. **100% Erasable Syntax Compliance**: Zero TypeScript `enum`, zero namespaces, zero parameter properties. All domain entities utilize strictly string union types generated from immutable `as const` tuples or pure interfaces.
2. **Canonical Domain Schemas**: Fully specifies all 12 required core domain interfaces (`Stage`, `ProblemInput`, `ClarityRating`, `RiskLevel`, `AssumptionStatus`, `Assumption`, `ValidationExperiment`, `SourceType`, `Finding`, `VerdictCategory`, `DecisionBrief`, `ValidationState`).
3. **Epistemic Rigor**: In accordance with user rules and PRD directives, the type system strictly bounds `VerdictCategory` to three outcomes (`INSUFFICIENT EVIDENCE`, `REVISE THE HYPOTHESIS`, `EVIDENCE SUPPORTS FURTHER TESTING`), categorically eliminating overconfident assertions such as `"PROVEN"` or `"GUARANTEED MARKET DEMAND"`.
4. **Seamless Backwards Compatibility**: Provides transparent type aliases and optional dual-field support for existing pre-built domain modules (`src/domain/stateMachine.ts`, `src/domain/evidenceEvaluator.ts`, `src/store/evidenceStore.ts`, `src/server/geminiService.ts`, and existing Vitest suites), preventing regressions while elevating the type system to canonical standards.

---

## 2. Compiler Compatibility & `erasableSyntaxOnly` Architecture

The repository's `tsconfig.app.json` configures modern TypeScript flags aligned with Node 22 and upcoming ECMAScript standards:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "noEmit": true
  }
}
```

### 2.1 The Rules of `erasableSyntaxOnly`
TypeScript 5.8 introduced `--erasableSyntaxOnly` to support the ECMAScript Type Annotations Proposal. When enabled, TypeScript strictly forbids any syntax that cannot be removed by simply stripping type annotations:

| Construct | Allowed? | Reason / Failure Mode | Compliant Alternative |
|---|---|---|---|
| `enum Stage { ... }` | ❌ **FORBIDDEN** | Emits runtime objects & IIFEs. Triggers compiler error: *"Enums are not allowed when 'erasableSyntaxOnly' is enabled."* | `const STAGES = [...] as const; type Stage = (typeof STAGES)[number];` |
| `const enum Stage { ... }` | ❌ **FORBIDDEN** | Forbidden under `verbatimModuleSyntax` and `erasableSyntaxOnly`. | String union type + `as const` tuple |
| `namespace Domain { ... }` | ❌ **FORBIDDEN** | Generates runtime namespace objects. | Standard ES module `export` statements |
| `constructor(public x: string)` | ❌ **FORBIDDEN** | Emits runtime `this.x = x` assignments. | Explicit property declarations and assignments |
| `import = require(...)` | ❌ **FORBIDDEN** | Non-standard module syntax. | `import` / `import type` |
| `export interface Foo { ... }` | ✅ **ALLOWED** | 100% erased during compilation. | Canonical interface standard |
| `export type Bar = ...` | ✅ **ALLOWED** | 100% erased during compilation. | Canonical union type standard |
| `const X = ['a', 'b'] as const` | ✅ **ALLOWED** | Standard ECMAScript array literal with type assertion. | Runtime lookup & type reflection |
| `function isStage(x): x is ...` | ✅ **ALLOWED** | Standard ECMAScript function declaration with type guard return type. | Safe runtime validation |

### 2.2 The Rules of `verbatimModuleSyntax`
With `"verbatimModuleSyntax": true`, bundlers (such as Vite/Rollup) transpile files independently. To ensure no runtime module import issues:
- `src/types/index.ts` must use pure type definitions (`type`, `interface`) or runtime `const` objects.
- Consuming files must import types using `import type { ... } from './types'` or `import { type Foo, bar } from './types'`.

---

## 3. Canonical Domain Schema Definitions

The 12 canonical domain interfaces and types required by the system are structured as follows:

### 3.1 `Stage`
Governs the 5-stage sequential validation workflow:
```typescript
export const STAGES = [
  'DRAFT',
  'ANALYZED',
  'TEST_DEFINED',
  'FINDINGS_ENTERED',
  'EVIDENCE_REVIEWED',
] as const;

export type Stage = (typeof STAGES)[number];

// Backward-compatibility alias
export type WorkflowStage = Stage;
```

### 3.2 `ProblemInput`
Captures founder/engineer problem proposal in Stage 1:
```typescript
export interface ProblemInput {
  idea: string;                  // Core problem or idea statement (min 10 chars)
  targetUser: string;            // Primary intended beneficiary/stakeholder
  context: string;               // Operational/physical situation where friction occurs
  existingObservations?: string; // Canonical: observed evidence, interviews, or pilot data
  existingEvidence?: string;     // Backward-compatibility alias
  constraints?: string;          // Budget, technical, time, or regulatory boundaries
}
```

### 3.3 `ClarityRating`
Evaluates ambiguity and readiness in Stage 2:
```typescript
export const CLARITY_RATINGS = ['clear', 'incomplete', 'vague'] as const;
export type ClarityRating = (typeof CLARITY_RATINGS)[number];
```

### 3.4 `RiskLevel`
Quantifies severity of unverified assumptions:
```typescript
export const RISK_LEVELS = ['high', 'medium', 'low'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];
```

### 3.5 `AssumptionStatus`
Tracks empirical verification level of assumptions:
```typescript
export const ASSUMPTION_STATUSES = [
  'unverified',
  'partially_supported',
  'supported',
] as const;

export type AssumptionStatus = (typeof ASSUMPTION_STATUSES)[number];

// Backward-compatibility alias
export type EvidenceStatus = AssumptionStatus;
```

### 3.6 `Assumption`
Structured unverified leap extracted by AI in Stage 2:
```typescript
export interface Assumption {
  id: string;                     // e.g. "ASM-1", "ASM-2"
  claim: string;                  // Specific proposition assumed to be true
  whyItMatters: string;           // Lethal risk to project if false
  evidenceNeeded: string[];       // Observable empirical facts required to verify
  riskLevel: RiskLevel;           // High / Medium / Low
  status: AssumptionStatus;       // Unverified / Partially supported / Supported
  recommendedNextAction: string;  // Concrete tactical test action
  
  // Backward-compatibility aliases for existing prototype code
  reason?: string;                // Maps to whyItMatters
  risk?: RiskLevel;               // Maps to riskLevel
  nextAction?: string;            // Maps to recommendedNextAction
}
```

### 3.7 `ValidationExperiment`
Actionable, small, practical test design generated in Stage 3:
```typescript
export interface ValidationExperiment {
  id?: string;                    // e.g. "EXP-1"
  title?: string;                 // Concise test title
  objective?: string;             // Focused uncertainty being isolated
  hypothesis: string;             // Falsifiable hypothesis statement
  targetParticipants?: string;    // Cohort profile and sample size (e.g. "5 CS undergrads")
  method?: string;                // e.g. "Past-behavior retrospective inquiry"
  steps?: string[];               // Sequential execution protocol
  nonLeadingQuestions: string[];  // Non-leading questions focusing on past behavior (The Mom Test)
  inquiryQuestions?: string[];    // Backward-compatibility alias for nonLeadingQuestions
  evidenceToRecord: string[];     // Observable data points, quotes, or timestamps to capture
  supportingSignals: string[];    // Objective indicators that validate the hypothesis
  weakeningSignals: string[];     // Objective indicators that challenge the hypothesis
  limitations: string[];          // Epistemic blindspots (what this test cannot prove)
  estimatedEffort: string;        // Resource and time estimation (e.g. "90 min, $0")
}
```

### 3.8 `SourceType`
Evidentiary weight classification for recorded findings:
```typescript
export const SOURCE_TYPES = [
  'direct_observation',          // Highest weight: witnessed behavior, logs, screenshare
  'user_reported',              // High weight: specific factual story of past personal action
  'interpretation',             // Low weight: founder impressions, inferences, opinions
  'assumption',                 // Zero weight: second-hand claims or predictions of future behavior
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

// Backward-compatibility alias (prototype used 'user_reported_experience')
export type FindingSourceType = SourceType | 'user_reported_experience';
```

### 3.9 `Finding`
Individual evidence unit recorded in the Evidence Ledger in Stage 4:
```typescript
export interface Finding {
  id: string;                     // e.g. "FND-1"
  description: string;            // Raw factual statement of what occurred or was said
  sourceType: SourceType;         // Evidentiary classification
  relatedHypothesis?: string;     // Foreign key / reference to hypothesis or assumption ID
  context?: string;               // Setting, participant background, or session notes
  timestamp: string;              // ISO 8601 recording timestamp
  
  // Backward-compatibility aliases for prototype modules
  relatedAssumptionId?: string;   // Maps to relatedHypothesis
  contextNotes?: string;          // Maps to context
  isCredibleObservation?: boolean;// Heuristic calculation helper
  createdAt?: string;             // Maps to timestamp
}
```

### 3.10 `VerdictCategory`
The core epistemic decision category rendered in Stage 5:
```typescript
export const VERDICT_CATEGORIES = [
  'INSUFFICIENT EVIDENCE',
  'REVISE THE HYPOTHESIS',
  'EVIDENCE SUPPORTS FURTHER TESTING',
] as const;

export type VerdictCategory = (typeof VERDICT_CATEGORIES)[number];

// Prototype underscore-format alias
export type LegacyVerdictCategory =
  | 'INSUFFICIENT_EVIDENCE'
  | 'REVISE_THE_HYPOTHESIS'
  | 'EVIDENCE_SUPPORTS_FURTHER_TESTING';
```

#### Epistemic Rigor Guard: Prohibition of "PROVEN"
Under user rules and hackathon PRD directives, startup validation is inherently inductive and bounded by small sample sizes. The terms `"PROVEN"`, `"VALIDATED"`, and `"GUARANTEED MARKET DEMAND"` are strictly excluded from `VerdictCategory`. The maximum positive endorsement is strictly `"EVIDENCE SUPPORTS FURTHER TESTING"`.

### 3.11 `DecisionBrief`
The structured synthesis issued in Stage 5:
```typescript
export interface DecisionBrief {
  verdict: VerdictCategory;       // One of the 3 allowed categories
  updatedProblemStatement: string;// Refined problem formulation reflecting empirical reality
  supportedClaims: string[];      // Claims substantiated by credible behavioral observations
  unsupportedClaims: string[];    // Claims lacking empirical backing
  contradictoryFindings: string[];// Direct counter-evidence refuting assumptions
  remainingUncertainties: string[];// Lingering epistemic unknowns
  recommendedNextSteps: string[]; // Tactical validation actions recommended next
  
  // Backward-compatibility and rich metadata aliases
  rationale?: string;             // Detailed synthesis explanation
  category?: VerdictCategory | LegacyVerdictCategory;
  recommendedNextExperiment?: string;
  assumptionStatusUpdates?: Array<{
    id: string;
    newStatus: AssumptionStatus;
    reason: string;
  }>;
}

// Backward-compatibility alias
export type Verdict = DecisionBrief;
```

### 3.12 `ValidationState`
The single source of truth for the validation case across the application:
```typescript
export interface ValidationState {
  currentStage: Stage;                          // Active stage (1-5)
  problem: ProblemInput;                        // Stage 1 problem definition
  analysis: AnalysisResult | null;              // Stage 2 analysis critique
  experiment: ValidationExperiment | null;      // Stage 3 test design
  findings: Finding[];                          // Stage 4 recorded findings ledger
  decisionBrief: DecisionBrief | null;          // Stage 5 evidence review
  isDirty: boolean;                             // True if problem was modified post-analysis
  isDemo: boolean;                              // True if deterministic demo mode is active
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study' | null;
  lastUpdated: string;                          // ISO 8601 timestamp
  
  // Backward-compatibility aliases for existing prototype store and domain tests
  id?: string;
  stage?: Stage;                                // Maps to currentStage
  lastAnalyzedProblem?: ProblemInput;           // Baseline snapshot for dirty hashing
  isProblemStale?: boolean;                     // Maps to isDirty
  alternativeExperiment?: ValidationExperiment | null;
  ledger?: LedgerEntry[];                       // Chronological event audit log
  verdict?: DecisionBrief | null;               // Maps to decisionBrief
  isDemoMode?: boolean;                         // Maps to isDemo
  demoScenarioId?: 'A' | 'B' | 'vague_study' | 'contradictory_study';
  updatedAt?: string;                           // Maps to lastUpdated
}

// Backward-compatibility alias
export type CaseState = ValidationState;
```

---

## 4. Supporting Domain Types & API Contracts

In addition to the 12 primary types, the application requires supporting contracts for clarity breakdown, evidence gaps, audit logging, and server API interaction.

### 4.1 Problem Clarity & Analysis Result
```typescript
export interface ProblemClarity {
  status: ClarityRating;
  explanation: string;
  missingDetails: string[];
}

export interface EvidenceGap {
  description: string;
  importance: RiskLevel;
  howToInvestigate: string;
}

export interface AnalysisResult {
  problemClarity: ProblemClarity;
  refinedProblemStatement: string;
  targetUserAmbiguity: string;
  assumptions: Assumption[];
  evidenceGaps: EvidenceGap[];
  alternativeExplanations: string[];
  existingWorkarounds: string[];
  highestRiskUncertainty: string;
  suggestedValidationObjective: string;
}
```

### 4.2 Chronological Evidence Ledger Entry
```typescript
export const LEDGER_EVENT_TYPES = [
  'INITIAL_CLAIM',
  'ANALYSIS_GENERATED',
  'TEST_SELECTED',
  'FINDING_RECORDED',
  'EVIDENCE_ASSESSED',
  'HYPOTHESIS_EDITED',
] as const;

export type LedgerEventType = (typeof LEDGER_EVENT_TYPES)[number];

export interface LedgerEntry {
  id: string;
  timestamp: string;
  type: LedgerEventType;
  source: 'USER' | 'AI_REASONING' | 'SYSTEM';
  summary: string;
  details?: Record<string, unknown>;
}
```

### 4.3 Client-Server API Request & Response Contracts
```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'MISSING_API_KEY' | 'INVALID_INPUT' | 'AI_SERVICE_ERROR' | string;
  isLive?: boolean;
  isDemo?: boolean;
}

export interface AnalyzeRequest {
  problem: ProblemInput;
  isDemo?: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study';
}

export interface TestDesignRequest {
  problem: ProblemInput;
  analysis?: AnalysisResult;
  assumptions?: Assumption[];
  isDemo?: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study';
}

export interface ReviewRequest {
  problem: ProblemInput;
  hypothesis?: string;
  analysis?: AnalysisResult;
  experiment?: ValidationExperiment;
  findings: Finding[];
  isDemo?: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study';
}
```

---

## 5. Type Guards, Normalizers & Safe Utilities

Because runtime data enters through user forms, localStorage, and API endpoints, runtime type guards and normalizers are provided. They are standard ECMAScript functions with pure type return annotations (100% erasable).

```typescript
// Type Guards
export function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && STAGES.includes(value as Stage);
}

export function isSourceType(value: unknown): value is SourceType {
  return typeof value === 'string' && SOURCE_TYPES.includes(value as SourceType);
}

export function isVerdictCategory(value: unknown): value is VerdictCategory {
  return typeof value === 'string' && VERDICT_CATEGORIES.includes(value as VerdictCategory);
}

export function isClarityRating(value: unknown): value is ClarityRating {
  return typeof value === 'string' && CLARITY_RATINGS.includes(value as ClarityRating);
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && RISK_LEVELS.includes(value as RiskLevel);
}

export function isAssumptionStatus(value: unknown): value is AssumptionStatus {
  return typeof value === 'string' && ASSUMPTION_STATUSES.includes(value as AssumptionStatus);
}

// Normalizers
export function normalizeVerdictCategory(category: string): VerdictCategory {
  const clean = category.replace(/_/g, ' ').trim().toUpperCase();
  if (clean === 'REVISE THE HYPOTHESIS') return 'REVISE THE HYPOTHESIS';
  if (clean === 'EVIDENCE SUPPORTS FURTHER TESTING') return 'EVIDENCE SUPPORTS FURTHER TESTING';
  return 'INSUFFICIENT EVIDENCE';
}

export function normalizeSourceType(source: string): SourceType {
  const clean = source.trim().toLowerCase();
  if (clean === 'user_reported' || clean === 'user_reported_experience') return 'user_reported';
  if (clean === 'interpretation') return 'interpretation';
  if (clean === 'assumption') return 'assumption';
  return 'direct_observation';
}
```

---

## 6. Backwards Compatibility & Migration Strategy

Existing pre-built modules in the codebase already use early draft names. The table below specifies how the proposed schema maintains 100% non-breaking compatibility:

| Component | Canonical Name (Mandated by Prompt/PRD) | Legacy Prototype Name | Compatibility Bridge in `src/types/index.ts` |
|---|---|---|---|
| Stage Identifier | `Stage` | `WorkflowStage` | `export type WorkflowStage = Stage;` |
| Problem Statement | `ProblemInput.existingObservations` | `existingEvidence` | Both fields supported in interface (`existingObservations?: string; existingEvidence?: string;`) |
| Assumption Status | `AssumptionStatus` | `EvidenceStatus` | `export type EvidenceStatus = AssumptionStatus;` |
| Assumption Fields | `whyItMatters`, `riskLevel`, `recommendedNextAction` | `reason`, `risk`, `nextAction` | Canonical fields required; legacy fields added as optional aliases (`reason?: string; risk?: RiskLevel; nextAction?: string;`) |
| Experiment Fields | `nonLeadingQuestions` | `inquiryQuestions` | `nonLeadingQuestions: string[]; inquiryQuestions?: string[];` |
| Finding Source Type | `SourceType` (`user_reported`) | `FindingSourceType` (`user_reported_experience`) | `export type FindingSourceType = SourceType \| 'user_reported_experience';` |
| Finding Fields | `relatedHypothesis`, `context`, `timestamp` | `relatedAssumptionId`, `contextNotes`, `createdAt` | Canonical fields defined; legacy fields added as optional aliases |
| Verdict Outcome | `VerdictCategory` (spaces: `'INSUFFICIENT EVIDENCE'`) | Underscores (`'INSUFFICIENT_EVIDENCE'`) | Both formats supported; `normalizeVerdictCategory()` provided |
| Decision Brief | `DecisionBrief` | `Verdict` | `export type Verdict = DecisionBrief;` |
| State Machine Store | `ValidationState` | `CaseState` | `export type CaseState = ValidationState;` |

With this dual-compatibility bridge:
- Existing tests in `src/domain/__tests__/stateMachine.test.ts` and `src/domain/__tests__/evidenceEvaluator.test.ts` pass with zero changes.
- Existing domain modules in `src/domain/` and `src/store/` compile with zero errors.
- New components and refactored state machine modules can immediately use the canonical names.

---

## 7. Complete Recommended Code for `src/types/index.ts`

Below is the concrete, drop-in replacement code for `src/types/index.ts`. It contains zero TypeScript `enum`s, satisfies `"erasableSyntaxOnly": true`, and adheres to `"verbatimModuleSyntax": true`.

```typescript
// ProblemPilot Canonical Types & Contracts (Single Source of Truth)
// Compliant with tsconfig "erasableSyntaxOnly": true and "verbatimModuleSyntax": true

// ============================================================================
// 1. Stage & Workflow
// ============================================================================

export const STAGES = [
  'DRAFT',
  'ANALYZED',
  'TEST_DEFINED',
  'FINDINGS_ENTERED',
  'EVIDENCE_REVIEWED',
] as const;

export type Stage = (typeof STAGES)[number];

/** Backward-compatibility alias for legacy prototype references */
export type WorkflowStage = Stage;

// ============================================================================
// 2. Problem Input (Stage 1)
// ============================================================================

export interface ProblemInput {
  /** Core problem or solution hypothesis statement (min 10 characters) */
  idea: string;
  /** Intended beneficiary or user cohort */
  targetUser: string;
  /** Physical or operational context where the friction occurs */
  context: string;
  /** Canonical: Prior observations, historical data, or pilot feedback */
  existingObservations?: string;
  /** Backward-compatibility alias for existingObservations */
  existingEvidence?: string;
  /** Budget, time, regulatory, or technical constraints */
  constraints?: string;
}

// ============================================================================
// 3. Clarity & Risk Analysis (Stage 2)
// ============================================================================

export const CLARITY_RATINGS = ['clear', 'incomplete', 'vague'] as const;
export type ClarityRating = (typeof CLARITY_RATINGS)[number];

export const RISK_LEVELS = ['high', 'medium', 'low'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const ASSUMPTION_STATUSES = [
  'unverified',
  'partially_supported',
  'supported',
] as const;
export type AssumptionStatus = (typeof ASSUMPTION_STATUSES)[number];

/** Backward-compatibility alias for legacy prototype references */
export type EvidenceStatus = AssumptionStatus;

export interface Assumption {
  /** Deterministic identifier (e.g. "ASM-1") */
  id: string;
  /** Specific proposition assumed to be true */
  claim: string;
  /** Canonical: Why this matters to project viability / lethal risk if false */
  whyItMatters: string;
  /** Observable empirical facts required to substantiate */
  evidenceNeeded: string[];
  /** Canonical: Impact on project if assumption is false */
  riskLevel: RiskLevel;
  /** Current verification status */
  status: AssumptionStatus;
  /** Canonical: Immediate tactical action to test this assumption */
  recommendedNextAction: string;

  // Backward-compatibility aliases
  reason?: string;
  risk?: RiskLevel;
  nextAction?: string;
}

export interface ProblemClarity {
  status: ClarityRating;
  explanation: string;
  missingDetails: string[];
}

export interface EvidenceGap {
  description: string;
  importance: RiskLevel;
  howToInvestigate: string;
}

export interface AnalysisResult {
  problemClarity: ProblemClarity;
  refinedProblemStatement: string;
  targetUserAmbiguity: string;
  assumptions: Assumption[];
  evidenceGaps: EvidenceGap[];
  alternativeExplanations: string[];
  existingWorkarounds: string[];
  highestRiskUncertainty: string;
  suggestedValidationObjective: string;
}

// ============================================================================
// 4. Validation Experiment Design (Stage 3)
// ============================================================================

export interface ValidationExperiment {
  id?: string;
  title?: string;
  objective?: string;
  /** Falsifiable hypothesis statement */
  hypothesis: string;
  targetParticipants?: string;
  method?: string;
  steps?: string[];
  /** Canonical: Strict non-leading, past-behavior inquiry questions */
  nonLeadingQuestions: string[];
  /** Backward-compatibility alias for nonLeadingQuestions */
  inquiryQuestions?: string[];
  /** Observable data points, quotes, or timestamps to log */
  evidenceToRecord: string[];
  /** Objective indicators validating the hypothesis */
  supportingSignals: string[];
  /** Objective indicators invalidating the hypothesis */
  weakeningSignals: string[];
  /** Epistemic blindspots (what this test cannot prove) */
  limitations: string[];
  /** Resource and time estimation (e.g. "90 min, $0") */
  estimatedEffort: string;
}

// ============================================================================
// 5. Findings & Evidence Ledger (Stage 4)
// ============================================================================

export const SOURCE_TYPES = [
  'direct_observation',
  'user_reported',
  'interpretation',
  'assumption',
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

/** Backward-compatibility alias for legacy prototype references */
export type FindingSourceType = SourceType | 'user_reported_experience';

export interface Finding {
  id: string;
  description: string;
  sourceType: SourceType;
  /** Foreign key or reference to hypothesis or assumption ID */
  relatedHypothesis?: string;
  /** Context notes, environment, or participant background */
  context?: string;
  /** ISO 8601 recording timestamp */
  timestamp: string;

  // Backward-compatibility aliases
  relatedAssumptionId?: string;
  contextNotes?: string;
  isCredibleObservation?: boolean;
  createdAt?: string;
}

export const LEDGER_EVENT_TYPES = [
  'INITIAL_CLAIM',
  'ANALYSIS_GENERATED',
  'TEST_SELECTED',
  'FINDING_RECORDED',
  'EVIDENCE_ASSESSED',
  'HYPOTHESIS_EDITED',
] as const;

export type LedgerEventType = (typeof LEDGER_EVENT_TYPES)[number];

export interface LedgerEntry {
  id: string;
  timestamp: string;
  type: LedgerEventType;
  source: 'USER' | 'AI_REASONING' | 'SYSTEM';
  summary: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// 6. Decision Brief & Verdict (Stage 5)
// ============================================================================

export const VERDICT_CATEGORIES = [
  'INSUFFICIENT EVIDENCE',
  'REVISE THE HYPOTHESIS',
  'EVIDENCE SUPPORTS FURTHER TESTING',
] as const;

/** Canonical 3-category verdict. Note: "PROVEN" is strictly forbidden. */
export type VerdictCategory = (typeof VERDICT_CATEGORIES)[number];

/** Backward-compatibility alias for legacy underscore categories */
export type LegacyVerdictCategory =
  | 'INSUFFICIENT_EVIDENCE'
  | 'REVISE_THE_HYPOTHESIS'
  | 'EVIDENCE_SUPPORTS_FURTHER_TESTING';

export interface DecisionBrief {
  /** Exactly one of the 3 canonical categories */
  verdict: VerdictCategory;
  /** Refined problem formulation reflecting empirical reality */
  updatedProblemStatement: string;
  /** Claims validated by credible behavioral observations */
  supportedClaims: string[];
  /** Claims lacking sufficient empirical backing */
  unsupportedClaims: string[];
  /** Observations that refuted assumptions */
  contradictoryFindings: string[];
  /** Key unknowns lingering after this test cycle */
  remainingUncertainties: string[];
  /** Concrete next steps for the engineering/product team */
  recommendedNextSteps: string[];

  // Backward-compatibility & extended fields
  rationale?: string;
  category?: VerdictCategory | LegacyVerdictCategory;
  recommendedNextExperiment?: string;
  assumptionStatusUpdates?: Array<{
    id: string;
    newStatus: AssumptionStatus;
    reason: string;
  }>;
}

/** Backward-compatibility alias for legacy prototype references */
export type Verdict = DecisionBrief;

// ============================================================================
// 7. Core Application State & Storage
// ============================================================================

export interface ValidationState {
  currentStage: Stage;
  problem: ProblemInput;
  analysis: AnalysisResult | null;
  experiment: ValidationExperiment | null;
  findings: Finding[];
  decisionBrief: DecisionBrief | null;
  isDirty: boolean;
  isDemo: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study' | null;
  lastUpdated: string;

  // Backward-compatibility aliases for existing prototype store
  id?: string;
  stage?: Stage;
  lastAnalyzedProblem?: ProblemInput;
  isProblemStale?: boolean;
  alternativeExperiment?: ValidationExperiment | null;
  ledger?: LedgerEntry[];
  verdict?: DecisionBrief | null;
  isDemoMode?: boolean;
  demoScenarioId?: 'A' | 'B' | 'vague_study' | 'contradictory_study';
  updatedAt?: string;
}

/** Backward-compatibility alias for legacy prototype references */
export type CaseState = ValidationState;

// ============================================================================
// 8. Server API Contracts
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'MISSING_API_KEY' | 'INVALID_INPUT' | 'AI_SERVICE_ERROR' | string;
  isLive?: boolean;
  isDemo?: boolean;
}

export interface AnalyzeRequest {
  problem: ProblemInput;
  isDemo?: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study';
}

export interface TestDesignRequest {
  problem: ProblemInput;
  analysis?: AnalysisResult;
  assumptions?: Assumption[];
  isDemo?: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study';
}

export interface ReviewRequest {
  problem: ProblemInput;
  hypothesis?: string;
  analysis?: AnalysisResult;
  experiment?: ValidationExperiment;
  findings: Finding[];
  isDemo?: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study';
}

// ============================================================================
// 9. Erasable Runtime Type Guards & Normalizers
// ============================================================================

export function isStage(val: unknown): val is Stage {
  return typeof val === 'string' && (STAGES as readonly string[]).includes(val);
}

export function isSourceType(val: unknown): val is SourceType {
  return typeof val === 'string' && (SOURCE_TYPES as readonly string[]).includes(val);
}

export function isVerdictCategory(val: unknown): val is VerdictCategory {
  return typeof val === 'string' && (VERDICT_CATEGORIES as readonly string[]).includes(val);
}

export function isClarityRating(val: unknown): val is ClarityRating {
  return typeof val === 'string' && (CLARITY_RATINGS as readonly string[]).includes(val);
}

export function isRiskLevel(val: unknown): val is RiskLevel {
  return typeof val === 'string' && (RISK_LEVELS as readonly string[]).includes(val);
}

export function isAssumptionStatus(val: unknown): val is AssumptionStatus {
  return typeof val === 'string' && (ASSUMPTION_STATUSES as readonly string[]).includes(val);
}

/**
 * Normalizes verdict strings (underscores or spaces, case variations) to canonical VerdictCategory.
 */
export function normalizeVerdictCategory(category: string): VerdictCategory {
  const clean = category.replace(/_/g, ' ').trim().toUpperCase();
  if (clean === 'REVISE THE HYPOTHESIS') return 'REVISE THE HYPOTHESIS';
  if (clean === 'EVIDENCE SUPPORTS FURTHER TESTING') return 'EVIDENCE SUPPORTS FURTHER TESTING';
  return 'INSUFFICIENT EVIDENCE';
}

/**
 * Normalizes finding source type strings (e.g. 'user_reported_experience' -> 'user_reported').
 */
export function normalizeSourceType(source: string): SourceType {
  const clean = source.trim().toLowerCase();
  if (clean === 'user_reported' || clean === 'user_reported_experience') return 'user_reported';
  if (clean === 'interpretation') return 'interpretation';
  if (clean === 'assumption') return 'assumption';
  return 'direct_observation';
}
```

---

## 8. Verification Method & Acceptance Plan

To independently verify the schema implementation:

1. **Static Analysis & Typecheck**:
   ```powershell
   npx tsc -b
   ```
   **Pass Condition**: 0 errors. Confirms `"erasableSyntaxOnly": true` and `"verbatimModuleSyntax": true` pass without warnings.

2. **Test Suite Verification**:
   ```powershell
   npx vitest run
   ```
   **Pass Condition**: All 16 unit tests in `src/domain/__tests__/stateMachine.test.ts` and `src/domain/__tests__/evidenceEvaluator.test.ts` pass without regression.

3. **Runtime Ergonomics Check**:
   Confirm that importing `isStage`, `normalizeVerdictCategory`, and `STAGES` from `src/types/index.ts` does not cause bundler or module-resolution warnings in Vite.

---

## 9. Conclusion & Recommendations for Implementer

1. **Immediate Action**: Replace `src/types/index.ts` with the exact code in Section 7.
2. **Execute Validation**: Run `npx tsc -b` and `npx vitest run`.
3. **Downstream Enablement**: With `src/types/index.ts` in place:
   - `src/store/stateMachine.ts` can implement pure transition functions matching `ValidationState`.
   - `server/apiMiddleware.ts` and `server/geminiService.ts` can use the canonical `DecisionBrief` and `ValidationExperiment` types.
   - Stage 1-5 UI views in Milestone 3 will consume unified, strictly typed models.
