import http from 'node:http';
import { createApiMiddleware } from '../../../server/apiMiddleware.ts';
import { validateDecisionBrief } from '../../../server/geminiService.ts';

async function runAudit() {
  console.log('--- START AUDIT PROBE ---');

  // Test 1: Canonical server middleware (fallbackOnError: false)
  // Ensure GEMINI_API_KEY is unset for this test
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  const middleware = createApiMiddleware({ fallbackOnError: false });
  const server = http.createServer((req, res) => {
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Live request without API key -> Must return HTTP 401 with MISSING_API_KEY
    const liveRes = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem: {
          idea: 'Engineers struggle to find torque specs in PDF machine manuals.',
          targetUser: 'Machinists',
        },
        isDemo: false,
      }),
    });

    const liveData = await liveRes.json();
    console.log('Probe 1 (Live analyze without key):', {
      status: liveRes.status,
      success: liveData.success,
      code: liveData.code,
      error: liveData.error,
    });

    if (liveRes.status !== 401 || liveData.code !== 'MISSING_API_KEY' || liveData.success !== false) {
      throw new Error(`Probe 1 failed: Expected 401 MISSING_API_KEY, got ${liveRes.status} ${JSON.stringify(liveData)}`);
    }

    // 2. Demo mode request -> Must return HTTP 200 with isDemo: true, isLive: false
    const demoRes = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem: {
          idea: 'An AI app for students',
          targetUser: 'Students',
        },
        isDemo: true,
        demoScenario: 'A',
      }),
    });

    const demoData = await demoRes.json();
    console.log('Probe 2 (Demo analyze):', {
      status: demoRes.status,
      success: demoData.success,
      isDemo: demoData.isDemo,
      isLive: demoData.isLive,
      problemClarity: demoData.data?.problemClarity?.status,
    });

    if (demoRes.status !== 200 || !demoData.isDemo || demoData.isLive !== false) {
      throw new Error('Probe 2 failed: Demo mode did not return expected flags');
    }

    // 3. Epistemic honesty check on validateDecisionBrief
    const prohibitedCheck1 = validateDecisionBrief({
      verdict: 'PROVEN',
      updatedProblemStatement: 'Test',
      supportedClaims: [],
      unsupportedClaims: [],
      contradictoryFindings: [],
      remainingUncertainties: [],
      recommendedNextSteps: [],
    });
    console.log('Probe 3 (Prohibited verdict "PROVEN"):', prohibitedCheck1);
    if (prohibitedCheck1.valid) {
      throw new Error('Probe 3 failed: "PROVEN" was accepted as valid verdict');
    }

    const prohibitedCheck2 = validateDecisionBrief({
      verdict: 'INSUFFICIENT EVIDENCE',
      updatedProblemStatement: 'Test with GUARANTEED MARKET DEMAND included',
      supportedClaims: [],
      unsupportedClaims: [],
      contradictoryFindings: [],
      remainingUncertainties: [],
      recommendedNextSteps: [],
    });
    console.log('Probe 4 (Prohibited text "GUARANTEED MARKET DEMAND"):', prohibitedCheck2);
    if (prohibitedCheck2.valid) {
      throw new Error('Probe 4 failed: "GUARANTEED MARKET DEMAND" was accepted');
    }

    const validCheck = validateDecisionBrief({
      verdict: 'REVISE THE HYPOTHESIS',
      updatedProblemStatement: 'Valid updated statement',
      supportedClaims: [],
      unsupportedClaims: ['Claim 1'],
      contradictoryFindings: ['Finding 1'],
      remainingUncertainties: ['Uncertainty 1'],
      recommendedNextSteps: ['Step 1'],
    });
    console.log('Probe 5 (Valid verdict "REVISE THE HYPOTHESIS"):', validCheck);
    if (!validCheck.valid) {
      throw new Error('Probe 5 failed: Valid verdict was rejected');
    }

    console.log('--- ALL AUDIT PROBES PASSED SUCCESSFULLY ---');
  } finally {
    server.close();
  }
}

runAudit().catch((err) => {
  console.error('Audit Probe Error:', err);
  process.exit(1);
});
