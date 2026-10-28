import {
  reviewEvidence,
  MissingApiKeyError,
  sanitizeErrorMessage,
} from '../server/geminiService.ts';
import { DEMO_SCENARIO_A } from '../server/demoData.ts';
import { evaluateEvidenceHeuristic } from '../src/domain/evidenceEvaluator.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { problem, analysis, experiment, hypothesis, findings, isDemo } = body;

    if (!findings || !Array.isArray(findings)) {
      return res.status(400).json({
        success: false,
        error: 'Findings array is required to synthesize evidence.',
        code: 'INVALID_INPUT',
      });
    }

    if (isDemo) {
      const heuristicVerdict = evaluateEvidenceHeuristic(
        problem || DEMO_SCENARIO_A.problem,
        analysis || DEMO_SCENARIO_A.analysis,
        experiment || DEMO_SCENARIO_A.experiment,
        findings
      );
      const canonicalVerdict =
        heuristicVerdict.category === 'REVISE_THE_HYPOTHESIS'
          ? 'REVISE THE HYPOTHESIS'
          : heuristicVerdict.category === 'EVIDENCE_SUPPORTS_FURTHER_TESTING'
            ? 'EVIDENCE SUPPORTS FURTHER TESTING'
            : 'INSUFFICIENT EVIDENCE';

      return res.status(200).json({
        success: true,
        data: {
          ...heuristicVerdict,
          verdict: canonicalVerdict,
          category: heuristicVerdict.category,
        },
        isDemo: true,
        isLive: false,
      });
    }

    const effectiveHypothesis = hypothesis || experiment?.hypothesis || problem?.idea;
    const brief = await reviewEvidence(problem, analysis, findings, effectiveHypothesis);
    return res.status(200).json({
      success: true,
      data: brief,
      isLive: true,
    });
  } catch (err: any) {
    if (err instanceof MissingApiKeyError || err.code === 'MISSING_API_KEY') {
      return res.status(401).json({
        success: false,
        error: sanitizeErrorMessage(err.message),
        code: 'MISSING_API_KEY',
      });
    }
    return res.status(502).json({
      success: false,
      error: sanitizeErrorMessage(err.message || 'AI service error'),
      code: 'AI_SERVICE_ERROR',
    });
  }
}
