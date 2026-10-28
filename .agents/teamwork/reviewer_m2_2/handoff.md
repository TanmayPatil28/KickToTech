# Milestone 2 Quality & Adversarial Review Report: Server API Middleware & Gemini AI Service

**Reviewer:** reviewer_m2_2 (teamwork_preview_reviewer)  
**Parent:** orchestrator_1 (`5609cc52-02be-4823-a17e-c62c60741a50`)  
**Scope:** Milestone 2 (`server/geminiService.ts`, `server/apiMiddleware.ts`, `server/demoData.ts`, `src/services/api.ts`)  
**Verdict:** **APPROVE**

---

## 1. Observation

### A. Error Status Codes and Error Codes
- In `server/geminiService.ts` (lines 18-34, 260-264):
  ```typescript
  export class MissingApiKeyError extends Error {
    code = 'MISSING_API_KEY';
    statusCode = 401;
    constructor(message = 'GEMINI_API_KEY is not configured on the server.') {
      super(message);
      this.name = 'MissingApiKeyError';
    }
  }

  export class AiServiceError extends Error {
    code = 'AI_SERVICE_ERROR';
    statusCode = 502;
    constructor(message = 'AI service failed or returned invalid response.') {
      super(message);
      this.name = 'AiServiceError';
    }
  }
  ```
  And in `callGeminiWithSchema` (lines 260-263):
  ```typescript
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new MissingApiKeyError('GEMINI_API_KEY is not configured on the server.');
  }
  ```
- In `server/apiMiddleware.ts`:
  - Lines 101-114 (`/api/analyze`):
    ```typescript
    if (err instanceof MissingApiKeyError || err.code === 'MISSING_API_KEY') {
      return sendJson(res, 401, {
        success: false,
        error: err.message,
        code: 'MISSING_API_KEY',
      });
    }
    if (err instanceof AiServiceError || err.code === 'AI_SERVICE_ERROR') {
      return sendJson(res, 502, {
        success: false,
        error: err.message,
        code: 'AI_SERVICE_ERROR',
      });
    }
    ```
  - Lines 217-228 (`/api/test`): returns 401 with `code: 'MISSING_API_KEY'` on missing key, and 502 with `code: 'AI_SERVICE_ERROR'` on service failures.
  - Lines 308-319 (`/api/review`): returns 401 with `code: 'MISSING_API_KEY'` on missing key, and 502 with `code: 'AI_SERVICE_ERROR'` on service failures.
- Direct runtime probe confirmation via `node .agents/teamwork/auditor_m2_1/verify_m2.mjs`:
  ```
  Probe 1 (Live analyze without key): {
    status: 401,
    success: false,
    code: 'MISSING_API_KEY',
    error: 'GEMINI_API_KEY is not configured on the server.'
  }
  ```
- Direct runtime confirmation of AI service error (502 `AI_SERVICE_ERROR`):
  When invoked with an invalid API key, `/api/analyze`, `/api/test`, and `/api/review` returned HTTP 502 with:
  `{ success: false, error: 'AI service failed after 2 retries: ...', code: 'AI_SERVICE_ERROR' }`.

### B. Rule R3 Adherence (No Silent Substitution on Live API Failure)
- In `vite.config.ts` (lines 4, 11):
  ```typescript
  import { problemPilotApiPlugin } from './server/apiMiddleware.ts';
  ...
  plugins: [
    react(),
    tailwindcss(),
    problemPilotApiPlugin(),
  ],
  ```
  `problemPilotApiPlugin()` is instantiated with default options (`{}`), which sets `fallbackOnError = false` (line 48 in `server/apiMiddleware.ts`).
- When `fallbackOnError` is `false`, error catches in `/api/analyze`, `/api/test`, and `/api/review` immediately return HTTP 401 or HTTP 502 and **never** substitute mock or demo data.
- Automated verification in `tests/empirical-challenger-m2-2.test.ts` (line 231):
  `it('verifies server NEVER silently substitutes mock or demo data on live failures')` executes against all 3 endpoints and asserts `res.status === 502`, `data.success === false`, `data.code === 'AI_SERVICE_ERROR'`, and `data.data === undefined`. Test passed.

