import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import http, { type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { problemPilotApiPlugin } from '../server/apiMiddleware.ts';
import {
  DEMO_SCENARIO_A,
  DEMO_SCENARIO_B,
  DEMO_SCENARIO_B_FINDINGS,
} from '../server/demoData.ts';
import type { ProblemInput } from '../src/types/index.ts';
import { api } from '../src/services/api.ts';

describe('Empirical Challenger M2-2: Key Isolation, Transparent Errors, and Demo Mode', () => {
  let server: Server;
  let baseUrl: string;
  const originalEnvKey = process.env.GEMINI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;

  beforeAll(async () => {
    // Mount canonical server API plugin with default options (fallbackOnError = false)
    const plugin = problemPilotApiPlugin();
    let middleware: (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => Promise<void> | void;

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
    if (originalEnvKey !== undefined) {
      process.env.GEMINI_API_KEY = originalEnvKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    if (originalGoogleKey !== undefined) {
      process.env.GOOGLE_API_KEY = originalGoogleKey;
    } else {
      delete process.env.GOOGLE_API_KEY;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  const validProblem: ProblemInput = {
    idea: 'Mechanical engineers struggle to index torque specs from PDF machine manuals.',
    targetUser: 'Mechanical engineering lab students',
    context: 'During lab machining operations when configuring Bridgeport mills.',
  };

  // =========================================================================
  // REQUIREMENT 1: Client Bundle Inspection & Zero Key Leakage
  // =========================================================================
  describe('Part 1: Client Bundle Inspection & Zero Key Leakage', () => {
    it('verifies dist/ bundle exists and contains zero references to GEMINI_API_KEY or process.env', () => {
      const distPath = path.resolve(__dirname, '../dist');
      expect(fs.existsSync(distPath)).toBe(true);

      const files: string[] = [];
      function collectFiles(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            collectFiles(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      }
      collectFiles(distPath);

      expect(files.length).toBeGreaterThan(0);

      // Search all files in dist for forbidden tokens
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content.includes('GEMINI_API_KEY')).toBe(false);
        expect(content.includes('GOOGLE_API_KEY')).toBe(false);
        expect(content.includes('process.env')).toBe(false);
        expect(content.includes('@google/genai')).toBe(false);
      }
    });
  });

  // =========================================================================
  // REQUIREMENT 2: Stress-test Live Error Handling Without API Keys
  // =========================================================================
  describe('Part 2: Stress-Test Live Error Handling (Strict 401 MISSING_API_KEY)', () => {
    it('POST /api/analyze with isDemo: false and unset API key returns HTTP 401 with MISSING_API_KEY', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
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
      expect(data.data).toBeUndefined();
    });

    it('POST /api/analyze with isDemo omitted and unset API key returns HTTP 401 with MISSING_API_KEY', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('MISSING_API_KEY');
      expect(data.data).toBeUndefined();
    });

    it('POST /api/test with isDemo: false and unset API key returns HTTP 401 with MISSING_API_KEY', async () => {
      const res = await fetch(`${baseUrl}/api/test`, {
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
      expect(data.data).toBeUndefined();
    });

    it('POST /api/test with isDemo omitted and unset API key returns HTTP 401 with MISSING_API_KEY', async () => {
      const res = await fetch(`${baseUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          analysis: DEMO_SCENARIO_A.analysis,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('MISSING_API_KEY');
      expect(data.data).toBeUndefined();
    });

    it('POST /api/review with isDemo: false and unset API key returns HTTP 401 with MISSING_API_KEY', async () => {
      const res = await fetch(`${baseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: DEMO_SCENARIO_B_FINDINGS,
          isDemo: false,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('MISSING_API_KEY');
      expect(data.data).toBeUndefined();
    });

    it('POST /api/review with isDemo omitted and unset API key returns HTTP 401 with MISSING_API_KEY', async () => {
      const res = await fetch(`${baseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: validProblem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: DEMO_SCENARIO_B_FINDINGS,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('MISSING_API_KEY');
      expect(data.data).toBeUndefined();
    });

    it('verifies server NEVER silently substitutes mock or demo data on live failures', async () => {
      // Test when key is invalid
      process.env.GEMINI_API_KEY = 'invalid-test-key-empirical';

      const endpoints = [
        {
          url: '/api/analyze',
          body: { problem: validProblem, isDemo: false },
        },
        {
          url: '/api/test',
          body: { problem: validProblem, analysis: DEMO_SCENARIO_A.analysis, isDemo: false },
        },
        {
          url: '/api/review',
          body: {
            problem: validProblem,
            analysis: DEMO_SCENARIO_A.analysis,
            experiment: DEMO_SCENARIO_A.experiment,
            findings: DEMO_SCENARIO_B_FINDINGS,
            isDemo: false,
          },
        },
      ];

      for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep.url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ep.body),
        });

        // Must return 502 error, never 200 with mock data
        expect(res.status).toBe(502);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.code).toBe('AI_SERVICE_ERROR');
        expect(data.data).toBeUndefined();
        expect(data.isDemo).toBeUndefined();
      }
    });
  });

  // =========================================================================
  // REQUIREMENT 3: Stress-test Demo Mode (Scenario A & B Determinism & Offline)
  // =========================================================================
  describe('Part 3: Stress-Test Demo Mode (Deterministic Fixtures & Zero Network)', () => {
    it('POST /api/analyze returns deterministic Scenario A fixture with isDemo: true and isLive: false', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: DEMO_SCENARIO_A.problem,
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
      expect(data.data.refinedProblemStatement).toBe(DEMO_SCENARIO_A.analysis.refinedProblemStatement);
      expect(data.data.assumptions).toEqual(DEMO_SCENARIO_A.analysis.assumptions);
    });

    it('POST /api/analyze returns deterministic Scenario B fixture with isDemo: true and isLive: false', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: DEMO_SCENARIO_B.problem,
          isDemo: true,
          demoScenario: 'B',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.isLive).toBe(false);
      expect(data.data.assumptions).toEqual(DEMO_SCENARIO_B.analysis.assumptions);
    });

    it('POST /api/test returns deterministic Scenario A experiment fixture', async () => {
      const res = await fetch(`${baseUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: DEMO_SCENARIO_A.problem,
          analysis: DEMO_SCENARIO_A.analysis,
          isDemo: true,
          demoScenario: 'A',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.isLive).toBe(false);
      expect(data.data.primary.id).toBe(DEMO_SCENARIO_A.experiment.id);
      expect(data.data.primary.hypothesis).toBe(DEMO_SCENARIO_A.experiment.hypothesis);
      expect(data.data.primary.inquiryQuestions).toEqual(DEMO_SCENARIO_A.experiment.inquiryQuestions);
    });

    it('POST /api/test returns deterministic Scenario B experiment fixture', async () => {
      const res = await fetch(`${baseUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: DEMO_SCENARIO_B.problem,
          analysis: DEMO_SCENARIO_B.analysis,
          isDemo: true,
          demoScenario: 'B',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.isLive).toBe(false);
      expect(data.data.primary.id).toBe(DEMO_SCENARIO_B.experiment.id);
      expect(data.data.primary.hypothesis).toBe(DEMO_SCENARIO_B.experiment.hypothesis);
    });

    it('POST /api/review with empty findings returns deterministic INSUFFICIENT EVIDENCE', async () => {
      const res = await fetch(`${baseUrl}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: DEMO_SCENARIO_A.problem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: [],
          isDemo: true,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDemo).toBe(true);
      expect(data.isLive).toBe(false);
      expect(data.data.verdict).toBe('INSUFFICIENT EVIDENCE');
      expect(data.data.category).toBe('INSUFFICIENT_EVIDENCE');
      expect(data.data.supportedClaims.length).toBe(0);
      expect(data.data.unsupportedClaims.length).toBe(DEMO_SCENARIO_A.analysis.assumptions.length);
    });

    it('POST /api/review with Scenario B findings returns deterministic REVISE THE HYPOTHESIS', async () => {
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
      expect(data.isLive).toBe(false);
      expect(data.data.verdict).toBe('REVISE THE HYPOTHESIS');
      expect(data.data.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(data.data.contradictoryFindings.length).toBeGreaterThanOrEqual(1);
    });

    it('stress tests determinism: 20 sequential calls produce identical outputs', async () => {
      const analyzeResponses: string[] = [];
      const reviewResponses: string[] = [];

      for (let i = 0; i < 20; i++) {
        const analyzeRes = await fetch(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem: DEMO_SCENARIO_A.problem,
            isDemo: true,
            demoScenario: 'A',
          }),
        });
        analyzeResponses.push(await analyzeRes.text());

        const reviewRes = await fetch(`${baseUrl}/api/review`, {
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
        reviewResponses.push(await reviewRes.text());
      }

      const firstAnalyze = analyzeResponses[0];
      for (const res of analyzeResponses) {
        expect(res).toBe(firstAnalyze);
      }

      const firstReview = reviewResponses[0];
      for (const res of reviewResponses) {
        expect(res).toBe(firstReview);
      }
    });
  });

  // =========================================================================
  // REQUIREMENT 4: Client API Service Contract (src/services/api.ts)
  // =========================================================================
  describe('Part 4: Client API Service Integration Handling', () => {
    it('client api.analyzeProblem gracefully catches 401 without unhandled promise rejection', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (input: any, init?: any) => {
        const url = typeof input === 'string' ? `${baseUrl}${input}` : input;
        return originalFetch(url, init);
      };

      try {
        const result = await api.analyzeProblem({
          problem: validProblem,
          isDemo: false,
        });

        expect(result.success).toBe(false);
        expect(result.code).toBe('MISSING_API_KEY');
        expect(result.error).toContain('GEMINI_API_KEY');
        expect(result.data).toBeUndefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('client api.analyzeProblem in demo mode returns success with isDemo: true and typed data', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (input: any, init?: any) => {
        const url = typeof input === 'string' ? `${baseUrl}${input}` : input;
        return originalFetch(url, init);
      };

      try {
        const result = await api.analyzeProblem({
          problem: DEMO_SCENARIO_A.problem,
          isDemo: true,
          demoScenario: 'A',
        });

        expect(result.success).toBe(true);
        expect(result.isDemo).toBe(true);
        expect(result.isLive).toBe(false);
        expect(result.data).toBeDefined();
        expect(result.data?.problemClarity.status).toBe('vague');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('client api.reviewEvidence in demo mode returns verdict without network dependencies', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (input: any, init?: any) => {
        const url = typeof input === 'string' ? `${baseUrl}${input}` : input;
        return originalFetch(url, init);
      };

      try {
        const result = await api.reviewEvidence({
          problem: DEMO_SCENARIO_A.problem,
          analysis: DEMO_SCENARIO_A.analysis,
          experiment: DEMO_SCENARIO_A.experiment,
          findings: DEMO_SCENARIO_B_FINDINGS,
          isDemo: true,
        });

        expect(result.success).toBe(true);
        expect(result.isDemo).toBe(true);
        expect(result.isLive).toBe(false);
        expect(result.data?.verdict).toBe('REVISE THE HYPOTHESIS');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
