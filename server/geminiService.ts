import { GoogleGenAI, Type } from '@google/genai';
import type {
  AnalysisResult,
  Assumption,
  DecisionBrief,
  Finding,
  ProblemInput,
  ValidationExperiment,
  VerdictCategory,
} from '../src/types/index.ts';
import { evaluateEvidenceHeuristic } from '../src/domain/evidenceEvaluator.ts';
import { DEMO_SCENARIO_A } from './demoData.ts';

// ============================================================================
// Error Definitions
// ============================================================================

export class MissingApiKeyError extends Error {
  code = 'MISSING_API_KEY';
  statusCode = 401;
  constructor(message = 'GEMINI_API_KEY is not configured on the server.') {
    super(message);
    this.name = 'MissingApiKeyError';
  }
}

export class AiServiceError extends Error {
  code = 'AI_SERVICE_ERROR';
  statusCode = 502;
  constructor(message = 'AI service failed or returned invalid response.') {
    super(message);
    this.name = 'AiServiceError';
  }
}

// ============================================================================
// JSON Schemas
// ============================================================================

export const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    problemClarity: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, description: 'Must be one of: "clear", "incomplete", or "vague"' },
        explanation: { type: Type.STRING },
        missingDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['status', 'explanation', 'missingDetails'],
    },
    refinedProblemStatement: { type: Type.STRING },
    targetUserAmbiguity: { type: Type.STRING },
    assumptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'e.g. ASM-1, ASM-2' },
          claim: { type: Type.STRING },
          reason: { type: Type.STRING },
          whyItMatters: { type: Type.STRING },
          risk: { type: Type.STRING, description: '"high", "medium", or "low"' },
          riskLevel: { type: Type.STRING, description: '"high", "medium", or "low"' },
          status: { type: Type.STRING, description: '"unverified", "partially_supported", or "supported"' },
          evidenceNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
          nextAction: { type: Type.STRING },
          recommendedNextAction: { type: Type.STRING },
        },
        required: ['id', 'claim', 'reason', 'risk', 'status', 'evidenceNeeded', 'nextAction'],
      },
    },
    evidenceGaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          importance: { type: Type.STRING, description: '"high", "medium", or "low"' },
          howToInvestigate: { type: Type.STRING },
        },
        required: ['description', 'importance', 'howToInvestigate'],
      },
    },
    alternativeExplanations: { type: Type.ARRAY, items: { type: Type.STRING } },
    existingWorkarounds: { type: Type.ARRAY, items: { type: Type.STRING } },
    highestRiskUncertainty: { type: Type.STRING },
    suggestedValidationObjective: { type: Type.STRING },
  },
  required: [
    'problemClarity',
    'refinedProblemStatement',
    'targetUserAmbiguity',
    'assumptions',
    'evidenceGaps',
    'alternativeExplanations',
    'existingWorkarounds',
    'highestRiskUncertainty',
    'suggestedValidationObjective',
  ],
};

export const EXPERIMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    objective: { type: Type.STRING },
    hypothesis: { type: Type.STRING },
    targetParticipants: { type: Type.STRING },
    method: { type: Type.STRING },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    inquiryQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    nonLeadingQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    evidenceToRecord: { type: Type.ARRAY, items: { type: Type.STRING } },
    supportingSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
    weakeningSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
    limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimatedEffort: { type: Type.STRING },
  },
  required: [
    'hypothesis',
    'steps',
    'inquiryQuestions',
    'evidenceToRecord',
    'supportingSignals',
    'weakeningSignals',
    'limitations',
    'estimatedEffort',
  ],
};

export const DECISION_BRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    verdict: {
      type: Type.STRING,
      description:
        'Strictly one of: "INSUFFICIENT EVIDENCE", "REVISE THE HYPOTHESIS", or "EVIDENCE SUPPORTS FURTHER TESTING"',
    },
    updatedProblemStatement: { type: Type.STRING },
    supportedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
    unsupportedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
    contradictoryFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
    remainingUncertainties: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
    rationale: { type: Type.STRING },
    recommendedNextExperiment: { type: Type.STRING },
    assumptionStatusUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          newStatus: { type: Type.STRING, description: '"unverified", "partially_supported", or "supported"' },
          reason: { type: Type.STRING },
        },
        required: ['id', 'newStatus', 'reason'],
      },
    },
  },
  required: [
    'verdict',
    'updatedProblemStatement',
    'supportedClaims',
    'unsupportedClaims',
    'contradictoryFindings',
    'remainingUncertainties',
    'recommendedNextSteps',
  ],
};