### C. Scenario A and Scenario B Fixtures
- In `server/demoData.ts`:
  - `DEMO_SCENARIO_A` (lines 19-182):
    - Problem: `"An AI app that helps college students study better."`, target user `"College students"`.
    - Analysis: `problemClarity.status: 'vague'`, with 3 missing details, 3 unverified assumptions (`ASM-1`, `ASM-2`, `ASM-3`), 2 evidence gaps, workarounds, and highest risk uncertainty.
    - Experiment: `EXP-1` past-behavior retrospective interview, non-leading questions, supporting signals, weakening signals, limitations, estimated effort (`1.5 hours total`).
    - Findings: `[]` (empty array).
    - Decision Brief: `verdict: 'INSUFFICIENT EVIDENCE'`, `unsupportedClaims` populated, `0` supported claims.
  - `DEMO_SCENARIO_B` (lines 239-288) & `DEMO_SCENARIO_B_FINDINGS` (lines 184-237):
    - 4 empirical findings (`FND-B1` to `FND-B4`) capturing existing tool satisfaction (Google Calendar, Notion) and procrastination root causes.
    - Decision Brief: `verdict: 'REVISE THE HYPOTHESIS'`, `updatedProblemStatement: 'Refined focus: Investigate specific niche conditions...'`, 2 contradictory findings listed, 3 unsupported claims, clear next steps.
  - Resolver `getDemoScenario(scenario)` (lines 290-296): correctly resolves `'A'`, `'vague_study'`, `'B'`, and `'contradictory_study'`.
- Matches PRD § R1, § R3, and § R5 requirements completely.

### D. Client API Service (`src/services/api.ts`)
- Implements `analyzeProblem`, `generateTest`, `reviewEvidence` wrapping `/api/analyze`, `/api/test`, `/api/review` via `postJson`.
- Guarantees return of strongly typed `ApiResponse<T>` with `success`, `data`, `error`, `code`, `isLive`, and `isDemo`.
- Intercepts non-2xx status codes and network faults without unhandled promise rejections.

### E. Build & Test Verification
- `npm run build` (`tsc -b && vite build`):
  - Exit code: 0
  - Output: `✓ 1968 modules transformed. dist/index.html (0.66 kB), dist/assets/index.css (38.74 kB), dist/assets/index.js (307.08 kB). ✓ built in 944ms.`
  - Zero TypeScript errors.
- `npm run lint` (`oxlint`):
  - Exit code: 0
  - Output: `Found 0 warnings and 0 errors. Finished in 82ms on 35 files.`
- `npm test` (`vitest run`):
  - Exit code: 0
  - Test files: 12 passed (12)
  - Tests: 262 passed (262)
  - Duration: 4.40s
  - All test suites (`state-machine.test.ts`, `server-api.test.ts`, `verdict-logic.test.ts`, `prd-scenarios.test.ts`, `adversarial-hashing-persistence.test.ts`, `empirical-challenger-m1.test.ts`, `empirical-challenger-m2.test.ts`, `empirical-challenger-m2-2.test.ts`) passed cleanly.

