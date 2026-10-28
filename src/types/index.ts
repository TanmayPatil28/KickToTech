// ProblemPilot Canonical Types & Domain Contracts (Single Source of Truth)
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
  /** Intended beneficiary or user cohort (min 3 characters) */
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
  whyItMatters?: string;
  /** Observable empirical facts required to substantiate */
  evidenceNeeded: string[];
  /** Canonical: Impact on project if assumption is false */
  riskLevel?: RiskLevel;
  /** Current verification status */
  status: AssumptionStatus;
  /** Canonical: Immediate tactical action to test this assumption */
  recommendedNextAction?: string;

  // Backward-compatibility aliases for existing prototype and test fixtures
  reason: string;
  risk: RiskLevel;
  nextAction: string;
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
  steps: string[];
  /** Canonical: Strict non-leading, past-behavior inquiry questions */
  nonLeadingQuestions?: string[];
  /** Backward-compatibility alias for nonLeadingQuestions */
  inquiryQuestions: string[];
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
  sourceType: SourceType | FindingSourceType;
  /** Foreign key or reference to hypothesis or assumption ID */
  relatedHypothesis?: string;
  /** Context notes, environment, or participant background */
  context?: string;
  /** ISO 8601 recording timestamp */
  timestamp?: string;

  // Backward-compatibility aliases
  relatedAssumptionId?: string;
  contextNotes?: string;
  isCredibleObservation: boolean;
  createdAt: string;
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
export type CanonicalVerdictCategory = (typeof VERDICT_CATEGORIES)[number];

/** Backward-compatibility alias for legacy underscore categories */
export type LegacyVerdictCategory =
  | 'INSUFFICIENT_EVIDENCE'
  | 'REVISE_THE_HYPOTHESIS'
  | 'EVIDENCE_SUPPORTS_FURTHER_TESTING';

export type VerdictCategory = CanonicalVerdictCategory | LegacyVerdictCategory;

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
  category?: VerdictCategory;
  recommendedNextExperiment?: string;
  assumptionStatusUpdates?: Array<{
    id: string;
    newStatus: AssumptionStatus;
    reason: string;
  }>;
}

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

  // Extended compatibility fields
  verdict?: VerdictCategory;
  recommendedNextSteps?: string[];
}

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
  analyzedProblemHash: string | null;
  isDemo: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study' | null;
  lastUpdated: string;

  // Backward-compatibility aliases for existing prototype store and domain tests
  id?: string;
  stage?: Stage;
  lastAnalyzedProblem?: ProblemInput;
  isProblemStale?: boolean;
  alternativeExperiment?: ValidationExperiment | null;
  ledger?: LedgerEntry[];
  verdict?: Verdict | null;
  isDemoMode?: boolean;
  demoScenarioId?: 'A' | 'B' | 'vague_study' | 'contradictory_study' | null;
  updatedAt?: string;
  highestCompletedStage?: Stage;
  highestUnlockedStage?: Stage;
  version?: number;
}

/** Legacy state contract for prototype modules and existing tests */
export interface CaseState {
  id: string;
  stage: WorkflowStage;
  problem: ProblemInput;
  lastAnalyzedProblem?: ProblemInput;
  isProblemStale: boolean;
  analysis: AnalysisResult | null;
  experiment: ValidationExperiment | null;
  alternativeExperiment?: ValidationExperiment | null;
  findings: Finding[];
  ledger: LedgerEntry[];
  verdict: Verdict | null;
  isDemoMode: boolean;
  demoScenarioId?: 'vague_study' | 'contradictory_study';
  updatedAt: string;

  // Dual compatibility fields so CaseState can be passed where ValidationState is used
  currentStage?: Stage;
  decisionBrief?: DecisionBrief | null;
  isDirty?: boolean;
  analyzedProblemHash?: string | null;
  isDemo?: boolean;
  demoScenario?: 'A' | 'B' | 'vague_study' | 'contradictory_study' | null;
  lastUpdated?: string;
  highestCompletedStage?: Stage;
  highestUnlockedStage?: Stage;
  version?: number;
}

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
  if (typeof val !== 'string') return false;
  return (
    (VERDICT_CATEGORIES as readonly string[]).includes(val) ||
    val === 'INSUFFICIENT_EVIDENCE' ||
    val === 'REVISE_THE_HYPOTHESIS' ||
    val === 'EVIDENCE_SUPPORTS_FURTHER_TESTING'
  );
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
export function normalizeVerdictCategory(category: string): CanonicalVerdictCategory {
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
