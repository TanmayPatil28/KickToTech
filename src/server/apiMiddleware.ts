import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { analyzeProblemWithGemini, reviewEvidenceWithGemini } from './geminiService.ts';
import { DEMO_SCENARIO_A, DEMO_SCENARIO_B } from '../domain/demoData.ts';
import { evaluateEvidenceHeuristic } from '../domain/evidenceEvaluator.ts';

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
      } catch (err) {
        reject(new Error('Malformed JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function problemPilotApiPlugin(): Plugin {
  return {
    name: 'problempilot-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (req.method !== 'POST' || !url?.startsWith('/api/')) {
          return next();
        }

        try {
          if (url === '/api/analyze') {
            const body = await parseJsonBody(req);
            const { problem, isDemo, demoScenario } = body;

            if (!problem || !problem.idea || problem.idea.trim().length < 5) {
              return sendJson(res, 400, {
                success: false,
                error: 'Problem proposal must contain at least 5 characters.',
              });
            }

            if (isDemo) {
              const demo = demoScenario === 'contradictory_study' ? DEMO_SCENARIO_B : DEMO_SCENARIO_A;
              return sendJson(res, 200, {
                success: true,
                data: demo.analysis,
                isDemo: true,
                isLive: false,
              });
            }

            const analysisResponse = await analyzeProblemWithGemini(problem);
            return sendJson(res, 200, {
              success: true,
              data: analysisResponse.result,
              isLive: analysisResponse.isLive,
              error: analysisResponse.error,
            });
          }

          if (url === '/api/test') {
            const body = await parseJsonBody(req);
            const { problem, analysis, isDemo } = body;

            if (!analysis) {
              return sendJson(res, 400, {
                success: false,
                error: 'Analysis is required to generate or validate experiment.',
              });
            }

            if (isDemo) {
              return sendJson(res, 200, {
                success: true,
                data: {
                  primary: DEMO_SCENARIO_A.experiment,
                },
                isDemo: true,
                isLive: false,
              });
            }

            // Generate primary validation experiment
            const primary = {
              id: 'EXP-1',
              title: analysis.suggestedValidationObjective || 'Targeted Past-Behavior Inquiry',
              objective: analysis.suggestedValidationObjective,
              hypothesis: analysis.assumptions[0]?.claim || 'Target users experience severe friction with current workarounds.',
              targetParticipants: problem.targetUser || '5 relevant individuals',
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
              data: { primary },
              isLive: true,
            });
          }

          if (url === '/api/review') {
            const body = await parseJsonBody(req);
            const { problem, analysis, experiment, findings, isDemo } = body;

            if (!findings || !Array.isArray(findings)) {
              return sendJson(res, 400, {
                success: false,
                error: 'Findings array is required to synthesize evidence.',
              });
            }

            if (isDemo) {
              const heuristicVerdict = evaluateEvidenceHeuristic(problem, analysis, experiment, findings);
              return sendJson(res, 200, {
                success: true,
                data: heuristicVerdict,
                isDemo: true,
                isLive: false,
              });
            }

            const reviewResponse = await reviewEvidenceWithGemini(problem, analysis, experiment, findings);
            return sendJson(res, 200, {
              success: true,
              data: reviewResponse.verdict,
              isLive: reviewResponse.isLive,
              error: reviewResponse.error,
            });
          }

          return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
        } catch (err: any) {
          console.error('API middleware unhandled error:', err);
          return sendJson(res, 500, {
            success: false,
            error: err.message || 'Internal server error processing request.',
          });
        }
      });
    },
  };
}
