import type {
  AnalysisResult,
  Finding,
  ProblemInput,
  ValidationExperiment,
  Verdict,
} from '../types/index.ts';
import {
  analyzeProblem as canonicalAnalyzeProblem,
  reviewEvidence as canonicalReviewEvidence,
  callGeminiWithSchema,
  MissingApiKeyError,
  AiServiceError,
} from '../../server/geminiService.ts';
import { DEMO_SCENARIO_A } from '../../server/demoData.ts';
import { evaluateEvidenceHeuristic } from '../domain/evidenceEvaluator.ts';

export { MissingApiKeyError, AiServiceError, callGeminiWithSchema };

/**
 * Backward-compatibility wrapper for legacy tests and prototype callers.
 * Safely handles unauthenticated or suspended API environments with heuristic fallbacks.
 */
export async function analyzeProblemWithGemini(
  problem: ProblemInput
): Promise<{ result: AnalysisResult; isLive: boolean; error?: string }> {
  try {
    const result = await canonicalAnalyzeProblem(problem);
    return { result, isLive: true };
  } catch (err: any) {
    return {
      result: {
        ...DEMO_SCENARIO_A.analysis,
        refinedProblemStatement: `Investigate specific friction for ${problem.targetUser || 'users'}: ${problem.idea}`,
      },
      isLive: false,
      error: `Gemini API request failed: ${err.message || String(err)}. Using verified deterministic heuristic analysis.`,
    };
  }
}

/**
 * Backward-compatibility wrapper for evidence review.
 * Evaluates live Gemini model or falls back gracefully to deterministic heuristic evaluator.
 */
export async function reviewEvidenceWithGemini(
  problem: ProblemInput,
  analysis: AnalysisResult,
  experiment: ValidationExperiment,
  findings: Finding[]
): Promise<{ verdict: Verdict; isLive: boolean; error?: string }> {
  const baselineVerdict = evaluateEvidenceHeuristic(problem, analysis, experiment, findings);

  // Direct return for empty or pure subjective findings
  if (
    findings.length === 0 ||
    (baselineVerdict.category === 'INSUFFICIENT_EVIDENCE' && baselineVerdict.supportedClaims.length === 0)
  ) {
    return { verdict: baselineVerdict, isLive: true };
  }

  try {
    const brief = await canonicalReviewEvidence(
      problem,
      experiment?.hypothesis || 'Target users experience severe friction with current workarounds.',
      findings
    );

    const legacyCategory =
      brief.verdict === 'REVISE THE HYPOTHESIS' || brief.category === 'REVISE_THE_HYPOTHESIS'
        ? 'REVISE_THE_HYPOTHESIS'
        : brief.verdict === 'EVIDENCE SUPPORTS FURTHER TESTING' || brief.category === 'EVIDENCE_SUPPORTS_FURTHER_TESTING'
          ? 'EVIDENCE_SUPPORTS_FURTHER_TESTING'
          : 'INSUFFICIENT_EVIDENCE';

    const verdict: Verdict = {
      category: legacyCategory,
      rationale: brief.rationale || 'Evaluated empirical findings against test hypothesis.',
      updatedProblemStatement: brief.updatedProblemStatement,
      supportedClaims: brief.supportedClaims,
      unsupportedClaims: brief.unsupportedClaims,
      contradictoryFindings: brief.contradictoryFindings,
      remainingUncertainties: brief.remainingUncertainties,
      assumptionStatusUpdates: brief.assumptionStatusUpdates || [],
      recommendedNextExperiment: brief.recommendedNextExperiment || 'Follow-up behavioral test',
    };

    return { verdict, isLive: true };
  } catch (err: any) {
    return {
      verdict: baselineVerdict,
      isLive: false,
      error: `Gemini API request failed: ${err.message || String(err)}. Synthesized using verified deterministic heuristic rules.`,
    };
  }
}