// ============================================================================
// Validators
// ============================================================================

export function validateAnalysis(data: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }
  if (!data.problemClarity || !['clear', 'incomplete', 'vague'].includes(data.problemClarity.status)) {
    errors.push('problemClarity.status must be clear, incomplete, or vague');
  }
  if (!Array.isArray(data.assumptions) || data.assumptions.length === 0) {
    errors.push('assumptions must be a non-empty array');
  } else {
    for (const asm of data.assumptions) {
      if (!asm.id || !asm.claim || !asm.risk || !asm.status) {
        errors.push(`Assumption missing required fields: ${JSON.stringify(asm)}`);
      }
    }
  }
  if (!data.refinedProblemStatement) errors.push('refinedProblemStatement is required');
  if (!Array.isArray(data.evidenceGaps)) errors.push('evidenceGaps must be an array');
  return { valid: errors.length === 0, errors };
}

export function validateExperiment(data: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }
  if (!data.hypothesis || typeof data.hypothesis !== 'string') errors.push('hypothesis is required');
  const questions = data.inquiryQuestions || data.nonLeadingQuestions;
  if (!Array.isArray(questions) || questions.length < 1) {
    errors.push('inquiryQuestions must contain at least 1 question');
  }
  if (!Array.isArray(data.supportingSignals) || data.supportingSignals.length === 0) {
    errors.push('supportingSignals must be a non-empty array');
  }
  if (!Array.isArray(data.weakeningSignals) || data.weakeningSignals.length === 0) {
    errors.push('weakeningSignals must be a non-empty array');
  }
  if (!data.estimatedEffort) errors.push('estimatedEffort is required');
  return { valid: errors.length === 0, errors };
}

export function validateDecisionBrief(data: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }
  const cleanVerdict = (data.verdict || data.category || '').toString().replace(/_/g, ' ').trim().toUpperCase();
  const allowed = [
    'INSUFFICIENT EVIDENCE',
    'REVISE THE HYPOTHESIS',
    'EVIDENCE SUPPORTS FURTHER TESTING',
  ];
  if (!allowed.includes(cleanVerdict)) {
    errors.push(`Verdict '${cleanVerdict}' is not one of the allowed 3 categories.`);
  }

  // Strict epistemic prohibitions
  const textPayload = JSON.stringify(data).toUpperCase();
  if (textPayload.includes('"PROVEN"') || textPayload.includes('GUARANTEED MARKET DEMAND')) {
    errors.push('Response contains strictly forbidden claims: PROVEN or GUARANTEED MARKET DEMAND');
  }

  if (!Array.isArray(data.unsupportedClaims)) errors.push('unsupportedClaims must be an array');
  if (!Array.isArray(data.contradictoryFindings)) errors.push('contradictoryFindings must be an array');
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Core SDK Caller with Bounded 2-Retry Policy
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
}

import fs from 'node:fs';
import path from 'node:path';

function getApiKey(): string | undefined {
  if (process.env.NODE_ENV === 'test') {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    return process.env.GEMINI_API_KEY;
  }
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^GEMINI_API_KEY\s*=\s*([^\r\n]+)/m);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {}
  return process.env.GOOGLE_API_KEY;
}

function getModel(): string {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^GEMINI_MODEL\s*=\s*([^\r\n]+)/m);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {}
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash';
}

