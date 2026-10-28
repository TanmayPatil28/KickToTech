# KickToTech / ProblemPilot — Codebase & Technology Stack Investigation Report

**Date:** 2026-10-28  
**Investigator:** explorer_1 (Teamwork Explorer)  
**Parent:** orchestrator_1 (ID: `5609cc52-02be-4823-a17e-c62c60741a50`)  
**Target Directory:** `c:\Users\Tanmay\OneDrive\Desktop\KickToTech`  
**Node.js Runtime:** v22.23.1  
**npm Version:** 10.9.8  

---

## Executive Summary

The KickToTech repository currently contains a freshly initialized **Vite 8 + React 19 + TypeScript + Tailwind CSS v4** template. Crucially, several key packages required by the hackathon requirements are **already installed in `node_modules` and declared in `package.json`**—including `@google/genai` (v2.31.0), `@tailwindcss/vite` (v4.3.3), `tailwindcss` (v4.3.3), `lucide-react` (v1.63.0), and `clsx` (v2.1.1).

However, **they are not yet wired up or utilized in code**:
1. `vite.config.ts` currently only includes `@vitejs/plugin-react` and lacks the `@tailwindcss/vite` plugin as well as dev server API middleware for `/api/analyze`, `/api/test`, and `/api/review`.
2. `src/index.css` contains default Vite template styles and has not imported Tailwind CSS v4 (`@import "tailwindcss";`) or defined the anti-slop analytical color palette.
3. TypeScript configuration enforces `"erasableSyntaxOnly": true` (TS 5.8+ / 7 feature). This is a critical architectural constraint: **TypeScript `enum` declarations are banned** by the compiler and must be replaced with string union types and `as const` object maps.
4. The application currently renders the default Vite + React boilerplate in `src/App.tsx`.
5. No additional heavy dependencies (such as Express, Fastify, or Framer Motion) are required. Vite's native dev server middleware plugin + pure CSS/Tailwind transitions + native Node 22 features provide the most robust, zero-conflict, high-performance architecture.

---

## 1. Deep Inspection of Core Configuration & Project Structure

### 1.1 `package.json`
```json
{
  "name": "temp-vite",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google/genai": "^2.31.0",
    "@tailwindcss/vite": "^4.3.3",
    "clsx": "^2.1.1",
    "lucide-react": "^1.63.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@types/node": "^24.19.2",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "oxlint": "^1.89.0",
    "typescript": "~7.0.2",
    "vite": "^8.3.5"
  }
}
```
**Observations:**
- React is version 19.3.1.
- Vite is version 8.3.5.
- TypeScript is version ~7.0.2.
- The package name is currently `"temp-vite"` (should be renamed to `"problempilot"`).

### 1.2 TypeScript Configuration (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)
- `tsconfig.json` references `./tsconfig.app.json` and `./tsconfig.node.json`.
- `tsconfig.app.json` targets `ES2023`, library `["ES2023", "DOM"]`, `moduleResolution: "bundler"`, `noEmit: true`, `jsx: "react-jsx"`, and includes `src`.
- **CRITICAL CONSTRAINT:** Line 22 of `tsconfig.app.json` and line 19 of `tsconfig.node.json`:
  ```json
  "erasableSyntaxOnly": true
  ```
  **Impact:** In TypeScript, `--erasableSyntaxOnly` strictly forbids syntax that cannot simply be erased by an ECMAScript transformer. Specifically:
  - ❌ `enum Stage { DRAFT, ANALYZED, ... }` will throw a compiler error (`TS1437`).
  - ❌ Parameter properties in constructor (`constructor(public name: string)`) will throw a compiler error.
  - ❌ `namespace` declarations will throw a compiler error.
  - ✅ **Mandatory Pattern:** Use standard TypeScript type unions and const arrays:
    ```typescript
    export type WorkflowStage =
      | 'DRAFT'
      | 'ANALYZED'
      | 'TEST_DEFINED'
      | 'FINDINGS_ENTERED'
      | 'EVIDENCE_REVIEWED';

    export const STAGES: readonly WorkflowStage[] = [
      'DRAFT',
      'ANALYZED',
      'TEST_DEFINED',
      'FINDINGS_ENTERED',
      'EVIDENCE_REVIEWED'
    ] as const;
    ```

