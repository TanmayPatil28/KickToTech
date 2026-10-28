# Milestone 2 Adversarial Verification Handoff Report

## 1. Observation

### Codebase Inspection
- `server/apiMiddleware.ts`:
  - Lines 50–56: `createApiMiddleware` checks `if (req.method !== 'POST' || !url?.startsWith('/api/')) { return next(); }`. Non-POST methods and non-API paths safely bypass the middleware and fall through.
  - Lines 21–39: `parseJsonBody` enforces a 512KB payload ceiling (`if (body.length > 512 * 1024) reject(new Error('Payload too large'))`) and rejects invalid JSON syntax with `new Error('Malformed JSON payload')`.
  - Lines 58–69: Endpoint `/api/analyze` validates `!problem || !problem.idea || typeof problem.idea !== 'string' || problem.idea.trim().length < 5`, returning HTTP 400 `INVALID_INPUT` if unfulfilled.
  - Lines 123–133: Endpoint `/api/test` validates `!analysis && (!assumptions || !Array.isArray(assumptions))`, returning HTTP 400 `INVALID_INPUT`.
  - Lines 232–242: Endpoint `/api/review` validates `!findings || !Array.isArray(findings)`, returning HTTP 400 `INVALID_INPUT`.
  - Lines 101–114, 217–228, 308–320: Error mapping returns explicit HTTP 401 `MISSING_API_KEY` for missing environment keys and HTTP 502 `AI_SERVICE_ERROR` for AI failures/timeouts when `fallbackOnError: false` (canonical mode in `vite.config.ts`).
  - Lines 324–335: Top-level error catch returns HTTP 500 for malformed payloads or internal errors, preventing unhandled exceptions from terminating the Node server process.
- `server/geminiService.ts`:
  - Lines 254–334: `callGeminiWithSchema` implements a bounded 2-retry policy (`maxRetries = 2`, 3 attempts total). On validation failure or unparseable JSON, it retries with prompt feedback (`[RETRY ATTEMPT ${attempt + 1}/${maxRetries}]: Previous output had issues: ${err.message}`). If all 3 attempts fail, it throws `AiServiceError` with message: `"AI service failed after 2 retries: ..."`.
  - Lines 315–322: Fails fast on authorization errors (HTTP 403, `PERMISSION_DENIED`, account suspension) without wasting retries.
  - Lines 219–243: `validateDecisionBrief` restricts verdicts strictly to:
    - `"INSUFFICIENT EVIDENCE"`
    - `"REVISE THE HYPOTHESIS"`
    - `"EVIDENCE SUPPORTS FURTHER TESTING"`
    And explicitly enforces:
    `if (textPayload.includes('"PROVEN"') || textPayload.includes('GUARANTEED MARKET DEMAND')) errors.push('Response contains strictly forbidden claims: PROVEN or GUARANTEED MARKET DEMAND')`.

### Empirical Test Execution
- Authored test suite `tests/empirical-challenger-m2.test.ts` (58 test cases across 7 test suites):
  1. HTTP Method Filtering & Routing Isolation: 18 tests (GET, PUT, DELETE, PATCH, OPTIONS on all endpoints, non-API routes, plugin hooks).
  2. Malformed JSON, Non-Object Primitives & Extreme Payloads: 7 tests (truncated JSON, `null`, string, number, array, empty body, >512KB payload).
  3. `/api/analyze` Input Boundary Stress: 10 tests (missing problem, empty object, empty idea, whitespace idea, <5 chars, non-string, Demo Scenario A/B, 401 on missing key).
  4. `/api/test` Input Boundary Stress: 5 tests (missing analysis/assumptions, non-array assumptions, Demo Mode, 401 on missing key).
  5. `/api/review` Input Validation & Verdict Categories: 8 tests (missing findings, non-array findings, empty findings `[]` -> `INSUFFICIENT EVIDENCE`, subjective praise -> `INSUFFICIENT EVIDENCE`, contradictory findings -> `REVISE THE HYPOTHESIS`, credible supporting findings -> `EVIDENCE SUPPORTS FURTHER TESTING`, strictly 3 allowed categories, zero forbidden claims).
  6. Bounded 2-Retry Policy & Error Handling: 6 tests (0 calls on missing key, exactly 3 attempts on schema failure, recovery on retry 2, fail-fast on 403 auth error, timeout enforcement).
  7. Direct Schema Validator & Epistemic Prohibitions: 4 tests (`validateAnalysis`, `validateExperiment`, `validateDecisionBrief` allowed verdicts and prohibition of `PROVEN`/`GUARANTEED MARKET DEMAND`).
- Command: `npx vitest run tests/empirical-challenger-m2.test.ts`
  Result: `Test Files: 1 passed (1), Tests: 58 passed (58), Duration: 700ms`
- Command: `npm test`
  Result: `Test Files: 12 passed (12), Tests: 262 passed (262), Duration: 4.53s`
- Command: `npm run lint` (`oxlint`)
  Result: `0 errors`
- Command: `npm run build` (`tsc -b && vite build`)
  Result: `✓ built in 1.80s` (exited with code 0, 0 TypeScript errors)

---

## 2. Logic Chain

1. **HTTP Method Filtering & Isolation**:
   - `server/apiMiddleware.ts` line 53 strictly guards on `req.method !== 'POST' || !url?.startsWith('/api/')`.
   - In `tests/empirical-challenger-m2.test.ts`, all combinations of GET, PUT, DELETE, PATCH, and OPTIONS on `/api/analyze`, `/api/test`, and `/api/review` were sent. In every instance, the middleware called `next()`, bypassed execution, and did not invoke any AI service or mutate state.

