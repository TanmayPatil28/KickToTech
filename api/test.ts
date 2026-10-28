import {
  generateValidationExperiment,
  MissingApiKeyError,
  sanitizeErrorMessage,
} from '../server/geminiService.ts';
import { getDemoScenario } from '../server/demoData.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { problem, analysis, assumptions, isDemo, demoScenario } = body;

    if (!analysis && (!assumptions || !Array.isArray(assumptions))) {
      return res.status(400).json({
        success: false,
        error: 'Analysis is required to generate or validate experiment.',
        code: 'INVALID_INPUT',
      });
    }

    if (isDemo) {
      const demo = getDemoScenario(demoScenario);
      return res.status(200).json({
        success: true,
        data: {
          ...demo.experiment,
          primary: demo.experiment,
        },
        isDemo: true,
        isLive: false,
      });
    }

    const effectiveAssumptions = analysis?.assumptions || assumptions || [];
    const experiment = await generateValidationExperiment(problem, effectiveAssumptions);
    return res.status(200).json({
      success: true,
      data: {
        ...experiment,
        primary: experiment,
      },
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
