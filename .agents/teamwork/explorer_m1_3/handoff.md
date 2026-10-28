# Milestone 1: Explorer Handoff Report (Dirty State Hashing & LocalStorage Persistence)

**Author:** `explorer_m1_3`  
**Recipient:** `orchestrator_1` (`5609cc52-02be-4823-a17e-c62c60741a50`)  
**Date:** 2026-10-28T07:35:00Z  
**Working Directory:** `c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\explorer_m1_3`  
**Primary Artifact:** `c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\explorer_m1_3\persistence_strategy.md`

---

## 1. Observation

1. **Current Codebase State**:
   - `src/types/index.ts` lines 116–131 defines `CaseState` with `isProblemStale: boolean`, `lastAnalyzedProblem?: ProblemInput`, and `stage: WorkflowStage`.
   - `src/domain/stateMachine.ts` lines 36–42 uses a naive multi-string equality check `isProblemDirty`:
     ```typescript
     const ideaChanged = current.idea.trim() !== lastAnalyzed.idea.trim();
     const userChanged = current.targetUser.trim() !== lastAnalyzed.targetUser.trim();
     const contextChanged = current.context.trim() !== lastAnalyzed.context.trim();
     return ideaChanged || userChanged || contextChanged;
     ```
     This omits `constraints` and `existingEvidence`/`existingObservations`, and does not compute or store a persistent hash.
   - `src/store/evidenceStore.ts` line 15 uses a non-standard storage key `problempilot_case_v1` instead of the required `problempilot_state_v1`.
   - `src/store/evidenceStore.ts` lines 41–54 contains a partial JSON parsing block that catches errors but lacks structural schema validation or self-healing dirty validation.
2. **Target Requirements & Architecture**:
   - `PROJECT.md` line 49 (F04) specifies: *"Editing problem statement flags previous analysis as outdated (`isDirty`) and requires re-analysis."*
   - `PROJECT.md` line 50 (F05) specifies: *"Automatically save and rehydrate validation state across browser refreshes."*
   - `PROJECT.md` line 51 (F06) specifies: *"Reset workflow state to clean slate with explicit confirmation dialog."*
   - `spec_inventory.md` lines 86–111 defines complete dirty state invalidation rules, including progression gating (blocking Stage 5 when `isDirty === true`) and retaining findings in the ledger during re-analysis.
   - `spec_inventory.md` lines 629–636 (Scenario 10) & lines 652–659 (Scenario 13) mandate the exact behavior for dirty flag warning banners and confirmed case abandonment.
3. **Environment and Test Pipeline**:
   - Running `npx vitest run` executes cleanly in 473ms with all 16 existing domain tests passing.
   - Node version is Node 22; TypeScript config specifies `"erasableSyntaxOnly": true`.

---

## 2. Logic Chain

1. **Hashing Mechanism Selection**:
   - *From Observation 1*: Comparing multiple individual string fields requires retaining full duplicate snapshots of `ProblemInput` in persistent storage and memory.
   - *From Observation 2*: The system requires lightweight O(1) comparison and persistence compactness.
   - *Inference*: A deterministic 32-bit hex hash (FNV-1a) computed over normalized inputs (`idea`, `targetUser`, `context`, `constraints`, `existingEvidence`) separated by ASCII `\u001F` provides an exact 8-character fingerprint (`4 bytes`). It runs synchronously without Web Crypto async overhead and provides automatic "auto-healing" (if user reverts edits back to the analyzed text, the hash matches and `isDirty` reverts to `false` without requiring an API call).
2. **Storage Key & Rehydration Fault-Tolerance**:
   - *From Observation 1*: The storage key `problempilot_case_v1` diverges from the required specification `problempilot_state_v1`.
   - *From Observation 2*: User browser local storage can contain corrupted JSON, truncated data, or obsolete schemas.
   - *Inference*: Standardizing on `STORAGE_KEY = 'problempilot_state_v1'` with `STORAGE_SCHEMA_VERSION = 1`, combined with a runtime type guard (`isValidPersistedState`) and automatic purging of corrupted payloads, ensures the application never crashes into an unhandled white-screen exception on reload.
3. **Reset Protocol Design**:
   - *From Observation 2*: Scenario 13 requires a confirmation dialog before abandoning a case.
   - *Inference*: The store exposes a `resetCase()` action that calls `clearStoredState()` and resets state to pristine `DRAFT`. The UI encapsulates this in a confirmation modal preventing accidental data destruction.

---

## 3. Caveats

1. **Multi-Tab Sync**: While `localStorage` fires `storage` events across browser tabs, ProblemPilot is primarily an active single-session analytical workspace. Basic storage event synchronization can be layered in if multi-window editing is required.
2. **Storage Quota**: `localStorage` is typically capped at ~5MB. In ProblemPilot, a complete case with 50 findings is under 50KB, well within limits. `QuotaExceededError` is safely caught.

---

## 4. Conclusion

The dirty state tracking and persistence architecture is fully designed and documented in `persistence_strategy.md`:
- **Deterministic Hashing**: FNV-1a 32-bit hex algorithm (`computeProblemHash`) with whitespace normalization and delimiter bounding.
- **Dirty State Invalidation**: Stores `analyzedProblemHash: string | null`, toggles `isDirty: boolean`, gates forward progression to Stage 5 (`EVIDENCE_REVIEWED`), and auto-clears upon re-analysis.
- **LocalStorage Standardization**: Uses `problempilot_state_v1` with schema versioning, safe error recovery, and auto-save on state modification.
- **Confirmed Reset**: Complete state purge to fresh `DRAFT` upon modal confirmation.
- **Testing Verification**: Comprehensive unit test suites specified covering all edge cases, ready for implementation in `src/store/stateMachine.ts`.

---

## 5. Verification Method

1. **Document Verification**:
   - Inspect `c:\Users\Tanmay\OneDrive\Desktop\KickToTech\.agents\teamwork\explorer_m1_3\persistence_strategy.md` for complete code designs, type definitions, and test suites.
2. **Unit Test Execution**:
   - Execute the project test command:
     ```powershell
     npx vitest run
     ```
   - All tests currently pass.
3. **Invalidation Conditions**:
   - Any proposed change introducing external heavy hashing libraries (e.g. `crypto-js`) violates zero-dependency anti-bloat constraints.
   - Any design using async Web Crypto for inline dirty checks violates synchronous React render requirements.
   - Using any storage key other than `problempilot_state_v1` violates integration specifications.
