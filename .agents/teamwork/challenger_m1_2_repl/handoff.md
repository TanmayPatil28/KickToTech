# Empirical Challenger Handoff Report: Adversarial Verification of Dirty Hashing & LocalStorage Persistence

**Agent:** `challenger_m1_2_repl` (teamwork_preview_challenger)  
**Parent:** `orchestrator_1` (Conversation ID: `5609cc52-02be-4823-a17e-c62c60741a50`)  
**Date:** 2026-10-28T08:12:00Z  
**Verdict:** **APPROVE**  
**Type:** Hard Handoff (Adversarial Review Complete)

---

## 1. Observation

Direct observations, file paths, line numbers, tool executions, and empirical test outcomes:

1. **Deterministic Dirty Hashing (`src/store/stateMachine.ts:119-135`):**
   - Implemented via 32-bit FNV-1a hex hashing across 5 normalized fields:
     ```typescript
     export function computeProblemHash(input: ProblemInput): string {
       const normalized = [
         input.idea?.trim() ?? '',
         input.targetUser?.trim() ?? '',
         input.context?.trim() ?? '',
         input.constraints?.trim() ?? '',
         (input.existingObservations ?? input.existingEvidence ?? '')?.trim(),
       ].join('\u001F');

       let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis (2166136261)
       for (let i = 0; i < normalized.length; i++) {
         hash ^= normalized.charCodeAt(i);
         hash = Math.imul(hash, 0x01000193); // FNV-1a 32-bit prime (16777619)
       }
       return (hash >>> 0).toString(16).padStart(8, '0');
     }
     ```
   - Normalization applies `.trim()` to all input fields and supports `existingObservations ?? existingEvidence` for backward compatibility.
   - Hash representation is strictly formatted as an 8-character lowercase hexadecimal string (`(hash >>> 0).toString(16).padStart(8, '0')`).

2. **Auto-Healing Dirty Detection (`src/store/stateMachine.ts:141-157, 476-508`):**
   - Function `isProblemDirty(current, baselineOrHash)` evaluates:
     - When `baselineOrHash` is `string`: `computeProblemHash(current) !== baselineOrHash`.
     - When `baselineOrHash` is null or undefined: returns `false`.
     - When `baselineOrHash` is a `ProblemInput` object: compares trimmed `idea`, `targetUser`, and `context`.
   - In React hook `useValidationStore` (`line 476-508`):
     - `updateProblem` checks:
       `const dirty = prev.analyzedProblemHash !== null ? computeProblemHash(nextProblem) !== prev.analyzedProblemHash : isProblemDirty(nextProblem, prev.lastAnalyzedProblem);`
     - Modifying any of the 5 formulation fields post-analysis sets `isDirty: true` and logs a `HYPOTHESIS_EDITED` event to the ledger.
     - Reverting fields back to match `prev.analyzedProblemHash` immediately re-evaluates `dirty` to `false`, achieving auto-healing without requiring re-analysis.

3. **LocalStorage Persistence & Schema Integrity (`src/store/stateMachine.ts:22-23, 346-447`):**
   - Storage constants:
     - `export const STORAGE_KEY = 'problempilot_state_v1';` (`line 22`)
     - `export const STORAGE_SCHEMA_VERSION = 1;` (`line 23`)
   - Schema validation function `isValidPersistedState(obj)` (`line 346-372`) strictly enforces:
     - Non-null, non-array object
     - `obj.version === 1`
     - `obj.currentStage` or `obj.stage` is a valid member of `STAGE_ORDER`
     - `obj.problem` is an object with string `idea`, `targetUser`, and `context`
     - `obj.findings` is an array
   - Corrupted JSON recovery (`line 392-424`):
     - `try { ... JSON.parse(raw) ... } catch (err) { clearStoredState(); return createInitialValidationState(); }`
     - If JSON syntax is invalid, or if `isValidPersistedState` returns `false`, `clearStoredState()` is called to purge corrupted entries and `createInitialValidationState()` returns a clean initial `DRAFT` state without throwing unhandled exceptions.
   - Storage API error tolerance:
     - `persistState` catches storage quota errors (`QuotaExceededError`) and private browsing restrictions (`SecurityError`), logging a warning and returning `false` without crashing the application.
     - `getStorage()` safely detects absence of `localStorage` (Node / SSR / sandbox) and falls back gracefully.

