# Milestone 2 Review & Adversarial Challenge Report

## Review Summary

**Verdict**: APPROVE  
**Milestone**: Milestone 2 (Server API Middleware & Gemini AI Service)  
**Reviewer**: reviewer_m2_1 (teamwork_preview_reviewer)  
**Parent Agent**: orchestrator_1 (5609cc52-02be-4823-a17e-c62c60741a50)  

---

## 1. Observation

1. **`server/geminiService.ts`**:
   - Lines 1: `import { GoogleGenAI, Type } from '@google/genai';`
   - Lines 18-34: `MissingApiKeyError` defines `statusCode = 401`, `code = 'MISSING_API_KEY'`; `AiServiceError` defines `statusCode = 502`, `code = 'AI_SERVICE_ERROR'`.
   - Lines 40-171: Schemas (`ANALYSIS_SCHEMA`, `EXPERIMENT_SCHEMA`, `DECISION_BRIEF_SCHEMA`) formulated using `@google/genai` `Type` enum with all mandatory schema properties declared in `required`.
   - Lines 254-334: `callGeminiWithSchema` instantiates `const ai = new GoogleGenAI({ apiKey })`. Calls `ai.models.generateContent({ model: 'gemini-2.5-flash', contents: currentPrompt, config: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.2 } })`.
   - Lines 265, 272, 325-328: Retry policy bounded by `for (let attempt = 0; attempt <= maxRetries; attempt++)` where `maxRetries = 2` (3 total attempts). Appends contextual prompt retry hints on retryable errors.
   - Lines 315-322: Fast-fail on `err.status === 403` or `PERMISSION_DENIED` or `suspended` without consuming retries.
   - Lines 284-290: 25-second timeout enforced via `Promise.race` with unreferenced timer.

2. **`server/apiMiddleware.ts`**:
   - Lines 21-39: Body parser enforces 512KB payload ceiling (`body.length > 512 * 1024`) and catches malformed JSON.
   - Lines 58-121: `POST /api/analyze` validates `problem.idea` (min 5 characters). On `isDemo: true`, returns `getDemoScenario(demoScenario).analysis` with `isDemo: true, isLive: false`. On live requests without key, throws and returns HTTP 401 `MISSING_API_KEY`. On service failure, returns HTTP 502 `AI_SERVICE_ERROR`.
   - Lines 123-230: `POST /api/test` validates `analysis` or `assumptions` array presence. Returns HTTP 400 on omission.
   - Lines 232-321: `POST /api/review` validates `findings` array presence. Normalizes verdicts to canonical 3 categories (`INSUFFICIENT EVIDENCE`, `REVISE THE HYPOTHESIS`, `EVIDENCE SUPPORTS FURTHER TESTING`).
   - Lines 339-351: `problemPilotApiPlugin` attaches middleware via `configureServer` (dev) and `configurePreviewServer` (preview).

3. **`vite.config.ts`**:
   - Line 4: `import { problemPilotApiPlugin } from './server/apiMiddleware.ts';`
   - Line 11: `problemPilotApiPlugin()` registered in `plugins`.
   - Lines 13-18: `server: { port: 5173 }, preview: { port: 5173 }`.

4. **`src/services/api.ts`**:
   - Lines 15-65: `postJson` safely traps network rejections, non-JSON server responses, and HTTP error codes, returning strongly-typed `ApiResponse<T>`.

5. **`server/demoData.ts`**:
   - Lines 19-296: High-fidelity deterministic fixtures for `DEMO_SCENARIO_A` (Vague Study App) and `DEMO_SCENARIO_B` (Contradictory Findings with 4 distinct findings). Contains zero occurrences of forbidden claims (`"PROVEN"` or `"GUARANTEED MARKET DEMAND"`).

6. **Test & Build Execution Results**:
   - `npm test`: Exited 0. 10 test files passed (186 tests passed, 0 failed, duration 2.56s).
   - `npm run build`: `tsc -b && vite build` exited 0. Bundle built in 801ms. 0 TypeScript errors.
   - `npm run lint`: `oxlint` exited 0. Found 0 warnings and 0 errors across 35 files.

---

## 2. Logic Chain

