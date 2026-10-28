## 2026-10-28T08:13:29Z
You are worker_m2, a teamwork_preview_worker.
Your working directory is: c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\worker_m2
Your parent is orchestrator_1 (conversation ID: 5609cc52-02be-4823-a17e-c62c60741a50).

Read:
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\PROJECT.md
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\TEST_READY.md
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\types\index.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\tests\server-api.test.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Ownership:
You exclusively own:
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\server\apiMiddleware.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\server\geminiService.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\server\demoData.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\vite.config.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\services\api.ts
- c:\Users\Tanmay\OneDrive\Desktop\KickToTech\src\server\ (update or wrap legacy files if needed)
DO NOT touch `tests/` or `TEST_INFRA.md`.

Tasks:
Milestone 2: Server API Middleware & Gemini AI Service:
1. Implement `server/geminiService.ts`:
   - Use official `@google/genai` SDK (`GoogleGenAI` class).
   - Read `process.env.GEMINI_API_KEY` exclusively on the server side.
   - Enforce structured JSON schema outputs (`responseMimeType: "application/json"`).
   - Implement bounded 2-retry policy when AI returns unparseable or schema-invalid JSON.
   - Error handling: if `GEMINI_API_KEY` is missing, return HTTP 401 with code `MISSING_API_KEY`. If AI service times out or errors, return HTTP 502 with code `AI_SERVICE_ERROR`.
   - STRICT INTEGRITY REQUIREMENT: NEVER silently substitute mock/demo data when a live API call fails! Live errors must return explicit HTTP error codes and descriptive messages.
2. Implement `server/demoData.ts`:
   - Complete, deterministic mock payloads for Scenario A (Vague study app) and Scenario B (Contradictory findings).
   - Ensure these fixtures are returned ONLY when `isDemo: true` is explicitly requested.
3. Implement `server/apiMiddleware.ts`:
   - Connect/HTTP middleware mounted into Vite dev server and preview server in `vite.config.ts`.
   - Handle endpoints:
     - `POST /api/analyze` -> validates problem input, returns `{ success: true, data: AnalysisResult }` or error.
     - `POST /api/test` -> validates problem & assumptions, returns `{ success: true, data: ValidationExperiment }` or error.
     - `POST /api/review` -> validates hypothesis & findings, returns `{ success: true, data: DecisionBrief }` or error. Strictly enforces one of 3 verdicts: `INSUFFICIENT EVIDENCE`, `REVISE THE HYPOTHESIS`, `EVIDENCE SUPPORTS FURTHER TESTING` (strictly no "PROVEN").
4. Configure `vite.config.ts`:
   - Mount `apiMiddleware` in both `configureServer` (dev) and `configurePreviewServer` (preview), ensuring single command `npm run dev` serves frontend and backend on port 5173.
5. Implement `src/services/api.ts`:
   - Client fetch service for `/api/analyze`, `/api/test`, and `/api/review`.
   - Strong typing with `src/types/index.ts`, handling error responses without unhandled rejections.
6. Run build & tests:
   - `npm run build` (tsc -b && vite build)
   - `npm test`
   - `npm run lint`
   Verify all tests pass with 0 errors.

Write handoff.md in your working directory and message parent (5609cc52-02be-4823-a17e-c62c60741a50).