export async function callGeminiWithSchema<T>(
  prompt: string,
  schema: any,
  validator: (data: unknown) => { valid: boolean; errors?: string[] },
  options: RetryOptions = {}
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.trim().length === 0) {
    throw new MissingApiKeyError('GEMINI_API_KEY is not configured on the server.');
  }

  const maxRetries = options.maxRetries ?? 2;
  const timeoutMs = options.timeoutMs ?? 25000;
  const ai = new GoogleGenAI({ apiKey });

  let lastError: Error | null = null;
  let currentPrompt = prompt;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = getModel();
      const generatePromise = ai.models.generateContent({
        model,
        contents: currentPrompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          temperature: 0.2,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new AiServiceError(`Gemini API request timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
        if (typeof timer.unref === 'function') timer.unref();
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      if (!response.text || response.text.trim().length === 0) {
        throw new Error('Gemini API returned an empty text response.');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.text);
      } catch (parseErr: any) {
        throw new Error(`Unparseable JSON returned by AI: ${parseErr.message}`);
      }

      const validation = validator(parsed);
      if (!validation.valid) {
        const errorDetails = (validation.errors || []).join('; ');
        throw new Error(`Schema validation failed: ${errorDetails}`);
      }

      return parsed as T;
    } catch (err: any) {
      lastError = err;

      // Unrecoverable authorization/suspension errors should fail fast without wasting retries
      if (
        err.status === 403 ||
        err.statusCode === 403 ||
        err.message?.includes('PERMISSION_DENIED') ||
        err.message?.includes('suspended')
      ) {
        throw new AiServiceError(`Gemini API authorization error: ${err.message || String(err)}`);
      }

      // If attempts remain, append clarifying correction
      if (attempt < maxRetries) {
        currentPrompt = `${prompt}\n\n[RETRY ATTEMPT ${attempt + 1}/${maxRetries}]: Previous output had issues: ${err.message}. Strictly return valid JSON conforming to the schema.`;
      }
    }
  }

  throw new AiServiceError(
    `AI service failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`
  );
}

// ============================================================================
// Endpoint AI Operations
// ============================================================================

export async function analyzeProblem(problem: ProblemInput): Promise<AnalysisResult> {
  const prompt = `You are ProblemPilot, a disciplined analytical problem validation service for engineers and startup founders.
Analyze the following problem proposal with skepticism, challenging unverified assumptions and distinguishing user enthusiasm from behavioral facts:

- Idea: "${problem.idea}"
- Target User: "${problem.targetUser}"
- Operational Context: "${problem.context || 'Not specified'}"
- Existing Observations/Evidence: "${problem.existingObservations || problem.existingEvidence || 'None provided'}"
- Constraints: "${problem.constraints || 'None specified'}"

Instructions:
1. Assess problem clarity as "clear", "incomplete", or "vague". Identify missing details if incomplete/vague.
2. Produce 3-5 distinct, falsifiable unverified assumptions with deterministic IDs (ASM-1, ASM-2, etc.).
3. Identify existing workarounds (e.g. spreadsheets, manual paper, TA office hours, habit).
4. Identify critical evidence gaps.
5. Return strictly valid JSON conforming to the schema.`;

  const result = await callGeminiWithSchema<AnalysisResult>(
    prompt,
    ANALYSIS_SCHEMA,
    validateAnalysis,
    { maxRetries: 2 }
  );

  // Normalize assumption backward-compatibility aliases
  result.assumptions = result.assumptions.map((asm, idx) => ({
    ...asm,
    id: asm.id || `ASM-${idx + 1}`,
    reason: asm.reason || asm.whyItMatters || 'Viability impact if false.',
    whyItMatters: asm.whyItMatters || asm.reason || 'Viability impact if false.',
    risk: asm.risk || asm.riskLevel || 'high',
    riskLevel: asm.riskLevel || asm.risk || 'high',
    status: asm.status || 'unverified',
    nextAction: asm.nextAction || asm.recommendedNextAction || 'Conduct behavioral interview.',
    recommendedNextAction: asm.recommendedNextAction || asm.nextAction || 'Conduct behavioral interview.',
  }));

  return result;
}

export async function generateValidationExperiment(
  problem: ProblemInput,
  assumptions: Assumption[] = []
): Promise<ValidationExperiment> {
  const topAssumption = assumptions[0]?.claim || 'Target users experience severe friction with current workarounds.';
  const prompt = `You are ProblemPilot. Design an actionable, small, practical validation experiment to test the core assumption of this problem:

- Problem: "${problem.idea}"
- Target User: "${problem.targetUser}"
- Operational Context: "${problem.context || 'Not specified'}"
- Primary Assumption to Test: "${topAssumption}"

Requirements:
1. Strictly non-leading, past-behavior inquiry questions (e.g. "Tell me about the last time you..."). NO hypothetical pitches or "Would you buy" questions.
2. Objective supporting and weakening signals.
3. Explicit epistemic limitations (what this small test cannot prove).
4. Estimated effort (e.g. "1.5 hours: 5 interviews × 15 min + synthesis").
5. Return strictly valid JSON conforming to the schema.`;

  const result = await callGeminiWithSchema<ValidationExperiment>(
    prompt,
    EXPERIMENT_SCHEMA,
    validateExperiment,
    { maxRetries: 2 }
  );

  result.id = result.id || 'EXP-1';
  result.title = result.title || 'Targeted Past-Behavior Inquiry';
  result.inquiryQuestions = result.inquiryQuestions || result.nonLeadingQuestions || [];
  result.nonLeadingQuestions = result.nonLeadingQuestions || result.inquiryQuestions || [];

  return result;
}

export async function reviewEvidence(
  problem: ProblemInput,
  hypothesis: string,
  findings: Finding[]
): Promise<DecisionBrief> {
  // If findings are empty, evaluate strictly per heuristic rules
  if (!findings || findings.length === 0) {
    const brief = evaluateEvidenceHeuristic(
      problem,
      DEMO_SCENARIO_A.analysis,
      DEMO_SCENARIO_A.experiment,
      []
    );
    return {
      verdict: 'INSUFFICIENT EVIDENCE',
      category: 'INSUFFICIENT_EVIDENCE',
      updatedProblemStatement: brief.updatedProblemStatement,
      supportedClaims: brief.supportedClaims,
      unsupportedClaims: brief.unsupportedClaims,
      contradictoryFindings: brief.contradictoryFindings,
      remainingUncertainties: brief.remainingUncertainties,
      recommendedNextSteps: ['Collect initial behavioral observations before evaluating.'],
      rationale: brief.rationale,
      recommendedNextExperiment: brief.recommendedNextExperiment,
      assumptionStatusUpdates: brief.assumptionStatusUpdates,
    };
  }

  const prompt = `You are ProblemPilot, issuing a grounded decision brief on empirical findings from a validation experiment.

Problem Formulation: "${problem.idea}"
Target User Cohort: "${problem.targetUser}"
Hypothesis Tested: "${hypothesis}"

Submitted Findings (${findings.length} entries):
${findings
  .map(
    (f, i) =>
      `${i + 1}. [${f.sourceType}] ${f.description} (Related: ${f.relatedHypothesis || f.relatedAssumptionId || 'None'})`
  )
  .join('\n')}

Strict Rules:
1. Verdict MUST be strictly one of:
   - "INSUFFICIENT EVIDENCE" (if findings are pure subjective praise, sample is too small, or lacks behavioral facts)
   - "REVISE THE HYPOTHESIS" (if findings reveal existing workarounds work well or users do not care)
   - "EVIDENCE SUPPORTS FURTHER TESTING" (if multiple credible direct behavioral observations support friction)
2. NEVER use "PROVEN" or "GUARANTEED MARKET DEMAND". Maximum permissible endorsement is "EVIDENCE SUPPORTS FURTHER TESTING".
3. Return strictly valid JSON conforming to the schema.`;

  const result = await callGeminiWithSchema<DecisionBrief>(
    prompt,
    DECISION_BRIEF_SCHEMA,
    validateDecisionBrief,
    { maxRetries: 2 }
  );

  // Normalize verdict strings
  const clean = (result.verdict || result.category || 'INSUFFICIENT EVIDENCE')
    .toString()
    .replace(/_/g, ' ')
    .trim()
    .toUpperCase() as VerdictCategory;

  let canonical: VerdictCategory = 'INSUFFICIENT EVIDENCE';
  let legacyCategory = 'INSUFFICIENT_EVIDENCE';

  if (clean === 'REVISE THE HYPOTHESIS' || clean === 'REVISE_THE_HYPOTHESIS') {
    canonical = 'REVISE THE HYPOTHESIS';
    legacyCategory = 'REVISE_THE_HYPOTHESIS';
  } else if (
    clean === 'EVIDENCE SUPPORTS FURTHER TESTING' ||
    clean === 'EVIDENCE_SUPPORTS_FURTHER_TESTING'
  ) {
    canonical = 'EVIDENCE SUPPORTS FURTHER TESTING';
    legacyCategory = 'EVIDENCE_SUPPORTS_FURTHER_TESTING';
  }

  result.verdict = canonical;
  result.category = legacyCategory as any;
  result.rationale = result.rationale || 'Evaluated empirical findings against test hypothesis.';

  return result;
}
