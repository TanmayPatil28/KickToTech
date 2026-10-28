import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  STORAGE_SCHEMA_VERSION,
  computeProblemHash,
  isProblemDirty,
  createInitialValidationState,
  loadStoredState,
  persistState,
  clearStoredState,
  INITIAL_PROBLEM_INPUT,
} from '../src/store/stateMachine.ts';
import type { ProblemInput, ValidationState } from '../src/types/index.ts';

describe('Empirical Challenger Verification: Dirty Hashing & LocalStorage Persistence', () => {
  const memory = new Map<string, string>();
  const mockStorage: Storage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => { memory.set(k, v); },
    removeItem: (k: string) => { memory.delete(k); },
    clear: () => { memory.clear(); },
    key: (i: number) => Array.from(memory.keys())[i] ?? null,
    length: 0,
  };
  Object.defineProperty(mockStorage, 'length', {
    get: () => memory.size,
  });

  const baselineProblem: ProblemInput = {
    idea: 'Engineers struggle to calibrate robotic CNC arms without manual dial indicators.',
    targetUser: 'Precision manufacturing technicians',
    context: 'During daily setup and tool changeovers in high-mix machine shops.',
    constraints: 'Must operate inside shielded CNC enclosure without Wi-Fi.',
    existingObservations: 'Observed 6 operators spend 35 minutes per shift zeroing fixtures.',
  };

  // =========================================================================
  // Test 1: computeProblemHash & Dirty Detection Stress Testing
  // =========================================================================
  describe('Test 1: computeProblemHash whitespace, Unicode, length, and auto-healing', () => {
    it('produces identical hash across Unicode whitespace variants (\\u00A0, \\u2003, \\u3000)', () => {
      const canonicalHash = computeProblemHash(baselineProblem);

      const unicodeSpacesProblem: ProblemInput = {
        idea: `\u00A0\u2003${baselineProblem.idea}\u3000\uFEFF`,
        targetUser: `\u2000${baselineProblem.targetUser}\u200A`,
        context: `\u2028${baselineProblem.context}\u2029`,
        constraints: `\u00A0${baselineProblem.constraints}\u00A0`,
        existingObservations: `\u3000${baselineProblem.existingObservations}\u3000`,
      };

      const unicodeHash = computeProblemHash(unicodeSpacesProblem);
      expect(unicodeHash).toBe(canonicalHash);
      expect(isProblemDirty(unicodeSpacesProblem, canonicalHash)).toBe(false);
    });

    it('handles empty optional fields vs omitted fields identically', () => {
      const withEmptyStrings: ProblemInput = {
        idea: 'Standard problem description',
        targetUser: 'Target cohort',
        context: 'Context environment',
        constraints: '',
        existingObservations: '',
        existingEvidence: '',
      };

      const withOmittedFields: ProblemInput = {
        idea: 'Standard problem description',
        targetUser: 'Target cohort',
        context: 'Context environment',
      };

      const withWhitespaceOnly: ProblemInput = {
        idea: 'Standard problem description',
        targetUser: 'Target cohort',
        context: 'Context environment',
        constraints: '   \n\t  ',
        existingObservations: '   ',
        existingEvidence: ' \r\n ',
      };

      const h1 = computeProblemHash(withEmptyStrings);
      const h2 = computeProblemHash(withOmittedFields);
      const h3 = computeProblemHash(withWhitespaceOnly);

      expect(h1).toBe(h2);
      expect(h2).toBe(h3);
    });

    it('verifies collision resistance across 1,000 single-character incremental mutations', () => {
      const hashes = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const mutated: ProblemInput = {
          ...baselineProblem,
          idea: `${baselineProblem.idea} [variant_${i}]`,
        };
        const hash = computeProblemHash(mutated);
        expect(hash).toHaveLength(8);
        expect(hashes.has(hash)).toBe(false); // Zero collisions across 1,000 variants
        hashes.add(hash);
      }
      expect(hashes.size).toBe(iterations);
    });

    it('handles non-ASCII multilingual scripts: Arabic, Hindi, CJK, Cyrillic, Greek, Math', () => {
      const testCases: ProblemInput[] = [
        {
          idea: 'التحقق من صحة الفرضيات للمهندسين',
          targetUser: 'مهندسو الميكانيكا',
          context: 'ورش العمل الصناعية',
        },
        {
          idea: 'इंजीनियरों के लिए समस्या सत्यापन प्रणाली',
          targetUser: 'मैकेनिकल छात्र',
          context: 'प्रयोगशाला में',
        },
        {
          idea: '機械加工ワークショップでの自動校正システム',
          targetUser: '製造技術者',
          context: 'ツール交換中',
        },
        {
          idea: 'Оптимизация калибровки ЧПУ станков',
          targetUser: 'Операторы станков',
          context: 'В цеху точной механики',
        },
        {
          idea: 'Σύστημα επικύρωσης υποθέσεων μηχανικών',
          targetUser: 'Μηχανικοί παραγωγής',
          context: 'Στο εργαστήριο',
        },
        {
          idea: '∀x ∈ S: f(x) ≥ 0 ∧ ∇f(x) = 0',
          targetUser: 'Applied researchers',
          context: 'Optimization lab',
        },
      ];

      for (const tc of testCases) {
        const hash = computeProblemHash(tc);
        expect(hash).toHaveLength(8);
        expect(/^[0-9a-f]{8}$/.test(hash)).toBe(true);

        // Verification: deterministic repeat
        expect(computeProblemHash({ ...tc })).toBe(hash);

        // Dirty flag sensitivity
        const dirty = { ...tc, idea: tc.idea + ' 1' };
        expect(isProblemDirty(dirty, hash)).toBe(true);

        // Auto-healing
        const reverted = { ...tc, idea: tc.idea };
        expect(isProblemDirty(reverted, hash)).toBe(false);
      }
    });

    it('handles extreme length inputs up to 1,000,000 characters within strict time bounds', () => {
      const length1M = 'Z'.repeat(1_000_000);
      const largeProblem: ProblemInput = {
        idea: length1M,
        targetUser: 'Extreme benchmark tester',
        context: 'Memory and CPU stress testing',
      };

      const start = performance.now();
      const hash = computeProblemHash(largeProblem);
      const elapsed = performance.now() - start;

      expect(hash).toHaveLength(8);
      expect(elapsed).toBeLessThan(350); // Under 350ms for 1MB string

      // Modifying the single final character in the 1M char string triggers dirty
      const modifiedFinalChar: ProblemInput = {
        ...largeProblem,
        idea: length1M.slice(0, 999_999) + 'Y',
      };
      expect(computeProblemHash(modifiedFinalChar)).not.toBe(hash);
      expect(isProblemDirty(modifiedFinalChar, hash)).toBe(true);
    });

    it('verifies auto-healing across all 5 fields', () => {
      const baselineHash = computeProblemHash(baselineProblem);
      expect(isProblemDirty(baselineProblem, baselineHash)).toBe(false);

      // Mutate all 5 fields
      const mutated: ProblemInput = {
        idea: 'Changed idea text',
        targetUser: 'Changed target user',
        context: 'Changed context',
        constraints: 'Changed constraints',
        existingObservations: 'Changed observations',
      };
      expect(isProblemDirty(mutated, baselineHash)).toBe(true);

      // Revert each field one by one
      const r1 = { ...mutated, idea: baselineProblem.idea };
      expect(isProblemDirty(r1, baselineHash)).toBe(true);

      const r2 = { ...r1, targetUser: baselineProblem.targetUser };
      expect(isProblemDirty(r2, baselineHash)).toBe(true);

      const r3 = { ...r2, context: baselineProblem.context };
      expect(isProblemDirty(r3, baselineHash)).toBe(true);

      const r4 = { ...r3, constraints: baselineProblem.constraints };
      expect(isProblemDirty(r4, baselineHash)).toBe(true);

      // Final field reverted: must be clean
      const r5 = { ...r4, existingObservations: baselineProblem.existingObservations };
      expect(isProblemDirty(r5, baselineHash)).toBe(false);
    });
  });

  // =========================================================================
  // Test 2: LocalStorage Persistence Stress Testing
  // =========================================================================
  describe('Test 2: LocalStorage key, schema, corrupted JSON recovery, resetCase', () => {
    it('verifies storage key is problempilot_state_v1 and schema version is 1', () => {
      expect(STORAGE_KEY).toBe('problempilot_state_v1');
      expect(STORAGE_SCHEMA_VERSION).toBe(1);
    });

    it('recovers cleanly from corrupt JSON without throwing and resets to clean initial DRAFT', () => {
      (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;

      const corruptStrings = [
        '{',
        '{"version": 1, "currentStage": "DRAFT",',
        '{"version": "one", "currentStage": "DRAFT"}',
        '<html><body>Crash</body></html>',
        'undefined',
        'null',
        '12345',
        '"string payload"',
        '{"version": 1, "currentStage": "DRAFT", "problem": {"idea": 42}}',
        '{"version": 1, "currentStage": "DRAFT", "problem": {"idea": "valid", "targetUser": "valid", "context": "valid"}, "findings": "not an array"}',
      ];

      for (const badData of corruptStrings) {
        memory.set(STORAGE_KEY, badData);

        let state: ValidationState | null = null;
        expect(() => {
          state = loadStoredState();
        }).not.toThrow();

        expect(state).not.toBeNull();
        expect(state!.version).toBe(1);
        expect(state!.currentStage).toBe('DRAFT');
        expect(state!.stage).toBe('DRAFT');
        expect(state!.problem.idea).toBe('');
        expect(state!.findings).toEqual([]);
        expect(state!.isDirty).toBe(false);

        // Memory should have purged the corrupted item
        expect(memory.get(STORAGE_KEY)).toBeUndefined();
      }
    });

    it('verifies resetCase & abandonCase reset state to clean DRAFT with matching clean hash', () => {
      (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;

      // 1. Setup dirty state in storage
      const dirtyState: ValidationState = {
        ...createInitialValidationState(),
        currentStage: 'FINDINGS_ENTERED',
        stage: 'FINDINGS_ENTERED',
        problem: baselineProblem,
        analyzedProblemHash: 'old_hash_123',
        isDirty: true,
        isProblemStale: true,
      };

      persistState(dirtyState);
      expect(memory.get(STORAGE_KEY)).toBeDefined();

      // 2. Perform reset
      clearStoredState();
      expect(memory.get(STORAGE_KEY)).toBeUndefined();

      const resetState = createInitialValidationState();

      // Invariants check
      expect(resetState.currentStage).toBe('DRAFT');
      expect(resetState.stage).toBe('DRAFT');
      expect(resetState.isDirty).toBe(false);
      expect(resetState.isProblemStale).toBe(false);
      expect(resetState.analyzedProblemHash).toBeNull();
      expect(resetState.problem).toEqual(INITIAL_PROBLEM_INPUT);

      // Verify clean hash matching
      const cleanHash = computeProblemHash(resetState.problem);
      expect(cleanHash).toHaveLength(8);
      // isProblemDirty with null baseline must be false
      expect(isProblemDirty(resetState.problem, null)).toBe(false);
      expect(isProblemDirty(resetState.problem, resetState.analyzedProblemHash)).toBe(false);
      // isProblemDirty with matching hash must be false
      expect(isProblemDirty(resetState.problem, cleanHash)).toBe(false);
    });

    it('persists and rehydrates clean state with zero dirty false positives', () => {
      (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;

      const hash = computeProblemHash(baselineProblem);
      const validState: ValidationState = {
        ...createInitialValidationState(),
        currentStage: 'ANALYZED',
        stage: 'ANALYZED',
        problem: baselineProblem,
        analyzedProblemHash: hash,
        isDirty: false,
        isProblemStale: false,
      };

      const persisted = persistState(validState);
      expect(persisted).toBe(true);

      const rehydrated = loadStoredState();
      expect(rehydrated.currentStage).toBe('ANALYZED');
      expect(rehydrated.analyzedProblemHash).toBe(hash);
      expect(rehydrated.isDirty).toBe(false);
      expect(rehydrated.isProblemStale).toBe(false);
    });
  });
});
