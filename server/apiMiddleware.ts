import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import {
  analyzeProblem,
  generateValidationExperiment,
  reviewEvidence,
  MissingApiKeyError,
  AiServiceError,
  sanitizeErrorMessage,
} from './geminiService.ts';
import {
  getDemoScenario,
  DEMO_SCENARIO_A,
} from './demoData.ts';
import { evaluateEvidenceHeuristic } from '../src/domain/evidenceEvaluator.ts';


export interface ApiMiddlewareOptions {
  fallbackOnError?: boolean;
}

function parseJsonBody<T = any>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 512 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : ({} as T));
      } catch {
        reject(new Error('Malformed JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function createApiMiddleware(options: ApiMiddlewareOptions = {}) {
  const fallbackOnError = options.fallbackOnError ?? false;

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split('?')[0];

    if (req.method !== 'POST' || !url?.startsWith('/api/')) {
      return next();
    }

    try {
      if (url === '/api/analyze') {
        const body = await parseJsonBody(req);
        const { problem, isDemo, demoScenario } = body;

        if (!problem || !problem.idea || typeof problem.idea !== 'string' || problem.idea.trim().length < 5) {
          return sendJson(res, 400, {
            success: false,
            error: 'Problem proposal must contain at least 5 characters.',
            code: 'INVALID_INPUT',
          });
        }

        if (isDemo) {
          const demo = getDemoScenario(demoScenario);
          return sendJson(res, 200, {
            success: true,
            data: demo.analysis,
            isDemo: true,
            isLive: false,
          });
        }

        try {
          const result = await analyzeProblem(problem);
          return sendJson(res, 200, {
            success: true,
            data: result,
            isLive: true,
          });
        } catch (err: any) {
          if (fallbackOnError) {
            const demo = DEMO_SCENARIO_A;
            return sendJson(res, 200, {
              success: true,
              data: {
                ...demo.analysis,
                refinedProblemStatement: `Investigate specific friction for ${problem.targetUser || 'users'}: ${problem.idea}`,
              },
              isLive: false,
              error: err.message,
            });
          }

          if (err instanceof MissingApiKeyError || err.code === 'MISSING_API_KEY') {
            return sendJson(res, 401, {
              success: false,
              error: sanitizeErrorMessage(err.message),
              code: 'MISSING_API_KEY',
            });
          }
          if (err instanceof AiServiceError || err.code === 'AI_SERVICE_ERROR') {
            return sendJson(res, 502, {
              success: false,
              error: sanitizeErrorMessage(err.message),
              code: 'AI_SERVICE_ERROR',
            });
          }
          return sendJson(res, 502, {
            success: false,
            error: sanitizeErrorMessage(err.message || 'AI service error'),
            code: 'AI_SERVICE_ERROR',
          });
        }
      }

      if (url === '/api/test') {
        const body = await parseJsonBody(req);
        const { problem, analysis, assumptions, isDemo, demoScenario } = body;

        if (!analysis && (!assumptions || !Array.isArray(assumptions))) {
          return sendJson(res, 400, {
            success: false,
            error: 'Analysis is required to generate or validate experiment.',
            code: 'INVALID_INPUT',
          });
        }

        if (isDemo) {
          const demo = getDemoScenario(demoScenario);
          return sendJson(res, 200, {
            success: true,
            data: {
              ...demo.experiment,
              primary: demo.experiment,
            },
            isDemo: true,
            isLive: false,
          });
        }

        try {
          const effectiveAssumptions = analysis?.assumptions || assumptions || [];
          const experiment = await generateValidationExperiment(problem, effectiveAssumptions);
          return sendJson(res, 200, {
            success: true,
            data: {
              ...experiment,
              primary: experiment,
            },
            isLive: true,
          });
        } catch (err: any) {
          if (fallbackOnError) {
            const exp = {
              id: 'EXP-1',
              title: analysis?.suggestedValidationObjective || 'Targeted Past-Behavior Inquiry',
              objective: analysis?.suggestedValidationObjective,
              hypothesis: analysis?.assumptions?.[0]?.claim || 'Target users experience severe friction with current workarounds.',
              targetParticipants: problem?.targetUser || '5 relevant individuals',
              method: 'Past-behavior retrospective inquiry (strictly non-leading)',
              steps: [
                'Identify participants matching target profile who recently encountered the situation.',
                'Ask them to reconstruct their most recent real experience without pitching the idea.',
                'Record the specific workarounds and tools used.',
                'Note where they encountered friction and what they did to resolve it.',
              ],
              inquiryQuestions: [
                'Tell me about the last time you experienced this. What was the exact situation?',
                'What tool, workaround, or manual process did you use?',
                'What was the most difficult or frustrating part of that process?',
                'How did you resolve it at that moment?',
              ],
              nonLeadingQuestions: [
                'Tell me about the last time you experienced this. What was the exact situation?',
                'What tool, workaround, or manual process did you use?',
                'What was the most difficult or frustrating part of that process?',
                'How did you resolve it at that moment?',
              ],
              evidenceToRecord: [
                'Specific tools used and abandoned.',
                'Time lost or cost incurred.',
                'Verbatim statements of frustration or satisfaction.',
              ],
              supportingSignals: [
                'User reports spending substantial time/money on an imperfect workaround.',
                'User spontaneously describes severe difficulty without prompting.',
              ],
              weakeningSignals: [
                'User reports existing tools (e.g. spreadsheets, calendars) completely solve the issue.',
                'User has not experienced the situation in the past 6 months.',
              ],
              limitations: [
                'Small sample size does not confirm market size or willingness to pay.',
                'Participant recall may miss minor details.',
              ],
              estimatedEffort: '1.5 hours (5 interviews × 15 min + note synthesis)',
            };

            return sendJson(res, 200, {
              success: true,
              data: {
                ...exp,
                primary: exp,
              },
              isLive: false,
              error: err.message,
            });
          }

          if (err instanceof MissingApiKeyError || err.code === 'MISSING_API_KEY') {
            return sendJson(res, 401, {
              success: false,
              error: sanitizeErrorMessage(err.message),
              code: 'MISSING_API_KEY',
            });
          }
          return sendJson(res, 502, {
            success: false,
            error: sanitizeErrorMessage(err.message || 'AI service error'),
            code: 'AI_SERVICE_ERROR',
          });
        }
      }

      if (url === '/api/review') {
        const body = await parseJsonBody(req);
        const { problem, analysis, experiment, hypothesis, findings, isDemo } = body;

        if (!findings || !Array.isArray(findings)) {
          return sendJson(res, 400, {
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

          return sendJson(res, 200, {
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

        try {
          const effectiveHypothesis =
            hypothesis ||
            experiment?.hypothesis ||
            'Target users experience severe friction with current workarounds.';
          const brief = await reviewEvidence(problem, effectiveHypothesis, findings);
          return sendJson(res, 200, {
            success: true,
            data: brief,
            isLive: true,
          });
        } catch (err: any) {
          if (fallbackOnError) {
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

            return sendJson(res, 200, {
              success: true,
              data: {
                ...heuristicVerdict,
                verdict: canonicalVerdict,
                category: heuristicVerdict.category,
              },
              isLive: false,
              error: err.message,
            });
          }

          if (err instanceof MissingApiKeyError || err.code === 'MISSING_API_KEY') {
            return sendJson(res, 401, {
              success: false,
              error: sanitizeErrorMessage(err.message),
              code: 'MISSING_API_KEY',
            });
          }
          return sendJson(res, 502, {
            success: false,
            error: sanitizeErrorMessage(err.message || 'AI service error'),
            code: 'AI_SERVICE_ERROR',
          });
        }
      }

      return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
    } catch (err: any) {
      if (err.message === 'Malformed JSON payload') {
        return sendJson(res, 500, {
          success: false,
          error: 'Malformed JSON payload',
        });
      }
      return sendJson(res, 500, {
        success: false,
        error: err.message || 'Internal server error processing request.',
      });
    }
  };
}

export function problemPilotApiPlugin(options: ApiMiddlewareOptions = {}): Plugin {
  return {
    name: 'problempilot-api-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createApiMiddleware(options));
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(createApiMiddleware(options));
    },
  };
}

export default problemPilotApiPlugin;