### F. Security & Integrity Verification
- Client bundle key isolation: An automated sweep across all files in `dist/` verified zero occurrences of `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `process.env`, or `@google/genai`.
- Integrity Audit:
  - No hardcoded test responses in source code.
  - No facade implementations; the full Gemini SDK client with bounded retry and JSON schemas is active.
  - No shortcuts or silent fallbacks.

---

## 2. Logic Chain

1. **Error Handling Architecture**:
   - `server/geminiService.ts` defines explicit typed exceptions `MissingApiKeyError` (status 401, code `MISSING_API_KEY`) and `AiServiceError` (status 502, code `AI_SERVICE_ERROR`).
   - When `GEMINI_API_KEY` is not present in the server environment, `callGeminiWithSchema` throws `MissingApiKeyError` prior to issuing any network requests.
   - `server/apiMiddleware.ts` catches `MissingApiKeyError` and returns HTTP 401 with `{ success: false, error: ..., code: 'MISSING_API_KEY' }`.
   - When Gemini API returns an error, times out (>25000ms), or exhausts its 2 schema retries, `callGeminiWithSchema` throws `AiServiceError`.
   - `server/apiMiddleware.ts` catches `AiServiceError` and returns HTTP 502 with `{ success: false, error: ..., code: 'AI_SERVICE_ERROR' }`.
   - Therefore, Requirement 1 is fully satisfied.

2. **Rule R3 Compliance**:
   - The application mounts `problemPilotApiPlugin()` in `vite.config.ts`, which defaults `fallbackOnError` to `false`.
   - In `server/apiMiddleware.ts`, mock/demo data is only returned when `isDemo: true` is explicitly present in the request body.
   - When `isDemo` is false or omitted, any failure in `analyzeProblem`, `generateValidationExperiment`, or `reviewEvidence` enters the `catch` block where `fallbackOnError` is false, executing the status 401/502 return paths.
   - Independent verification in `tests/empirical-challenger-m2-2.test.ts` proved that live failures never return 200 or mock payloads.
   - Therefore, Rule R3 is strictly preserved.

3. **Scenario Fixtures Compliance**:
   - `DEMO_SCENARIO_A` and `DEMO_SCENARIO_B` in `server/demoData.ts` provide complete, deterministic mock graphs matching the PRD specifications for both the vague idea critique and the contradictory evidence review.
   - Epistemic rules are enforced: `validateDecisionBrief` rejects `"PROVEN"` and `"GUARANTEED MARKET DEMAND"`.
   - Scenario B evaluates deterministically to `REVISE THE HYPOTHESIS`.
   - Therefore, Requirement 3 is fully satisfied.

4. **Build and Test Health**:
   - `npm run build` succeeds with zero errors, producing optimized production bundles.
   - `npm run lint` yields 0 errors and 0 warnings.
   - `npm test` passes all 262 tests across 12 test files with zero failures.
   - Therefore, Requirement 4 is fully satisfied.

---

## 3. Caveats

- **Backward-Compatibility Modules**: `src/server/apiMiddleware.ts` and `src/server/geminiService.ts` exist alongside canonical `server/*` modules. These wrapper modules configure `fallbackOnError: true` specifically to support legacy test suites (`tests/server-api.test.ts`) that test safe heuristic fallbacks. The canonical server mounted by Vite in `vite.config.ts` uses `./server/apiMiddleware.ts` directly with `fallbackOnError: false`.
- **Live Gemini API Execution**: Under live production conditions with a valid key, Google Gemini calls depend on upstream Google API availability. In the event of network disruption or quota exhaustion, the system will deterministically surface HTTP 502 with code `AI_SERVICE_ERROR` as verified by our stress tests.

---

## 4. Conclusion

The Milestone 2 implementation satisfies all technical, architectural, security, and integrity requirements:
- Server-side Gemini API key isolation is guaranteed; zero client key leakage.
- Missing API keys return HTTP 401 with code `MISSING_API_KEY`.
- AI service errors and timeouts return HTTP 502 with code `AI_SERVICE_ERROR`.
- Rule R3 is strictly upheld: live API calls never silently substitute mock or demo data.
- Scenario A and Scenario B fixtures match PRD specifications with 100% determinism.
- Production build passes cleanly with 0 TypeScript errors.
- 262/262 tests pass across all 12 test suites.

**Explicit Verdict: APPROVE**

---

## 5. Verification Method

To independently verify this review:

1. **Run full automated test suite**:
   ```bash
   npm test
   ```
   *Expected*: 12 test files pass, 262 tests pass, 0 failures.

2. **Run TypeScript typecheck and production build**:
   ```bash
   npm run build
   ```
   *Expected*: `tsc -b && vite build` completes in < 1.5s with exit code 0.

3. **Run linter**:
   ```bash
   npm run lint
   ```
   *Expected*: 0 warnings and 0 errors.

4. **Run independent auditor probe**:
   ```bash
   node .agents/teamwork/auditor_m2_1/verify_m2.mjs
   ```
   *Expected*: All probes pass, outputting `Probe 1: status 401 MISSING_API_KEY`, `Probe 2: status 200 isDemo: true`, and `--- ALL AUDIT PROBES PASSED SUCCESSFULLY ---`.

5. **Verify zero client bundle key leakage**:
   ```powershell
   Get-ChildItem -Recurse dist/ | Select-String -Pattern "GEMINI_API_KEY|GOOGLE_API_KEY|@google/genai"
   ```
   *Expected*: 0 matches found.