4. **Reset & Abandon Workflow (`src/store/stateMachine.ts:731-738`, `src/store/evidenceStore.ts:363-376`):**
   - `resetCase` and `abandonCase` call `clearStoredState()` (removing `problempilot_state_v1`) and reset in-memory state to `createInitialValidationState()`.
   - Resulting state has:
     - `currentStage: 'DRAFT'`
     - `problem`: all empty strings (`INITIAL_PROBLEM_INPUT`)
     - `analysis: null`, `experiment: null`, `findings: []`, `decisionBrief: null`, `verdict: null`
     - `isDirty: false`, `isProblemStale: false`, `analyzedProblemHash: null`
     - Clean hash synchronization: `isProblemDirty(resetState.problem, null)` evaluates to `false`.

5. **Empirical Test Suite Execution Results:**
   - Dedicated adversarial stress test suite created and executed in `tests/empirical-challenger-m1.test.ts`:
     - Test suite results: `10 passed (10)`, duration: `497ms`.
   - Full project test suite execution (`npx vitest run`):
     - `Test Files: 10 passed (10)`
     - `Tests: 186 passed (186)`
     - `Duration: 1.79s`
   - Production bundler build (`npm run build`):
     - `tsc -b && vite build` exited with code 0 (`built in 817ms`).
   - Linter (`npm run lint`):
     - `oxlint` reported 0 errors across 31 files.

---

## 2. Logic Chain

1. **From Whitespace, Non-ASCII & Extreme Length Requirements to FNV-1a Resilience:**
   - *Observation:* `computeProblemHash` applies `String.prototype.trim()` on each field before concatenation with `\u001F`.
   - *Empirical Test:* Tested leading/trailing ASCII spaces, tabs, newlines (`\r\n`), and Unicode whitespace (`\u00A0` non-breaking space, `\u2003` em space, `\u3000` ideographic space, `\uFEFF` zero-width non-breaking space).
   - *Inference:* All ECMAScript whitespace is stripped by `.trim()`, producing identical hashes for outer whitespace variations. Conversely, internal whitespace modifications (e.g. single space to double space) change the concatenated string and produce a different hash, correctly marking the state dirty.
   - *Empirical Multilingual Test:* Tested Arabic (RTL), Hindi (Devanagari), Japanese (Kanji/Kana), Russian (Cyrillic), Greek, Math symbols, and Emojis with surrogate pairs and ZWJ sequences (`👨‍👩‍👧‍👦`).
   - *Inference:* JavaScript strings encode characters in UTF-16 code units. `normalized.charCodeAt(i)` safely processes code units `0..0xFFFF`. Combined with `Math.imul(hash, 0x01000193)` and `hash >>> 0`, the FNV-1a computation is fully deterministic and overflow-safe across all Unicode inputs.
   - *Empirical Length Test:* Tested inputs of 10,000, 100,000, and 1,000,000 characters. 1MB string hashed in ~13ms, and flipping a single character at index 999,999 in the 1M string immediately triggered a hash difference and `isDirty: true`.
   - *Collision Resistance:* A 1,000-iteration single-character mutation benchmark yielded 1,000 distinct 32-bit hex hashes with 0 collisions.

2. **From Problem Mutation / Reversion to Auto-Healing Lifecycle:**
   - *Observation:* `useValidationStore.updateProblem` calculates dirty state by evaluating `computeProblemHash(nextProblem) !== prev.analyzedProblemHash`.
   - *Empirical Test:* Mutated `idea`, `targetUser`, `context`, `constraints`, and `existingObservations` simultaneously (`isDirty` flipped from `false` to `true`). Sequentially reverted each field one by one back to baseline.
   - *Inference:* When the final field was reverted, `computeProblemHash(reverted)` exactly matched `analyzedProblemHash`, resetting `isDirty` to `false`. Auto-healing operates symmetrically across all fields without requiring re-analysis.

3. **From LocalStorage Failure Modes to Graceful Recovery:**
   - *Observation:* `loadStoredState()` wraps `getItem` and `JSON.parse` in a `try...catch` block and checks `isValidPersistedState(parsed)`.
   - *Empirical Test:* Injected malformed payloads: unclosed JSON, XML strings, `undefined`, `null`, primitive numbers/strings, missing schema version, incompatible schema version (`version: 999`), invalid stages, non-string problem fields, non-array findings, and simulated throwing storage APIs (`QuotaExceededError`, `SecurityError`).
   - *Inference:* In every adversarial case, `loadStoredState()` caught the condition, purged the invalid key via `clearStoredState()`, and returned a pristine `createInitialValidationState()`. The application never threw an unhandled exception or entered a corrupt state.

