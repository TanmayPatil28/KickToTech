import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import http, { type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createApiMiddleware,
  problemPilotApiPlugin,
} from '../server/apiMiddleware.ts';
import {
  callGeminiWithSchema,
  validateAnalysis,
  validateExperiment,
  validateDecisionBrief,
  MissingApiKeyError,
  AiServiceError,
} from '../server/geminiService.ts';
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_B_FINDINGS,
} from '../server/demoData.ts';
import type { Finding, ProblemInput } from '../src/types/index.ts';

// Mock the GoogleGenAI SDK to precisely simulate API behavior and retries
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
      BOOLEAN: 'BOOLEAN',
      INTEGER: 'INTEGER',
    },
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe('Milestone 2 Empirical Challenger Adversarial Verification', () => {
  let canonicalServer: Server;
  let canonicalBaseUrl: string;

  let fallbackServer: Server;
  let fallbackBaseUrl: string;

  const validProblem: ProblemInput = {
    idea: 'Mechanical engineering students struggle to locate lathe feed rates in unindexed manuals.',
    targetUser: 'Undergraduate machining students',
    context: 'During machine shop lab sessions configuring manual lathes.',
    existingObservations: 'Observed 5 students spend 15 minutes flipping pages.',
  };

  beforeAll(async () => {
    // 1. Canonical Production Server (fallbackOnError: false, mounted via vite.config.ts)
    const canonicalMiddleware = createApiMiddleware({ fallbackOnError: false });
    canonicalServer = http.createServer((req, res) => {
      canonicalMiddleware(req, res, () => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Route not handled / bypassed' }));
      });
    });

    await new Promise<void>((resolve) => {
      canonicalServer.listen(0, '127.0.0.1', () => {
        const addr = canonicalServer.address() as AddressInfo;
        canonicalBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 2. Dev Fallback Server (fallbackOnError: true, for graceful dev mode fallback)
    const fallbackMiddleware = createApiMiddleware({ fallbackOnError: true });
    fallbackServer = http.createServer((req, res) => {
      fallbackMiddleware(req, res, () => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Route not handled / bypassed' }));
      });
    });

    await new Promise<void>((resolve) => {
      fallbackServer.listen(0, '127.0.0.1', () => {
        const addr = fallbackServer.address() as AddressInfo;
        fallbackBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        canonicalServer.close((err) => (err ? reject(err) : resolve()));
      }),
      new Promise<void>((resolve, reject) => {
        fallbackServer.close((err) => (err ? reject(err) : resolve()));
      }),
    ]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // SECTION 1: HTTP Method Filtering & Routing Isolation
  // =========================================================================
  describe('1. HTTP Method Filtering & Routing Isolation', () => {
    const methods = ['GET', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] as const;
    const endpoints = ['/api/analyze', '/api/test', '/api/review'];

    for (const endpoint of endpoints) {
      for (const method of methods) {
        it(`bypasses middleware (falls through to next) for ${method} ${endpoint}`, async () => {
          const res = await fetch(`${canonicalBaseUrl}${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: method !== 'GET' && method !== 'OPTIONS' ? JSON.stringify({ problem: validProblem }) : undefined,
          });

          // Falls through to next handler which returns 404
          expect(res.status).toBe(404);
          const data = await res.json();
          expect(data.error).toContain('Route not handled / bypassed');
        });
      }
    }

    it('bypasses non-API routes (e.g. /index.html, /assets/main.js)', async () => {
      const res = await fetch(`${canonicalBaseUrl}/assets/main.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('Route not handled / bypassed');
    });

    it('returns 404 for unknown /api/* endpoints', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/non_existent_endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Endpoint not found');
    });

    it('verifies problemPilotApiPlugin attaches configureServer and configurePreviewServer', () => {
      const plugin = problemPilotApiPlugin();
      expect(plugin.name).toBe('problempilot-api-middleware');
      expect(typeof plugin.configureServer).toBe('function');
      expect(typeof plugin.configurePreviewServer).toBe('function');

      let configuredDev = false;
      let configuredPreview = false;
      plugin.configureServer?.({ middlewares: { use: () => { configuredDev = true; } } } as any);
      plugin.configurePreviewServer?.({ middlewares: { use: () => { configuredPreview = true; } } } as any);

      expect(configuredDev).toBe(true);
      expect(configuredPreview).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 2: Malformed JSON, Non-Object Primitives & Extreme Payloads
  // =========================================================================
  describe('2. Malformed JSON, Non-Object Primitives & Extreme Payloads', () => {
    it('returns 500 when sent truncated / syntax-invalid JSON', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"problem": {"idea": "Truncated json',
      });
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Malformed JSON payload');
    });

    it('handles raw null JSON body safely without crashing the server process', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'null',
      });
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('handles non-object primitive string JSON safely', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '"hello world"',
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('handles non-object primitive number JSON safely', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '12345',
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('handles JSON array body safely', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '[1, 2, 3]',
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('handles completely empty body (0 bytes) gracefully', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('rejects oversized payload exceeding 512KB limit with Payload too large', async () => {
      const hugeString = 'x'.repeat(600 * 1024); // 600 KB
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ huge: hugeString }),
      });
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Payload too large');
    });
  });

  // =========================================================================
  // SECTION 3: Input Validation & Boundary Stress for /api/analyze
  // =========================================================================
  describe('3. Endpoint /api/analyze Input Boundary Stress Testing', () => {
    it('rejects missing problem field ({})', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('rejects empty problem object ({ problem: {} })', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: {} }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('rejects empty problem.idea string ("")', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: { idea: '' } }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('rejects whitespace-only problem.idea string ("    ")', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: { idea: '    \t\n  ' } }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('rejects problem.idea with fewer than 5 characters ("Four")', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: { idea: 'Four' } }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_INPUT');
      expect(data.error).toContain('at least 5 characters');
    });

    it('rejects non-string problem.idea (e.g. number 123456)', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: { idea: 123456 } }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('succeeds in Demo Mode with Scenario A', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          isDemo: true,
          demoScenario: 'A',
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

    it('succeeds in Demo Mode with Scenario B', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          isDemo: true,
          demoScenario: 'B',
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('returns 401 MISSING_API_KEY on canonical server when GEMINI_API_KEY is not set', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      try {
        const res = await fetch(`${canonicalBaseUrl}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem: validProblem,
            isDemo: false,
          }),
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.code).toBe('MISSING_API_KEY');
        expect(data.error).toContain('GEMINI_API_KEY');
      } finally {
        if (origKey) process.env.GEMINI_API_KEY = origKey;
      }
    });

    it('returns graceful heuristic analysis on fallback server when GEMINI_API_KEY is not set', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      try {
        const res = await fetch(`${fallbackBaseUrl}/api/analyze`, {
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
        expect(data.isLive).toBe(false);
        expect(data.data.assumptions).toBeDefined();
      } finally {
        if (origKey) process.env.GEMINI_API_KEY = origKey;
      }
    });
  });

  // =========================================================================
  // SECTION 4: Input Validation & Boundary Stress for /api/test
  // =========================================================================
  describe('4. Endpoint /api/test Input Boundary Stress Testing', () => {
    it('rejects when both analysis and assumptions are missing ({ problem })', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: validProblem }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
      expect(data.error).toContain('Analysis is required');
    });

    it('rejects when assumptions is not an array and analysis is missing', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          assumptions: 'not an array',
        }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('succeeds in Demo Mode with experiment output', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/test`, {
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
      expect(data.data.primary).toBeDefined();
      expect(data.data.primary.inquiryQuestions.length).toBeGreaterThan(0);
      expect(data.data.primary.supportingSignals.length).toBeGreaterThan(0);
      expect(data.data.primary.weakeningSignals.length).toBeGreaterThan(0);
    });

    it('returns 401 on canonical server in live mode when GEMINI_API_KEY is not set', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      try {
        const res = await fetch(`${canonicalBaseUrl}/api/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem: validProblem,
            analysis: DEMO_SCENARIO_A.analysis,
            isDemo: false,
          }),
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.code).toBe('MISSING_API_KEY');
      } finally {
        if (origKey) process.env.GEMINI_API_KEY = origKey;
      }
    });

    it('returns structured experiment on fallback server when GEMINI_API_KEY is not set', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      try {
        const res = await fetch(`${fallbackBaseUrl}/api/test`, {
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
        expect(data.isLive).toBe(false);
        expect(data.data.primary.hypothesis).toBeDefined();
      } finally {
        if (origKey) process.env.GEMINI_API_KEY = origKey;
      }
    });
  });

  // =========================================================================
  // SECTION 5: Input Validation & Verdict Categories for /api/review
  // =========================================================================
  describe('5. Endpoint /api/review Input Validation & Verdict Categories', () => {
    it('rejects when findings field is missing from payload', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/review`, {
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
      expect(data.code).toBe('INVALID_INPUT');
      expect(data.error).toContain('Findings array is required');
    });

    it('rejects when findings is not an array (string, object, null)', async () => {
      const invalidTypes = ['not an array', { id: 1 }, null, 123];

      for (const invalid of invalidTypes) {
        const res = await fetch(`${canonicalBaseUrl}/api/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem: validProblem,
            findings: invalid,
          }),
        });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe('INVALID_INPUT');
      }
    });

    it('returns INSUFFICIENT EVIDENCE when findings array is completely empty []', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: [],
          isDemo: true,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.verdict).toBe('INSUFFICIENT EVIDENCE');
      expect(data.data.category).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('returns INSUFFICIENT EVIDENCE when findings consist exclusively of subjective praise', async () => {
      const subjectiveFindings: Finding[] = [
        {
          id: 'F-1',
          description: 'Everyone loves this idea and thinks it is a great idea!',
          sourceType: 'user_reported',
          isCredibleObservation: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'F-2',
          description: 'Nice concept, definitely gonna blow up on campus!',
          sourceType: 'user_reported',
          isCredibleObservation: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const res = await fetch(`${canonicalBaseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: subjectiveFindings,
          isDemo: true,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.verdict).toBe('INSUFFICIENT EVIDENCE');
    });

    it('returns REVISE THE HYPOTHESIS when findings contain contradictory counter-evidence', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/review`, {
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
      expect(data.data.verdict).toBe('REVISE THE HYPOTHESIS');
      expect(data.data.contradictoryFindings.length).toBeGreaterThan(0);
    });

    it('returns EVIDENCE SUPPORTS FURTHER TESTING when findings contain credible supporting observations', async () => {
      const supportingFindings: Finding[] = [
        {
          id: 'F-1',
          description: 'Observed student struggled and lost time for 25 painful minutes trying to find lathe specs.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'F-2',
          description: 'Second student wasted 18 minutes because unindexed diagrams were broken and illegible.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const res = await fetch(`${canonicalBaseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: DEMO_SCENARIO_A.problem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: supportingFindings,
          isDemo: true,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.verdict).toBe('EVIDENCE SUPPORTS FURTHER TESTING');
      expect(data.data.supportedClaims.length).toBeGreaterThan(0);
    });

    it('strictly forbids prohibited claims (PROVEN or GUARANTEED MARKET DEMAND)', async () => {
      const res = await fetch(`${canonicalBaseUrl}/api/review`, {
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
      const data = await res.json();
      const stringified = JSON.stringify(data).toUpperCase();
      expect(stringified).not.toContain('"PROVEN"');
      expect(stringified).not.toContain('GUARANTEED MARKET DEMAND');
    });

    it('strictly restricts verdict to one of the 3 allowed categories', async () => {
      const allowedVerdicts = [
        'INSUFFICIENT EVIDENCE',
        'REVISE THE HYPOTHESIS',
        'EVIDENCE SUPPORTS FURTHER TESTING',
      ];

      const scenarios = [
        [],
        DEMO_SCENARIO_B_FINDINGS,
        [
          {
            id: 'S1',
            description: 'Observed student struggled and lost time for 20 painful minutes with broken index.',
            sourceType: 'direct_observation' as const,
            relatedAssumptionId: 'ASM-1',
          },
          {
            id: 'S2',
            description: 'Observed operator wasted 30 minutes with manual effort and failed lookup.',
            sourceType: 'direct_observation' as const,
            relatedAssumptionId: 'ASM-1',
          },
        ],
      ];

      for (const findings of scenarios) {
        const res = await fetch(`${canonicalBaseUrl}/api/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem: DEMO_SCENARIO_A.problem,
            analysis: DEMO_SCENARIO_A.analysis,
            experiment: DEMO_SCENARIO_A.experiment,
            findings,
            isDemo: true,
          }),
        });
        const data = await res.json();
        expect(allowedVerdicts).toContain(data.data.verdict);
      }
    });
  });

  // =========================================================================
  // SECTION 6: Bounded 2-Retry Policy on Schema Parsing & Service Failures
  // =========================================================================
  describe('6. Bounded 2-Retry Policy on Schema Parsing & Service Failures', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'mock-empirical-key';
    });

    afterAll(() => {
      delete process.env.GEMINI_API_KEY;
    });

    it('throws MissingApiKeyError immediately without calling SDK if API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      await expect(
        callGeminiWithSchema(
          'prompt',
          {},
          () => ({ valid: true })
        )
      ).rejects.toThrow(MissingApiKeyError);

      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('retries up to maxRetries (2 retries = 3 attempts total) on schema failure then throws AiServiceError', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      // Mock returns invalid JSON or schema-violating payload on all 3 attempts
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ incomplete: true }),
      });

      const failingValidator = vi.fn().mockReturnValue({
        valid: false,
        errors: ['Missing required field: problemClarity'],
      });

      await expect(
        callGeminiWithSchema(
          'Validate me',
          {},
          failingValidator,
          { maxRetries: 2 }
        )
      ).rejects.toThrow(AiServiceError);

      // Total attempts = 1 initial + 2 retries = 3 attempts
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      expect(failingValidator).toHaveBeenCalledTimes(3);

      // Verify the retry prompt includes previous error feedback
      const secondCallArgs = mockGenerateContent.mock.calls[1][0];
      expect(secondCallArgs.contents).toContain('[RETRY ATTEMPT 1/2]');
      expect(secondCallArgs.contents).toContain('Schema validation failed');

      const thirdCallArgs = mockGenerateContent.mock.calls[2][0];
      expect(thirdCallArgs.contents).toContain('[RETRY ATTEMPT 2/2]');
    });

    it('recovers successfully on retry when previous attempt failed schema validation', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      // Attempt 1: Schema invalid
      // Attempt 2: Schema valid
      mockGenerateContent
        .mockResolvedValueOnce({
          text: JSON.stringify({ invalid: 'bad output' }),
        })
        .mockResolvedValueOnce({
          text: JSON.stringify({ validResult: true, data: 42 }),
        });

      let attemptCount = 0;
      const validator = (data: any) => {
        attemptCount++;
        if (data.validResult === true) {
          return { valid: true };
        }
        return { valid: false, errors: ['Field validResult missing'] };
      };

      const result = await callGeminiWithSchema<{ validResult: boolean; data: number }>(
        'Test recovery',
        {},
        validator,
        { maxRetries: 2 }
      );

      expect(result).toEqual({ validResult: true, data: 42 });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(attemptCount).toBe(2);
    });

    it('retries on unparseable non-JSON text output', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Not valid JSON at all!' })
        .mockResolvedValueOnce({ text: JSON.stringify({ success: true }) });

      const validator = (data: any) => ({ valid: data.success === true });

      const result = await callGeminiWithSchema<{ success: boolean }>(
        'Parse test',
        {},
        validator,
        { maxRetries: 2 }
      );

      expect(result).toEqual({ success: true });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('fails fast without wasting retries on 403 PERMISSION_DENIED / suspension', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      const permError = new Error('PERMISSION_DENIED: User project suspended.');
      (permError as any).status = 403;

      mockGenerateContent.mockRejectedValue(permError);

      await expect(
        callGeminiWithSchema('Check auth failure', {}, () => ({ valid: true }), { maxRetries: 2 })
      ).rejects.toThrow('Gemini API authorization error');

      // Crucial: Only 1 call made! Did not waste 2 retries on non-transient auth error
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('enforces request timeout and throws AiServiceError', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      // Hanging promise that simulates timeout
      mockGenerateContent.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );

      await expect(
        callGeminiWithSchema(
          'Timeout test',
          {},
          () => ({ valid: true }),
          { maxRetries: 0, timeoutMs: 50 }
        )
      ).rejects.toThrow('timed out after 50ms');
    });
  });

  // =========================================================================
  // SECTION 7: Direct Validator Stress & Epistemic Rules
  // =========================================================================
  describe('7. Direct Schema Validator Stress & Epistemic Prohibitions', () => {
    it('validateAnalysis requires problemClarity status to be one of clear/incomplete/vague', () => {
      expect(validateAnalysis({ problemClarity: { status: 'clear' }, assumptions: [{ id: '1', claim: 'c', risk: 'h', status: 'u' }], refinedProblemStatement: 'p', evidenceGaps: [] }).valid).toBe(true);
      expect(validateAnalysis({ problemClarity: { status: 'invalid_status' }, assumptions: [{ id: '1', claim: 'c', risk: 'h', status: 'u' }], refinedProblemStatement: 'p', evidenceGaps: [] }).valid).toBe(false);
    });

    it('validateExperiment requires inquiryQuestions and signals', () => {
      const valid = {
        hypothesis: 'test hypothesis',
        inquiryQuestions: ['What did you do?'],
        supportingSignals: ['signal 1'],
        weakeningSignals: ['signal 2'],
        estimatedEffort: '1 hour',
      };
      expect(validateExperiment(valid).valid).toBe(true);
      expect(validateExperiment({ ...valid, inquiryQuestions: [] }).valid).toBe(false);
      expect(validateExperiment({ ...valid, supportingSignals: [] }).valid).toBe(false);
    });

    it('validateDecisionBrief accepts valid verdicts and normalizes underscores', () => {
      const brief = {
        verdict: 'INSUFFICIENT EVIDENCE',
        unsupportedClaims: [],
        contradictoryFindings: [],
      };
      expect(validateDecisionBrief(brief).valid).toBe(true);
      expect(validateDecisionBrief({ ...brief, verdict: 'REVISE_THE_HYPOTHESIS' }).valid).toBe(true);
      expect(validateDecisionBrief({ ...brief, verdict: 'EVIDENCE_SUPPORTS_FURTHER_TESTING' }).valid).toBe(true);
    });

    it('validateDecisionBrief rejects forbidden verdict categories and epistemic words', () => {
      const brief = {
        unsupportedClaims: [],
        contradictoryFindings: [],
      };

      // Disallowed verdict categories
      expect(validateDecisionBrief({ ...brief, verdict: 'PROVEN' }).valid).toBe(false);
      expect(validateDecisionBrief({ ...brief, verdict: 'CONFIRMED' }).valid).toBe(false);
      expect(validateDecisionBrief({ ...brief, verdict: 'VALIDATED' }).valid).toBe(false);
      expect(validateDecisionBrief({ ...brief, verdict: 'PRODUCT MARKET FIT GUARANTEED' }).valid).toBe(false);

      // Forbidden words inside rationale or claims
      expect(validateDecisionBrief({
        verdict: 'EVIDENCE SUPPORTS FURTHER TESTING',
        rationale: 'Evidence supports further testing.',
        supportedClaims: ['PROVEN'],
        unsupportedClaims: [],
        contradictoryFindings: [],
      }).valid).toBe(false);

      expect(validateDecisionBrief({
        verdict: 'EVIDENCE SUPPORTS FURTHER TESTING',
        rationale: 'We have GUARANTEED MARKET DEMAND for this app.',
        unsupportedClaims: [],
        contradictoryFindings: [],
      }).valid).toBe(false);
    });
  });
});
