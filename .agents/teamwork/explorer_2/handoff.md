# Handoff Report: Architecture, Testing Harness & UI Composition

**Agent:** explorer_2  
**Role:** teamwork_preview_explorer  
**Parent:** orchestrator_1 (5609cc52-02be-4823-a17e-c62c60741a50)  
**Date:** 2026-10-28  

---

## 1. Observation

1. **Requirements in `ORIGINAL_REQUEST.md`:**
   - Lines 12–23: Five-stage core validation workflow (`DRAFT` -> `ANALYZED` -> `TEST_DEFINED` -> `FINDINGS_ENTERED` -> `EVIDENCE_REVIEWED`) with explicit assumptions (ID, risk, status), experiment design, structured findings, and exactly three primary verdicts: `INSUFFICIENT EVIDENCE`, `REVISE THE HYPOTHESIS`, `EVIDENCE SUPPORTS FURTHER TESTING` (banning `"PROVEN"` and `"GUARANTEED"`).
   - Lines 24–29: State transitions & evidence integrity: Guarded transitions, dirty problem statement flagging previous analysis as outdated, preserving entered findings when navigating backwards, reset confirmation.
   - Lines 30–35: Server-side analysis endpoints (`/api/analyze`, `/api/test`, `/api/review`) using Google Gemini API (`GEMINI_API_KEY`) without client-side key leakage, bounded retry on malformed outputs, missing credentials handling, deterministic demo mode with persistent disclaimer `SAMPLE SCENARIO — NOT REAL RESEARCH`, no silent substitution on errors.
   - Lines 36–40: Two-column responsive workspace layout adhering to anti-slop guidelines: neutral background, clear typography, purposeful status colors, zero rainbow AI gradients, zero decorative fake graphs, responsive down to mobile viewports.
   - Lines 41–44: 14 test scenarios specified in hackathon PRD (vague idea, specific problem, empty inputs, malformed AI, missing credentials, unsupported findings, contradictory findings, empty findings, state transitions, hypothesis editing, mobile layout, demo mode, reset, build/runtime check).
2. **Repository Baseline in `KickToTech`:**
   - `package.json`: Contains `@google/genai` (v2.31.0), `@tailwindcss/vite` (v4.3.3), `clsx` (v2.1.1), `lucide-react` (v1.63.0), `react` (v19.3.1), `react-dom` (v19.3.1), `tailwindcss` (v4.3.3), `oxlint` (v1.89.0), `typescript` (v7.0.2), `vite` (v8.3.5).
   - `node -v`: `v22.23.1` (Node 22 LTS).
   - `npm run build`: Output verified: `tsc -b && vite build` built in 228ms with 0 errors.
   - Currently missing: `vitest` in `devDependencies`, `zod` for shared schema validation, backend server middleware in `vite.config.ts`, state machine store, and 5-stage UI components.
3. **Gemini SDK Inspection (`@google/genai`):**
   - Verified that `GoogleGenAI` class is directly exported by `@google/genai` and exposes `ai.models.generateContent` supporting JSON schema outputs (`responseMimeType: "application/json"`).

---

## 2. Logic Chain

1. **Server Architecture & Key Isolation (Observations 1 & 2):**
   - Requirement R3 mandates server-side API endpoints (`/api/analyze`, `/api/test`, `/api/review`) utilizing `GEMINI_API_KEY` without exposing keys to the browser.
   - Vite's dev server (`configureServer`) and preview server (`configurePreviewServer`) in `vite.config.ts` can mount connect/http middleware in Node.js.
   - Therefore, implementing `server/apiMiddleware.ts` integrated directly into `vite.config.ts` enables a single command `npm run dev` to serve both frontend and backend on the same port (`http://localhost:5173`) with zero CORS complications and absolute client-side key isolation.
2. **Testing Strategy across all 14 PRD Scenarios (Observation 1):**
   - The 14 scenarios span unit tests (clarity evaluation, invalid transitions, dirty state invalidation), integration tests (API schemas, malformed AI retries, missing credentials), and verdict evaluation (unsupported, contradictory, empty findings).
   - Vitest can be added to `package.json` (`npm i -D vitest`) to run `npm test` (`vitest run`).
   - In addition, Node 22's built-in `node:test` runner provides a zero-dependency fallback, guaranteeing that tests can run in any environment.
   - Designing an automated test suite (`tests/prd-scenarios.test.ts`, `tests/state-machine.test.ts`, `tests/verdict-logic.test.ts`) covers all 14 scenarios directly.
3. **Anti-Slop UI & Responsive Layout (Observation 1):**
   - The two-column workspace splits the screen into: Left = Active Stage Task & Forms; Right = Persistent Core Hypothesis, Assumption Matrix, and Chronological Evidence Ledger.
   - At `< 1024px`, the grid stacks or toggles via tabbed view, maintaining touch targets >= 44px, using `min-h-[100dvh]`, and preventing horizontal overflow.
   - Aesthetic uses Stone/Slate neutral palette, tactile `active:scale-[0.97]` buttons, and strictly avoids AI purple gradients and fake decorative charts.
4. **Boundary Failure Modes & Integrity (Observation 1):**
   - If `GEMINI_API_KEY` is absent: return HTTP 401 with `{ code: 'MISSING_API_KEY' }`; UI alerts user and provides 1-click Demo Mode switch.
   - If AI returns malformed JSON: bounded retry (max 2 attempts); if failing, return 502 error; never silently substitute mock data.
   - If problem statement is edited: hash check flags `isDirty = true` and displays warning banner that analysis is outdated.

---

## 3. Caveats

1. **Live Gemini API Rate Limits:** In live testing with Gemini API, rate limits or latency might occur. The server must enforce timeouts (e.g. 15s) with `AbortSignal` and explicit user feedback.
2. **Demo Mode Isolation:** Demo mode mocks must be fully self-contained in `server/demoData.ts` and `src/services/demoData.ts` so they function 100% offline without network or API keys.
3. **Dependencies:** The project will need `vitest` (devDependency) and `zod` installed by the Worker.

---

## 4. Conclusion

The architecture, testing strategy, module boundaries, and UI composition for ProblemPilot are fully defined and documented in:
`c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\explorer_2\architecture_and_test_analysis.md`.

Key decisions recommended for implementation:
- **Server:** Vite server middleware pattern in `server/apiMiddleware.ts` for unified `npm run dev` on Node 22, reading `process.env.GEMINI_API_KEY` with zero client exposure.
- **Testing:** Vitest suite covering all 14 PRD scenarios mapped to Tiers 1–4, runnable via `npm test`.
- **UI:** Two-column responsive anti-slop analytical workspace (Left: Stage Task; Right: Evidence Ledger & Context) with responsive mobile stacking and tactile micro-interactions.
- **State Machine:** Pure transition function with strict prerequisite guards, dirty state detection, and safe `localStorage` synchronization.

---

## 5. Verification Method

To verify these architectural conclusions independently:
1. **Review Specification:**
   - Inspect `c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\explorer_2\architecture_and_test_analysis.md` for complete schemas, state machine matrix, and 14-scenario mappings.
2. **Verify Node 22 & Build Status:**
   - Run `node -v` in project root -> Confirms Node 22.
   - Run `npm run build` -> Confirms baseline clean build.
3. **Verify API Key Protection:**
   - Confirm server middleware reads `process.env.GEMINI_API_KEY` on Node side, while client code only uses relative `/api/*` endpoints.