### 1.3 `vite.config.ts`
```typescript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
```
**Observations:**
- Missing `@tailwindcss/vite` plugin registration.
- Missing API dev-server middleware.

### 1.4 `index.html`
- Contains `<title>temp-vite</title>`.
- Needs update to: `<title>ProblemPilot — Evidence-Based Problem Validation</title>`.
- Clean viewport and `<div id="root"></div>`.

### 1.5 `src/` Directory Structure
- `src/App.css` (2891 bytes) — Default Vite template styling.
- `src/App.tsx` (3646 bytes) — Default Vite counter and link template.
- `src/assets/` — `hero.png`, `react.svg`, `vite.svg`.
- `src/index.css` (2169 bytes) — Default layout and typography.
- `src/main.tsx` (230 bytes) — React 19 root render.

---

## 2. Evaluation of Required Capabilities & Missing Packages

### 2.1 Modern Anti-Slop Styling & Icons
| Item | Status | Evaluation |
|---|---|---|
| **Tailwind CSS v4** | Installed (`^4.3.3`) | Verified via Node import. Missing `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss";` in `src/index.css`. |
| **Lucide Icons** | Installed (`lucide-react@^1.63.0`) | Verified functional with tree-shakable React 19 icons (`ShieldAlert`, `CheckCircle2`, `AlertTriangle`, `ArrowRight`, `RotateCcw`, `FileText`, `Sparkles`, `Layers`, `FlaskConical`, `Compass`). |
| **Class utilities** | Installed (`clsx@^2.1.1`) | Clean conditional class composition. |
| **Framer Motion vs Lightweight CSS** | Not installed | **Strong Recommendation: DO NOT install Framer Motion.** Framer Motion often produces peer dependency warnings with React 19.3. Tailwind CSS transitions + CSS hardware-accelerated transitions satisfy 100% of the User Anti-Slop Guidelines (`ease-out`, under 300ms duration, tactile `scale(0.97)` active states, spring bezier `cubic-bezier(0.16, 1, 0.3, 1)`, and `prefers-reduced-motion` compliance) without bundle bloat or hydration issues. |

### 2.2 Server-Side API Endpoints (`/api/analyze`, `/api/test`, `/api/review`)
| Architecture Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Vite Dev & Preview Server Plugin Middleware** (Single-Process Fullstack) | - Runs automatically during `npm run dev` and `npm run preview`<br>- Single port (`5173`) for frontend + API<br>- Zero CORS configuration needed<br>- Zero dual-process orchestration (`concurrently`/npm scripts)<br>- `GEMINI_API_KEY` stays strictly in Node environment | Requires writing a simple ~40-line connect middleware plugin in Vite | **RECOMMENDED & OPTIMAL** |
| **Separate Express or Fastify server** | Standard Node HTTP server | Requires running 2 servers concurrently, configuring Vite proxy, handling port collisions, managing two terminal processes | Not recommended |

**Proof of Feasibility:**
Vite plugins provide `configureServer(server)` and `configurePreviewServer(server)`:
```typescript
// Example Vite API plugin
export function problemPilotApiPlugin(): Plugin {
  return {
    name: 'problempilot-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          await handleApiRequest(req, res);
        } else {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          await handleApiRequest(req, res);
        } else {
          next();
        }
      });
    }
  };
}
```
In Node 22, reading JSON request bodies is accomplished with a clean helper:
```typescript
async function parseJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  let data = '';
  for await (const chunk of req) data += chunk;
  return JSON.parse(data || '{}');
}
```

### 2.3 Google Gemini SDK (`@google/genai`)
| Item | Status | Evaluation |
|---|---|---|
| **`@google/genai`** | Installed (`^2.31.0`) | Verified functional in Node 22. Official Google Gen AI SDK. |
| **API Key Security** | Fully supported | Kept strictly on the server inside the Vite middleware handler reading `process.env.GEMINI_API_KEY`. The browser client never touches or sees the secret key. |
| **Structured Output** | Fully supported | Supports `responseMimeType: "application/json"` and `responseSchema` or direct JSON schema prompts with strict schema validation. |
| **Error Handling & Fallback** | Required | Bounded retry (1-2 attempts) on malformed output, plus transparent fallback to deterministic demo data when `GEMINI_API_KEY` is not configured or in Demo Mode. |

