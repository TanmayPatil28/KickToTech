import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http, { type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { problemPilotApiPlugin } from '../src/server/apiMiddleware';
import {
  analyzeProblemWithGemini,
  reviewEvidenceWithGemini,
} from '../src/server/geminiService';
import { DEMO_SCENARIO_A, DEMO_SCENARIO_B_FINDINGS } from '../src/domain/demoData';
import type {
  ProblemInput,
} from '../src/types';

describe('Server API Endpoints & Middleware Contracts (Tiers 1, 2, 4)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const plugin = problemPilotApiPlugin();
    let middleware: (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => Promise<void> | void;

    // Extract the Connect middleware from the Vite plugin hook
    const mockViteServer = {
      middlewares: {
        use: (fn: any) => {
          middleware = fn;
        },
      },
    };

    if (typeof plugin.configureServer === 'function') {
      plugin.configureServer(mockViteServer as any);
    } else {
      throw new Error('problemPilotApiPlugin does not define configureServer');
    }

    server = http.createServer((req, res) => {
      middleware(req, res, () => {
        // Fallthrough if not handled by API middleware
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Route not handled by API middleware' }));
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const validProblem: ProblemInput = {
    idea: 'Mechanical engineers struggle to index torque specs from PDF machine manuals.',
    targetUser: 'Mechanical engineering lab students',
    context: 'During lab machining operations when configuring Bridgeport mills.',
  };

  // =========================================================================
  // TIER 1: Feature Coverage (Endpoints /api/analyze, /api/test, /api/review)
  // =========================================================================
  describe('Tier 1: Feature 1 - POST /api/analyze Endpoint', () => {
    it('returns 400 when problem object is missing or idea is less than 5 characters', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: { idea: 'Tiny' } }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('at least 5 characters');
    });

    it('returns deterministic Scenario A analysis in Demo Mode', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          isDemo: true,
          demoScenario: 'vague_study',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.isLive).toBe(false);
      expect(data.data.problemClarity.status).toBe('vague');
      expect(data.data.assumptions.length).toBeGreaterThanOrEqual(3);
    });

    it('returns deterministic Scenario B analysis in Demo Mode', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          isDemo: true,
          demoScenario: 'contradictory_study',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.isLive).toBe(false);
      expect(data.data).toBeDefined();
    });

    it('handles live request gracefully without GEMINI_API_KEY (safe heuristic fallback)', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          isDemo: false,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.assumptions).toBeInstanceOf(Array);
      // When GEMINI_API_KEY is unset in test env, isLive should be false with informative error
      if (!process.env.GEMINI_API_KEY) {
        expect(data.isLive).toBe(false);
        expect(data.error).toContain('GEMINI_API_KEY');
      }
    });
  });

  describe('Tier 1: Feature 2 - POST /api/test Endpoint', () => {
    it('returns 400 when analysis object is missing from payload', async () => {
      const res = await fetch(`${baseUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: validProblem }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Analysis is required');
    });

    it('generates non-leading past-behavior validation experiment in live mode', async () => {
      const res = await fetch(`${baseUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          analysis: DEMO_SCENARIO_A.analysis,
          isDemo: false,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.primary).toBeDefined();

      const exp = data.data.primary;
      expect(exp.id).toBe('EXP-1');
      expect(exp.inquiryQuestions.length).toBeGreaterThanOrEqual(3);
      expect(exp.supportingSignals.length).toBeGreaterThanOrEqual(1);
      expect(exp.weakeningSignals.length).toBeGreaterThanOrEqual(1);
      expect(exp.limitations.length).toBeGreaterThanOrEqual(1);
      expect(exp.estimatedEffort).toBeDefined();
    });

    it('returns deterministic experiment in demo mode', async () => {
      const res = await fetch(`${baseUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          analysis: DEMO_SCENARIO_A.analysis,
          isDemo: true,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.data.primary.title).toBe(DEMO_SCENARIO_A.experiment?.title);
    });
  });

  describe('Tier 1: Feature 3 - POST /api/review Endpoint', () => {
    it('returns 400 when findings array is missing from payload', async () => {
      const res = await fetch(`${baseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Findings array is required');
    });

    it('evaluates findings deterministically in Demo Mode', async () => {
      const res = await fetch(`${baseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: DEMO_SCENARIO_A.problem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: DEMO_SCENARIO_B_FINDINGS,
          isDemo: true,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.data.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(data.data.contradictoryFindings.length).toBeGreaterThan(0);
    });

    it('synthesizes verdict in live mode (using heuristic fallback when API key is unset)', async () => {
      const res = await fetch(`${baseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: DEMO_SCENARIO_A.problem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: DEMO_SCENARIO_B_FINDINGS,
          isDemo: false,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.category).toBe('REVISE_THE_HYPOTHESIS');
      if (!process.env.GEMINI_API_KEY) {
        expect(data.isLive).toBe(false);
        expect(data.error).toContain('GEMINI_API_KEY');
      }
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases (Malformed inputs, unsupported methods)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('returns 404 for unknown /api endpoints', async () => {
      const res = await fetch(`${baseUrl}/api/unknown_endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Endpoint not found');
    });

    it('ignores non-POST HTTP methods and allows them to fall through to next middleware', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'GET',
      });

      // The fallthrough handler in our test setup returns 404 with custom error
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('Route not handled');
    });

    it('returns 500 when sent malformed JSON payload', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"unclosed_json: true',
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Malformed JSON payload');
    });
  });

  // =========================================================================
  // TIER 4: Gemini Service Direct Unit Invariants
  // =========================================================================
  describe('Tier 4: Gemini AI Service Direct Function Contracts', () => {
    it('analyzeProblemWithGemini returns structured result with fallback when unauthenticated or API error occurs', async () => {
      const response = await analyzeProblemWithGemini(validProblem);
      expect(response.result).toBeDefined();
      expect(response.result.assumptions.length).toBeGreaterThan(0);
      // When live call fails or key is invalid/unconfigured, graceful fallback is returned
      if (!response.isLive) {
        expect(response.error).toBeDefined();
        expect(typeof response.error).toBe('string');
        expect(response.error!.length).toBeGreaterThan(0);
      }
    });

    it('reviewEvidenceWithGemini returns valid category without throwing when key is missing or fails', async () => {
      const response = await reviewEvidenceWithGemini(
        validProblem,
        DEMO_SCENARIO_A.analysis!,
        DEMO_SCENARIO_A.experiment!,
        DEMO_SCENARIO_B_FINDINGS
      );

      expect(response.verdict).toBeDefined();
      expect(response.verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      if (!response.isLive) {
        expect(response.error).toBeDefined();
        expect(typeof response.error).toBe('string');
        expect(response.error!.length).toBeGreaterThan(0);
      }
    });
  });
});