4. **From Reset / Abandon Requests to Clean Slate Invariants:**
   - *Observation:* `resetCase()` calls `clearStoredState()` and resets state to `createInitialValidationState()`.
   - *Empirical Test:* Stored an advanced case at stage `FINDINGS_ENTERED` with dirty problem data. Executed reset.
   - *Inference:* The storage entry was purged, and the returned state had `currentStage: 'DRAFT'`, all problem inputs blank, `isDirty: false`, `isProblemStale: false`, and `analyzedProblemHash: null`. Calling `isProblemDirty(resetState.problem, resetState.analyzedProblemHash)` returned `false`.

---

## 3. Caveats

1. **Theoretical Delimiter Collision via `\u001F`:**
   - `computeProblemHash` separates normalized fields with ASCII Unit Separator `\u001F` (`line 126`) without escaping occurrences of `\u001F` within field contents.
   - If an adversarial user enters `idea: "a\u001Fb"` and `targetUser: "c"`, it produces `"a\u001Fb\u001Fc\u001F\u001F"`, identical to `idea: "a"` and `targetUser: "b\u001Fc"`.
   - In production web form usage, `\u001F` is a non-printable control character that standard users cannot input; however, for absolute mathematical collision resistance, escaping `\u001F` in inputs (e.g. `replace(/\u001F/g, '\\u001F')`) would eliminate this theoretical edge case.

2. **Dual-Mode `isProblemDirty` Behavior:**
   - When `isProblemDirty` is called with a hash string (`typeof baselineOrHash === 'string'`), it checks all 5 problem fields (`idea`, `targetUser`, `context`, `constraints`, `existingObservations`).
   - When called with a `ProblemInput` object (`line 151-157`), it compares only `idea`, `targetUser`, and `context` (retained for backward compatibility with prototype test fixtures).
   - In `useValidationStore`, once analysis is run, `analyzedProblemHash` is populated, so the 5-field hash check is always used.

3. **Discrepancy in `domain/stateMachine.ts` Fallback Guard:**
   - In `src/store/stateMachine.ts`, transitioning from `TEST_DEFINED` to `FINDINGS_ENTERED` allows 0 findings (Anti-Catch-22 fix allowing users to enter Stage 4 to begin logging evidence).
   - In `src/domain/stateMachine.ts` line 86, the legacy guard still checks `!state.findings || state.findings.length === 0`.
   - The primary application store uses `src/store/stateMachine.ts`, so UI workflows proceed unimpeded; however, any legacy components relying directly on `domain/stateMachine.ts:canTransitionTo` should be deprecated in favor of `store/stateMachine.ts`.

---

## 4. Conclusion

**Verdict: APPROVE**

The implementation of `computeProblemHash`, auto-healing dirty detection, and LocalStorage persistence in `src/store/stateMachine.ts` and `src/store/evidenceStore.ts` fulfills all requirements:
1. `computeProblemHash` is deterministic, whitespace-tolerant (including Unicode whitespace), supports non-ASCII scripts and surrogate-pair emojis, processes extreme length inputs (1MB in ~13ms), and demonstrates 100% collision resistance across tested mutation sets.
2. Auto-healing dirty detection functions bidirectionally across all fields: edits flag `isDirty: true`, and reverting edits restores `isDirty: false`.
3. LocalStorage persistence adheres strictly to key `problempilot_state_v1` and schema version 1.
4. Corrupted JSON, primitive payloads, malformed schema versions, and storage API exceptions recover cleanly to pristine initial `DRAFT` without throwing unhandled exceptions.
5. `resetCase` and `abandonCase` purge persisted storage and return a clean `DRAFT` state with matching clean hash.
6. All 186 Vitest tests, TypeScript compilation (`tsc -b`), production build (`npm run build`), and Oxlint pass with zero errors.

---

## 5. Verification Method

To independently verify all findings and test suites:

1. **Run Full Vitest Suite (including empirical challenger tests):**
   ```powershell
   npx vitest run
   ```
   *Expected outcome:* 10 test files pass, 186 tests pass, 0 failed.

2. **Run Dedicated Challenger Stress Suite:**
   ```powershell
   npx vitest run tests/empirical-challenger-m1.test.ts --reporter=verbose
   ```
   *Expected outcome:* 10 tests pass, covering Unicode spaces, multilingual scripts, 1M char benchmarks, 1000-mutation collision tests, corrupted JSON recovery, and clean reset.

3. **Run Production Build:**
   ```powershell
   npm run build
   ```
   *Expected outcome:* `tsc -b && vite build` succeeds with exit code 0.

4. **Run Linter:**
   ```powershell
   npm run lint
   ```
   *Expected outcome:* 0 errors.
