import {
  analyzeProblem,
  MissingApiKeyError,
  AiServiceError,
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
    const { problem, isDemo, demoScenario } = body;

    if (!problem || !problem.idea || typeof problem.idea !== 'string' || problem.idea.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Problem proposal must contain at least 5 characters.',
        code: 'INVALID_INPUT',
      });
    }

    if (isDemo) {
      const demo = getDemoScenario(demoScenario);
      return res.status(200).json({
        success: true,
        data: demo.analysis,
        isDemo: true,
        isLive: false,
      });
    }

    const result = await analyzeProblem(problem);
    return res.status(200).json({
      success: true,
      data: result,
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