### 2.4 State Management & Local Storage Persistence
| Item | Status | Evaluation |
|---|---|---|
| **React 19 Context + useReducer** | Native | Fully sufficient for the 5-stage validation state machine (`DRAFT` -> `ANALYZED` -> `TEST_DEFINED` -> `FINDINGS_ENTERED` -> `EVIDENCE_REVIEWED`). |
| **LocalStorage Persistence** | Native | `localStorage.getItem('problempilot_session_v1')` and `localStorage.setItem(...)` with schema versioning. |
| **Stale State Detection** | Logic-based | Automatically tags prior analyses/tests as `OUTDATED / STALE` when problem inputs are modified in later stages. |
| **Confirmation Reset** | Native modal | Confirmed modal to reset state cleanly. |

---

## 3. Node 22 Runtime Compatibility & Verification Commands

### 3.1 Node 22 Runtime Verification
- Verified Node.js: `v22.23.1` (Satisfies Node 22 requirement).
- Verified npm: `10.9.8`.
- Verified native TypeScript stripping: `node --experimental-strip-types` runs smoothly.
- Verified native `.env` loading: `process.loadEnvFile` exists natively in Node 22.

### 3.2 Verification Commands
1. **Typecheck & Production Build:**
   ```bash
   npm run build
   # Executes: tsc -b && vite build
   # Verified: Completed in 239ms with zero errors.
   ```
2. **Linting Check:**
   ```bash
   npm run lint
   # Executes: oxlint
   # Verified: Completed in 59ms with zero warnings or errors.
   ```
3. **Application Development Server:**
   ```bash
   npm run dev
   # Starts Vite dev server on http://localhost:5173 (or assigned port)
   ```
4. **Native Node 22 Test Suite:**
   ```bash
   node --experimental-strip-types --test tests/**/*.test.ts
   # Can run automated unit tests for state machine, schema validators, and demo scenarios.
   ```

---

## 4. Recommendations on Minimal, High-Reliability Packages

### 4.1 Packages to Install: **ZERO Additional Production Packages Needed!**
The current `package.json` already contains all necessary packages:
- UI & Styling: `react@^19.3.1`, `react-dom@^19.3.1`, `tailwindcss@^4.3.3`, `@tailwindcss/vite@^4.3.3`, `lucide-react@^1.63.0`, `clsx@^2.1.1`
- AI SDK: `@google/genai@^2.31.0`
- Types & Bundler: `vite@^8.3.5`, `@vitejs/plugin-react@^6.1.2`, `typescript@~7.0.2`, `@types/node@^24.19.2`, `oxlint@^1.89.0`

### 4.2 Why Avoid Common Bloatware?
1. **Avoid `framer-motion`**:
   - Risk: Peer dependency collisions with React 19.3.
   - Solution: Tailwind CSS transitions + CSS spring cubic-bezier (`cubic-bezier(0.16, 1, 0.3, 1)`) provide immediate physical tactile feedback (`:active:scale-[0.97]`), 60fps performance, and perfect adherence to anti-slop guidelines.
2. **Avoid `express` / `fastify`**:
   - Risk: Dual-process orchestration, port collision, CORS issues, extra deployment scripts.
   - Solution: Vite plugin connect middleware (`configureServer` and `configurePreviewServer`) handles `/api/analyze`, `/api/test`, and `/api/review` on the exact same origin as the frontend. `npm run dev` works out of the box with one single command.
3. **Avoid `uuid`**:
   - Web API and Node 22 both feature native `crypto.randomUUID()`.
4. **Avoid `dotenv`**:
   - Vite automatically loads `.env` files via `loadEnv()`, and Node 22 natively provides `process.loadEnvFile()`.

### 4.3 Optional Development / Testing Packages (If Desired)
If automated integration/unit tests require a browser or DOM simulator:
- `@types/node` is already installed.
- Node's native test runner (`node:test` + `node:assert`) can run with `node --experimental-strip-types --test` with 0 extra packages.