1. Per PROJECT.md § Architecture and the Milestone 2 dispatch, the server backend requires Connect HTTP middleware mounted into Vite handling `/api/analyze`, `/api/test`, and `/api/review` backed by `@google/genai`.
2. As verified in Observation 1, `server/geminiService.ts` correctly utilizes `GoogleGenAI` from `@google/genai`, enlists the `Type` enum for structured schemas, sets `responseMimeType: "application/json"`, and enforces a strictly bounded 2-retry policy.
3. As verified in Observation 2, `server/apiMiddleware.ts` correctly implements input validation, returns HTTP 400 for invalid inputs, HTTP 401 for missing credentials, and HTTP 502 for AI service failures. When `isDemo: true`, it deterministically serves demo fixtures without leaking mock data into live error responses.
4. As verified in Observation 3, `vite.config.ts` mounts `problemPilotApiPlugin()` on both `configureServer` (dev) and `configurePreviewServer` (preview), and locks both to port `5173`.
5. As verified in Observation 4, `src/services/api.ts` isolates all network calls behind safe typed boundaries that never bubble unhandled promise rejections to UI components.
6. As verified in Observation 6, the entire test suite (186 unit and integration tests across 10 files) passes with zero errors, and production typecheck and bundle build succeed cleanly.

---

## 3. Findings & Adversarial Stress-Test Results

### Integrity Assessment: PASS (0 Violations)
- **Hardcoded test expectations in source code**: None. Dynamic AI caller and heuristic evaluators contain no hardcoded bypasses.
- **Facade implementations**: None. Real `@google/genai` SDK instantiation, JSON schema generation, and HTTP Connect middleware implemented.
- **Shortcuts / Silent mock substitutions on live errors**: None. Live failures explicitly return HTTP 401 or HTTP 502. Mock data is returned only when `isDemo: true` is explicitly requested.

### Minor Findings & Observations

#### Finding 1 (Minor / Robustness): Sentence-level `PROVEN` prohibition regex
- **Location**: `server/geminiService.ts:236`
- **Issue**: Line 236 checks `if (textPayload.includes('"PROVEN"') || textPayload.includes('GUARANTEED MARKET DEMAND'))`. Because of literal quotes around `"PROVEN"`, if an AI model emits a sentence like `"The hypothesis is proven by finding 1"`, `textPayload.includes('"PROVEN"')` does not catch it unless the word itself is wrapped in double quotes. Note that the top-level `verdict` itself is already strictly restricted to the 3 permitted categories on line 230, so this only affects secondary claim strings.
- **Recommendation for Future Hardening**: Check claims with word-boundary regex `/\bPROVEN\b/i.test(textPayload)` in Milestone 5 hardening.

#### Finding 2 (Minor / HTTP Semantics): Body size limit returns HTTP 500
- **Location**: `server/apiMiddleware.ts:26-28` & `324-335`
- **Issue**: When incoming body exceeds 512KB, `parseJsonBody` rejects with `'Payload too large'`, which the top-level catch maps to HTTP 500 rather than HTTP 413 `PAYLOAD_TOO_LARGE`.
- **Recommendation**: Map `'Payload too large'` error to status code 413.

#### Finding 3 (Minor): Promise.race timeout does not cancel underlying socket
- **Location**: `server/geminiService.ts:284-290`
- **Issue**: In `callGeminiWithSchema`, when the 25-second timeout rejects, the ongoing `generateContent` promise continues in background until the socket closes.
- **Recommendation**: Pass an `AbortSignal` if supported by future `@google/genai` SDK releases.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 deliverables fully satisfy all requirements specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`:
1. Proper `@google/genai` SDK usage (`GoogleGenAI`, `Type`, strict JSON schema).
2. Clean bounded 2-retry policy (3 attempts total) with prompt adjustments and fast-fail on auth errors.
3. Proper Vite dev and preview server middleware mounting on port 5173.
4. Clean client API service (`src/services/api.ts`).
5. All 186 tests passing, 0 lint errors, and 100% clean production build.
6. Zero integrity violations detected.

Work may proceed to Milestone 3 (Analytical Workspace & 5-Stage Form Views).

---

## 5. Verification Method

To independently reproduce the verification:
1. **Run full automated test suite**:
   ```powershell
   npm test
   ```
   *Expected*: 10 test files passed, 186 tests passed, 0 failed.
2. **Run TypeScript check and bundle build**:
   ```powershell
   npm run build
   ```
   *Expected*: `tsc -b && vite build` completes with exit code 0.
3. **Run linter**:
   ```powershell
   npm run lint
   ```
   *Expected*: 0 errors, 0 warnings.
4. **Inspect canonical server files**:
   - `server/geminiService.ts`
   - `server/apiMiddleware.ts`
   - `server/demoData.ts`
   - `vite.config.ts`
   - `src/services/api.ts`
