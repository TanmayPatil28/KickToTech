import { GoogleGenAI, Type } from '@google/genai';
import type {
  AnalysisResult,
  Assumption,
  Finding,
  ProblemInput,
  ValidationExperiment,
  Verdict,
} from '../types/index.ts';
import { evaluateEvidenceHeuristic } from '../domain/evidenceEvaluator.ts';
import { DEMO_SCENARIO_A } from '../domain/demoData.ts';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

function getAIClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

const ANALYSIS_SCHEMA = {
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
          id: { type: Type.STRING },
          claim: { type: Type.STRING },
          reason: { type: Type.STRING },
          risk: { type: Type.STRING, description: '"high", "medium", or "low"' },
          status: { type: Type.STRING, description: '"unverified", "partially_supported", or "supported"' },
          evidenceNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
          nextAction: { type: Type.STRING },
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

const VERDICT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: 'Strictly one of: "INSUFFICIENT_EVIDENCE", "REVISE_THE_HYPOTHESIS", or "EVIDENCE_SUPPORTS_FURTHER_TESTING"',
    },
    rationale: { type: Type.STRING },
    updatedProblemStatement: { type: Type.STRING },
    supportedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
    unsupportedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
    contradictoryFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
    remainingUncertainties: { type: Type.ARRAY, items: { type: Type.STRING } },
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
    recommendedNextExperiment: { type: Type.STRING },
  },
  required: [
    'category',
    'rationale',
    'updatedProblemStatement',
    'supportedClaims',
    'unsupportedClaims',
    'contradictoryFindings',
    'remainingUncertainties',
    'assumptionStatusUpdates',
    'recommendedNextExperiment',
  ],
};

export async function analyzeProblemWithGemini(
  problem: ProblemInput
): Promise<{ result: AnalysisResult; isLive: boolean; error?: string }> {
  const client = getAIClient();
  if (!client) {
    return {
      result: DEMO_SCENARIO_A.analysis!,
      isLive: false,
      error: 'GEMINI_API_KEY environment variable is not configured. Falling back to deterministic analysis.',
    };
  }

  const prompt = `You are ProblemPilot, a rigorous, skeptical product validation analyst for engineers and innovators.
Your job is NOT to cheerlead, nor to be sarcastic. You must challenge unverified assumptions, identify ambiguity, and distinguish enthusiasm from empirical evidence.

Analyze this problem proposal:
- Proposed Idea: "${problem.idea}"
- Target User: "${problem.targetUser}"
- Context: "${problem.context || 'Not specified'}"
- Current Evidence: "${problem.existingEvidence || 'None provided'}"
- Constraints: "${problem.constraints || 'None specified'}"

Rules:
1. If the idea is broad, solution-focused, or lacks an identified friction point (e.g., "An AI app for students"), label problemClarity.status as "vague" or "incomplete" and enumerate exact missing details.
2. Formulate 3-5 distinct, falsifiable unverified assumptions with unique IDs (ASM-1, ASM-2, etc.).
3. Identify existing workarounds (e.g. spreadsheets, paper, habits) and questions about why they fail.
4. Distinguish problem severity from evidence strength. Current evidence must be labeled "unverified" unless concrete historical data was provided.
5. Return strictly valid JSON conforming to the schema.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: ANALYSIS_SCHEMA as any,
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new Error('Empty response received from Gemini API');
    }

    const parsed = JSON.parse(response.text) as AnalysisResult;
    // Boundary verification
    if (!parsed.problemClarity || !Array.isArray(parsed.assumptions)) {
      throw new Error('Malformed schema returned by model');
    }

    return { result: parsed, isLive: true };
  } catch (err: any) {
    console.error('Gemini analyze call error:', err);
    // Bounded fallback to heuristic/demo scenario
    return {
      result: {
        ...DEMO_SCENARIO_A.analysis!,
        refinedProblemStatement: `Investigate specific friction for ${problem.targetUser || 'users'}: ${problem.idea}`,
      },
      isLive: false,
      error: `Gemini API request failed: ${err.message || String(err)}. Using verified deterministic heuristic analysis.`,
    };
  }
}

export async function reviewEvidenceWithGemini(
  problem: ProblemInput,
  analysis: AnalysisResult,
  experiment: ValidationExperiment,
  findings: Finding[]
): Promise<{ verdict: Verdict; isLive: boolean; error?: string }> {
  // First, calculate the grounded heuristic verdict
  const baselineVerdict = evaluateEvidenceHeuristic(problem, analysis, experiment, findings);

  const client = getAIClient();
  if (!client) {
    return {
      verdict: baselineVerdict,
      isLive: false,
      error: 'GEMINI_API_KEY environment variable is not configured. Evaluated using local heuristic rules.',
    };
  }

  // If findings are empty or pure subjective praise, heuristic handles it strictly per Directive §5
  if (findings.length === 0 || baselineVerdict.category === 'INSUFFICIENT_EVIDENCE' && baselineVerdict.supportedClaims.length === 0) {
    return { verdict: baselineVerdict, isLive: true };
  }

  const prompt = `You are ProblemPilot, reviewing empirical findings from a validation experiment.
Problem: "${problem.idea}"
Target User: "${problem.targetUser}"
Experiment: "${experiment.title}" (Hypothesis: "${experiment.hypothesis}")

Submitted User Findings (${findings.length} entries):
${findings
  .map(
    (f, i) =>
      `${i + 1}. [${f.sourceType}] ${f.description} (Related Assumption: ${f.relatedAssumptionId || 'None'})`
  )
  .join('\n')}

Assumptions to check:
${analysis.assumptions.map((a: Assumption) => `- [${a.id}] ${a.claim} (Current status: ${a.status})`).join('\n')}

Strict Evaluation Rules:
1. Category MUST be strictly one of:
   - "INSUFFICIENT_EVIDENCE" (findings lack behavioral facts or sample is too small/unrelated)
   - "REVISE_THE_HYPOTHESIS" (findings show users do not feel the friction or existing workarounds are satisfactory)
   - "EVIDENCE_SUPPORTS_FURTHER_TESTING" (credible past behavioral struggle was observed in multiple instances)
2. NEVER use "PROVEN" or "GUARANTEED MARKET DEMAND". The highest rating is strictly "EVIDENCE_SUPPORTS_FURTHER_TESTING".
3. Empty findings or pure subjective feedback ("everyone loves this") MUST be "INSUFFICIENT_EVIDENCE".
4. A single contradiction should be evaluated with nuance—explain if it narrows the hypothesis or invalidates it.
5. Return strictly valid JSON conforming to the schema.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: VERDICT_SCHEMA as any,
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(response.text) as Verdict;
    // Guardrail: Ensure category is strictly allowed
    const validCategories = [
      'INSUFFICIENT_EVIDENCE',
      'REVISE_THE_HYPOTHESIS',
      'EVIDENCE_SUPPORTS_FURTHER_TESTING',
    ];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = baselineVerdict.category;
    }

    return { verdict: parsed, isLive: true };
  } catch (err: any) {
    console.error('Gemini review call error:', err);
    return {
      verdict: baselineVerdict,
      isLive: false,
      error: `Gemini API request failed: ${err.message || String(err)}. Synthesized using verified deterministic heuristic rules.`,
    };
  }
}