---

## 5. Architectural Directory Layout Proposal for Implementation

To implement ProblemPilot cleanly, the team should adopt this modular structure under `src/`:

```
c:\Users\Tanmay\OneDrive\Desktop\KickToTech\
├── server/                          # Server-side API handlers (Node 22 / Vite middleware)
│   ├── apiPlugin.ts                 # Vite middleware plugin for /api/*
│   ├── geminiClient.ts              # Server-side GoogleGenAI wrapper with API key safety
│   ├── promptTemplates.ts           # System prompts & schema directives
│   ├── schemaValidators.ts          # Server-side JSON schema validators & sanitizers
│   └── demoData.ts                  # Deterministic Scenario A & Scenario B datasets
├── src/
│   ├── types/                       # Shared domain TypeScript models (strictly no enums!)
│   │   ├── workflow.ts              # Stage, ProblemInput, ClarityRating, VerdictCategory
│   │   ├── analysis.ts              # Assumption, EvidenceGap, AnalysisResult
│   │   ├── experiment.ts            # ValidationExperiment, InquiryQuestion
│   │   └── evidence.ts              # Finding, FindingSourceType, Verdict
│   ├── context/
│   │   └── ValidationContext.tsx    # State machine, LocalStorage persistence, stale detection
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx           # Anti-slop top navigation with Demo Scenario toggle & Reset
│   │   │   ├── StageStepper.tsx     # 5-stage guarded progress indicator
│   │   │   └── DemoBadge.tsx        # Persistent "SAMPLE SCENARIO — NOT REAL RESEARCH" pill
│   │   ├── workspace/
│   │   │   ├── Stage1Define.tsx     # Problem definition form with guidance
│   │   │   ├── Stage2Critique.tsx   # Clarity banner, assumption cards, evidence gap list
│   │   │   ├── Stage3Test.tsx       # Experiment design, non-leading inquiry questions
│   │   │   ├── Stage4Findings.tsx   # Structured finding recorder with source type tagger
│   │   │   └── Stage5Verdict.tsx    # Decision brief, verdict classification, updated statement
│   │   ├── ledger/
│   │   │   ├── EvidenceLedger.tsx   # Secondary column live evidence ledger & hypothesis summary
│   │   │   └── AssumptionStatusTracker.tsx # Live assumption verification status pills
│   │   └── ui/
│   │       ├── Button.tsx           # Tactile button (:active:scale-[0.97])
│   │       ├── Card.tsx             # Restrained border card
│   │       ├── Badge.tsx            # Semantic status badges (neutral, warning, success)
│   │       └── ConfirmModal.tsx     # Session reset confirmation dialog
│   ├── services/
│   │   └── apiClient.ts             # Client-side API fetch client (/api/analyze, /api/test, /api/review)
│   ├── App.tsx                      # Main workspace orchestrator (two-column layout)
│   ├── index.css                    # Tailwind CSS v4 directives & anti-slop color tokens
│   └── main.tsx                     # React 19 root
├── tests/                           # Verification tests for state machine & validation rules
├── .env.example                     # Sample environment file with GEMINI_API_KEY
├── vite.config.ts                   # Configured with @tailwindcss/vite and apiPlugin
└── README.md                        # Documentation with setup, demo instructions, and verification
```

---

## 6. Key Takeaways & Recommendations for the Team

1. **Do not run `npm install` for heavy dependencies.** The project is already well-equipped with `@google/genai`, `tailwindcss`, `@tailwindcss/vite`, `lucide-react`, and `clsx`.
2. **Beware `"erasableSyntaxOnly": true`.** Do not use `enum`. Use `type` and `as const` instead to prevent compilation failures.
3. **Use Vite middleware for `/api/*` endpoints.** This ensures single-command developer startup (`npm run dev`) on Node 22 and guarantees API keys never leak to the client browser.
4. **Follow Anti-Slop UI standards:** Neutral zinc/slate backgrounds, no rainbow gradients, no fake decorative charts, tactile `transform: scale(0.97)` on active buttons, and strict 5-stage evidence progression.
