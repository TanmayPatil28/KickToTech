# ProblemPilot Test Infrastructure Specification

**Document Version:** 1.0.0  
**Author:** test_writer_1 (Quality Assurance & Test Specialist)  
**Date:** 2026-10-28  
**Scope:** Automated Test Architecture, Test Runners, 4-Tier Test Suite, Execution Commands, and 14 PRD Validation Scenarios.

---

## 1. Architecture & Testing Strategy Overview

ProblemPilot employs a fast, deterministic, dual-compatible test suite built on **Vitest 5.0** and fully compatible with **Node.js 22 native test runner**. The entire test suite executes in less than 2 seconds without requiring external browser binary downloads or flaky UI drivers.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PROBLEMPILOT AUTOMATED TEST HARNESS                  │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 1: Feature Coverage (>=5 per core functional capability)          │
│  • Input validation, trimming, field requirements                      │
│  • 5-Stage linear forward state machine guards                         │
│  • Subjective praise filtering (isSubjectiveOpinionOnly)               │
│  • 3 Verdict categories (INSUFFICIENT, REVISE, FURTHER_TESTING)        │
│  • Server Connect/HTTP middleware endpoints (/api/*)                   │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 2: Boundary, Extreme & Corner Cases                               │
│  • Empty strings, whitespace-only, extreme lengths (10,000+ chars)     │
│  • Boundary lengths (9 vs 10 chars for idea; 2 vs 3 for target user)   │
│  • Zero findings submitted -> INSUFFICIENT_EVIDENCE                    │
│  • Single finding edge cases & ties between support and contradiction  │
│  • Malformed JSON payloads & unsupported HTTP methods                  │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 3: Cross-Feature Combinations & State Invalidation                │
│  • Problem modification post-analysis triggering isProblemStale        │
│  • Stale analysis blocking progression to Stage 4 & Stage 5            │
│  • Backwards navigation preserving all entered findings & ledger state │
│  • Assumption status mapping updates across multiple findings          │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 4: Real-World Scenarios (The 14 PRD Hackathon Scenarios)          │
│  • Scenario 1: Vague Idea Critique (Incomplete / Vague Clarity)        │
│  • Scenario 2: Specific Problem Decomposition (Clear Clarity & Risk)   │
│  • Scenario 3: Empty Inputs & Form Validation Guarding                 │
│  • Scenario 4: Malformed AI Structured Output & Fallback Resilience    │
│  • Scenario 5: Missing GEMINI_API_KEY Handling (No Silent Crash)       │
│  • Scenario 6: Unsupported Findings -> INSUFFICIENT EVIDENCE           │
│  • Scenario 7: Contradictory Findings -> REVISE THE HYPOTHESIS         │
│  • Scenario 8: Subjective / Empty Findings -> INSUFFICIENT EVIDENCE    │
│  • Scenario 9: Guarded State Transitions (Strict Sequence)             │
│  • Scenario 10: Problem Statement Modification & Outdated Flagging     │
│  • Scenario 11: Mobile Viewport & Ergonomics Contracts                 │
│  • Scenario 12: Deterministic Demo Mode (Scenarios A & B Disclaimer)   │
│  • Scenario 13: Case Reset & Abandonment Safety                        │
│  • Scenario 14: Build, Typecheck, and Node 22 Runtime Verification     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Test File Inventory & Responsibilities

| Test File | Test Count | Scope & Coverage |
|---|---|---|
| `tests/state-machine.test.ts` | 33 tests | Problem validation, 5-stage transition sequence, step-skipping prevention, boundary lengths, dirty-state invalidation, backward navigation data preservation. |
| `tests/verdict-logic.test.ts` | 23 tests | Subjective opinion detection, 3 verdict categories, counter-evidence priority, assumption status updates, epistemic constraints (`PROVEN` / `GUARANTEED` prohibitions), volume stress. |
| `tests/server-api.test.ts` | 15 tests | Vite Connect middleware HTTP endpoints (`/api/analyze`, `/api/test`, `/api/review`), demo scenario dispatch, bad request validation, malformed JSON handling, Gemini API fallback. |
| `tests/prd-scenarios.test.ts` | 18 tests | End-to-end contract validation for all 14 PRD Hackathon scenarios, demo mode indicators, reset cleanliness, type contract verification. |
| `src/domain/__tests__/stateMachine.test.ts` | 10 tests | Co-located unit tests for stateMachine helper functions. |
| `src/domain/__tests__/evidenceEvaluator.test.ts` | 6 tests | Co-located unit tests for heuristic evaluator. |
| **Total Test Suite** | **105 tests** | **100% Pass Rate across all 6 test suites.** |

---

## 3. How to Execute Tests

### 3.1 Standard Test Execution
```bash
npm test
```
Runs the full Vitest suite in single-run mode and outputs summary results.

### 3.2 Verbose Test Execution
```bash
npx vitest run --reporter=verbose
```
Runs all test suites with granular per-test assertions and timing breakdown.

### 3.3 Running Specific Test Suites
```bash
npx vitest run tests/state-machine.test.ts
npx vitest run tests/verdict-logic.test.ts
npx vitest run tests/server-api.test.ts
npx vitest run tests/prd-scenarios.test.ts
```

### 3.4 Build and Typecheck Verification
```bash
npm run build
```
Executes `tsc -b && vite build` ensuring 0 TypeScript errors and successful production bundling.

### 3.5 Linting Verification
```bash
npm run lint
```
Executes `oxlint` across all source and test files.

---

## 4. Expected Output Derivation & Epistemic Oracles

Every test assertion in the test suite is derived from an authoritative source:
1. **State Machine Transitions:** Derived from mathematical properties of guarded finite state machines specified in `PROJECT.md §2` and `spec_inventory.md §2.2`.
2. **Clarity & Ambiguity Ratings:** Derived from `ORIGINAL_REQUEST.md §R1` and verified against `DEMO_SCENARIO_A` (vague study app) and high-fidelity machine shop scenarios.
3. **Verdict Synthesis:** Derived from `Lead Directive §5` and `ORIGINAL_REQUEST.md §R1` (strictly 3 allowed categories, zero "PROVEN" or "GUARANTEED" output).
4. **Server Middleware Contracts:** Derived from Connect HTTP middleware specifications in `PROJECT.md §Interface Contracts`.
5. **The 14 PRD Scenarios:** Derived from `architecture_and_test_analysis.md §1.2` and verified end-to-end.

---

## 5. Epistemic Constraints & Prohibited Output Policies

The test harness enforces strict validation on AI and heuristic outputs:
- **No Over-claiming:** Verdicts are asserted to never contain `"PROVEN"`, `"GUARANTEED MARKET DEMAND"`, or `"VALIDATED AS A CERTAINTY"`.
- **Subjective Praise Quarantine:** Polite enthusiasm (e.g. `"everyone loves this idea"`) is classified as subjective interpretation and rejected from elevating verdicts above `INSUFFICIENT_EVIDENCE`.
- **Counter-evidence Priority:** When contradictory evidence is recorded, verdicts prioritize `REVISE_THE_HYPOTHESIS` to prevent confirmation bias.
- **Fail-Safe Fallbacks:** When external AI APIs are unconfigured or encounter permission/network errors, server endpoints return structured fallback responses with `isLive: false` without crashing.