2. **Malformed JSON & Stress Payloads**:
   - Sending invalid JSON syntax triggers `new Error('Malformed JSON payload')`, which is caught at line 325 and returns HTTP 500 `{ success: false, error: 'Malformed JSON payload' }`.
   - Sending JSON primitives (`null`, `123`, `true`, `[1, 2, 3]`, `""`) is handled safely: non-object structures either trigger input validation (HTTP 400 `INVALID_INPUT`) or top-level error trapping (HTTP 500) without crashing the server or throwing unhandled promise rejections.
   - Sending payloads exceeding 512KB triggers line 27 and is rejected with HTTP 500 `Payload too large`.

3. **Input Boundary Validation**:
   - `/api/analyze`: Rejects empty objects, empty idea strings, whitespace strings, strings under 5 characters, and non-strings with HTTP 400 `INVALID_INPUT`.
   - `/api/test`: Rejects missing analysis and non-array assumptions with HTTP 400 `INVALID_INPUT`.
   - `/api/review`: Rejects missing or non-array findings with HTTP 400 `INVALID_INPUT`.

4. **Verdict Categories & Epistemic Prohibitions**:
   - Empirical tests verified that `/api/review` produces strictly one of the 3 allowed categories:
     - `INSUFFICIENT EVIDENCE` (empty findings, subjective praise only, or single isolated observation)
     - `REVISE THE HYPOTHESIS` (contradictory findings / counter-evidence)
     - `EVIDENCE SUPPORTS FURTHER TESTING` (credible recurring behavioral friction observations)
   - Schema validation in `validateDecisionBrief` explicitly rejects forbidden claims: any JSON response containing token `"PROVEN"` or `"GUARANTEED MARKET DEMAND"` is invalidated and rejected.

5. **Bounded 2-Retry Policy Verification**:
   - Using a mock of `@google/genai`, `callGeminiWithSchema` was stress-tested across failure modes:
     - Schema parsing failure: exactly 3 invocations occurred (1 initial attempt + 2 retries with corrective prompt annotations) before throwing `AiServiceError`.
     - Partial failure with recovery: attempt 1 failed schema validation, attempt 2 succeeded, returning the validated payload with exactly 2 invocations.
     - Fast-fail authorization: HTTP 403 `PERMISSION_DENIED` halted immediately after 1 invocation without burning retries.
     - Missing API key: threw `MissingApiKeyError` immediately with 0 SDK invocations.
     - Timeout: timed out and threw `AiServiceError` when SDK response exceeded `timeoutMs`.

6. **Full Project Health**:
   - All 262 test cases across all 12 test suites passed.
   - Production bundle built cleanly with zero TypeScript errors.

---

## 3. Caveats

- **Network-Isolated Mock Testing**: The Gemini API calls in `tests/empirical-challenger-m2.test.ts` were mocked at the `@google/genai` SDK boundary to deterministically verify the bounded retry loop, schema error feedback, timeout handling, and 403 fast-fail paths without incurring live quota usage or non-deterministic network latency.
- **Server Environment Keys**: In the test environment, when `GEMINI_API_KEY` is not provided, the canonical middleware strictly returns HTTP 401 `MISSING_API_KEY` for live requests as specified in `PROJECT.md`, while demo requests (`isDemo: true`) execute deterministically without network access.

---

## 4. Conclusion

### Explicit Verdict: **APPROVE**

The Server API Middleware (`server/apiMiddleware.ts`), Gemini AI Service (`server/geminiService.ts`), and Demo Fixtures (`server/demoData.ts`) meet and exceed all Milestone 2 requirements:
- Bounded 2-retry policy is verified to execute exactly 3 attempts on schema parsing errors before cleanly failing with `AiServiceError`.
- Fast-fail on HTTP 403 authorization errors prevents retry exhaustion.
- HTTP methods (GET, PUT, DELETE, PATCH, OPTIONS) cleanly fall through without touching AI logic.
- Malformed JSON, non-object primitives, empty inputs, and oversized payloads are safely trapped without crashing the server.
- Review verdict categories are strictly restricted to the 3 permitted categories (`INSUFFICIENT EVIDENCE`, `REVISE THE HYPOTHESIS`, `EVIDENCE SUPPORTS FURTHER TESTING`) with strict prohibition of `"PROVEN"` and `"GUARANTEED MARKET DEMAND"`.
- All 262 tests pass, linter passes with 0 errors, and TypeScript production build succeeds cleanly.

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Run the Challenger Adversarial Test Suite**:
   ```bash
   npx vitest run tests/empirical-challenger-m2.test.ts
   ```
   *Expected*: 58 passed tests across 7 test suites.

2. **Run the Entire Test Suite**:
   ```bash
   npm test
   ```
   *Expected*: 12 test files passed, 262 tests passed, 0 failures.

3. **Run TypeScript Build**:
   ```bash
   npm run build
   ```
   *Expected*: `tsc -b && vite build` completes with exit code 0.

4. **Run Linter**:
   ```bash
   npm run lint
   ```
   *Expected*: 0 errors.

5. **Invalidation Conditions**:
   - Any endpoint returns 200 mock data on live error without `isDemo: true`.
   - Any verdict category outside the 3 allowed categories is accepted.
   - Malformed JSON payload crashes Node or throws unhandled promise rejection.
   - Non-POST request executes Gemini SDK call.
   - Retry count exceeds 2 retries (3 attempts total) on schema failure.
