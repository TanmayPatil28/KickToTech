import { describe, expect, it, beforeEach } from 'vitest';
import {
  STORAGE_KEY,
  STORAGE_SCHEMA_VERSION,
  computeProblemHash,
  isProblemDirty,
  createInitialValidationState,
  loadStoredState,
  persistState,
  clearStoredState,
} from '../src/store/stateMachine.ts';
import type {
  ProblemInput,
  ValidationState,
} from '../src/types/index.ts';

describe('Adversarial Stress Testing: Dirty Hashing & LocalStorage Persistence', () => {
  // In-memory mock storage for storage tests
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

  const baseProblem: ProblemInput = {
    idea: 'Engineers struggle to calibrate robotic CNC arms without manual dial indicators.',
    targetUser: 'Precision manufacturing technicians',
    context: 'During daily setup and tool changeovers in high-mix machine shops.',
    constraints: 'Must operate inside shielded CNC enclosure without Wi-Fi.',
    existingObservations: 'Observed 6 operators spend 35 minutes per shift zeroing fixtures.',
  };

  beforeEach(() => {
    memory.clear();
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
  });

  // =========================================================================
  // 1. computeProblemHash & Dirty Detection Stress Testing
  // =========================================================================
  describe('1. computeProblemHash Edge Cases & Sensitivity', () => {
    it('produces valid 8-character lowercase hex hash', () => {
      const hash = computeProblemHash(baseProblem);
      expect(hash).toHaveLength(8);
      expect(/^[0-9a-f]{8}$/.test(hash)).toBe(true);
    });

    it('handles extreme leading and trailing whitespace variants (tabs, newlines, spaces)', () => {
      const canonicalHash = computeProblemHash(baseProblem);

      const paddedProblem: ProblemInput = {
        idea: `\n\t  ${baseProblem.idea}  \r\n\t`,
        targetUser: `  \t ${baseProblem.targetUser} \n `,
        context: `\r\n ${baseProblem.context} \t\t `,
        constraints: `   ${baseProblem.constraints}   `,
        existingObservations: `\n\n ${baseProblem.existingObservations} \t `,
      };

      const paddedHash = computeProblemHash(paddedProblem);
      expect(paddedHash).toBe(canonicalHash);
      expect(isProblemDirty(paddedProblem, canonicalHash)).toBe(false);
    });

    it('differentiates internal whitespace differences (must mark dirty)', () => {
      const canonicalHash = computeProblemHash(baseProblem);

      const modifiedInternalSpaces: ProblemInput = {
        ...baseProblem,
        idea: baseProblem.idea.replace('to calibrate', 'to  calibrate'), // double space
      };

      const modifiedHash = computeProblemHash(modifiedInternalSpaces);
      expect(modifiedHash).not.toBe(canonicalHash);
      expect(isProblemDirty(modifiedInternalSpaces, canonicalHash)).toBe(true);
    });

    it('handles all-whitespace vs empty string vs undefined fields equivalently', () => {
      const p1: ProblemInput = {
        idea: 'Core idea statement',
        targetUser: 'Core target user',
        context: 'Core context',
        constraints: '',
        existingObservations: '',
      };

      const p2: ProblemInput = {
        idea: 'Core idea statement',
        targetUser: 'Core target user',
        context: 'Core context',
        constraints: '   \t  ',
        existingObservations: '  \n\r  ',
      };

      const p3: ProblemInput = {
        idea: 'Core idea statement',
        targetUser: 'Core target user',
        context: 'Core context',
      };

      const hash1 = computeProblemHash(p1);
      const hash2 = computeProblemHash(p2);
      const hash3 = computeProblemHash(p3);

      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
    });

    it('supports backward-compatibility alias existingEvidence when existingObservations is omitted', () => {
      const withObs: ProblemInput = {
        idea: 'Idea test description',
        targetUser: 'Target users',
        context: 'Context info',
        existingObservations: 'Observed 10 users struggling.',
      };

      const withEvidence: ProblemInput = {
        idea: 'Idea test description',
        targetUser: 'Target users',
        context: 'Context info',
        existingEvidence: 'Observed 10 users struggling.',
      };

      expect(computeProblemHash(withObs)).toBe(computeProblemHash(withEvidence));
    });

    it('stress-tests non-ASCII characters: Accents, CJK, Cyrillic, Arabic, Math, Symbols', () => {
      const multilingualProblems: ProblemInput[] = [
        {
          idea: 'Café résumé Übergröße naïve façade français',
          targetUser: 'Étudiants et ingénieurs européens',
          context: 'À Genève et Zürich pendant les ateliers d’ingénierie',
          constraints: 'Coût ≤ 50€ par unité',
        },
        {
          idea: '基于人工智能的问题假设验证系统与证据链推演',
          targetUser: '中国大学机械工程系研究生与创业团队',
          context: '在智能制造实验室与数控车间实际操作场景中',
          constraints: '必须离线部署，不依赖外网云端接口',
        },
        {
          idea: 'ロボット制御アームの自動校正プロトタイプ開発',
          targetUser: '日本の精密機械工場オペレーター',
          context: '日次ツール交換および段取り替えプロセスにおいて',
        },
        {
          idea: 'Разработка системы валидации гипотез для инженеров',
          targetUser: 'Студенты технических университетов',
          context: 'Во время лабораторных работ по материаловедению',
        },
        {
          idea: 'نظام التحقق من صحة الفرضيات للمهندسين والمبتكرين',
          targetUser: 'مهندسو الميكانيكا في المصانع',
          context: 'أثناء عمليات الصيانة الدورية للأجهزة',
        },
        {
          idea: 'Mathematical formulas: ∑_{i=1}^n x_i ≥ 0 and ∫_0^∞ e^{-x^2} dx = √π/2',
          targetUser: 'Applied mathematicians: ∀x ∈ ℝ, ∃y : y > x',
          context: 'Symbolic testing: «quoted» “smart quotes” ‘apostrophe’ — em dash – en dash',
        },
      ];

      for (const p of multilingualProblems) {
        const hash = computeProblemHash(p);
        expect(hash).toHaveLength(8);
        expect(/^[0-9a-f]{8}$/.test(hash)).toBe(true);

        // Verification: deterministic across runs
        const hashRepeat = computeProblemHash({ ...p });
        expect(hashRepeat).toBe(hash);

        // Verification: editing one character triggers dirty
        const modified = { ...p, idea: p.idea + '!' };
        expect(isProblemDirty(modified, hash)).toBe(true);

        // Auto-healing: reverting that character clears dirty
        const reverted = { ...p, idea: p.idea };
        expect(isProblemDirty(reverted, hash)).toBe(false);
      }
    });

    it('stress-tests emojis and multi-byte surrogate pairs (including ZWJ sequences)', () => {
      const emojiProblems: ProblemInput[] = [
        {
          idea: '🚀 AI-powered rocketry avionics calibration 🛰️',
          targetUser: '👩‍🔬 Aerospace research scientists 👨‍💻',
          context: '🧪 Vacuum chamber testing with 🔬 micro-sensors',
          constraints: 'Budget: 💰 < 1000€, Weight: ⚖️ < 500g',
          existingObservations: 'Observed 3 💥 failures during launch countdown ⚠️',
        },
        {
          // ZWJ (Zero Width Joiner) sequence
          idea: 'Multi-person emoji test: 👨‍👩‍👧‍👦 family tech support',
          targetUser: 'Older adults 👵🏽 and grandchildren 🧒🏻',
          context: 'Living room smart TV navigation 📺',
        },
      ];

      for (const p of emojiProblems) {
        const hash = computeProblemHash(p);
        expect(hash).toHaveLength(8);
        expect(/^[0-9a-f]{8}$/.test(hash)).toBe(true);

        // Deterministic
        expect(computeProblemHash({ ...p })).toBe(hash);

        // Reverting cleans dirty state
        const dirty = { ...p, idea: p.idea + ' 🔬' };
        expect(computeProblemHash(dirty)).not.toBe(hash);
        expect(isProblemDirty(dirty, hash)).toBe(true);
        expect(isProblemDirty(p, hash)).toBe(false);
      }
    });

    it('stress-tests extreme length inputs: 10,000, 100,000, and 1,000,000 characters', () => {
      // 10,000 chars
      const text10k = 'A'.repeat(10000);
      const p10k: ProblemInput = {
        idea: text10k,
        targetUser: 'Large input tester',
        context: 'Benchmarking memory and computation limits',
      };

      const start10k = performance.now();
      const hash10k = computeProblemHash(p10k);
      const elapsed10k = performance.now() - start10k;
      expect(hash10k).toHaveLength(8);
      expect(elapsed10k).toBeLessThan(50); // Under 50ms

      // 100,000 chars
      const text100k = 'B'.repeat(100000);
      const p100k: ProblemInput = {
        idea: text100k,
        targetUser: 'Large input tester',
        context: '100k character test',
      };

      const start100k = performance.now();
      const hash100k = computeProblemHash(p100k);
      const elapsed100k = performance.now() - start100k;
      expect(hash100k).toHaveLength(8);
      expect(elapsed100k).toBeLessThan(100); // Under 100ms

      // Flipping character at index 99,999 in 100k string must change hash
      const p100kModified: ProblemInput = {
        ...p100k,
        idea: text100k.slice(0, 99999) + 'C',
      };
      const hash100kModified = computeProblemHash(p100kModified);
      expect(hash100kModified).not.toBe(hash100k);
      expect(isProblemDirty(p100kModified, hash100k)).toBe(true);

      // 1,000,000 chars (1MB text payload)
      const text1M = 'X'.repeat(1000000);
      const p1M: ProblemInput = {
        idea: text1M,
        targetUser: '1M char user',
        context: '1M char context',
      };
      const start1M = performance.now();
      const hash1M = computeProblemHash(p1M);
      const elapsed1M = performance.now() - start1M;
      expect(hash1M).toHaveLength(8);
      expect(elapsed1M).toBeLessThan(500); // Under 500ms
    });

    it('documents delimiter sensitivity with ASCII Unit Separator \\u001F', () => {
      // If a malicious user injects the delimiter character \u001F into fields:
      const injected1: ProblemInput = {
        idea: 'prefix\u001Fmiddle',
        targetUser: 'suffix',
        context: 'ctx',
      };
      const injected2: ProblemInput = {
        idea: 'prefix',
        targetUser: 'middle\u001Fsuffix',
        context: 'ctx',
      };

      // Both join to "prefix\u001Fmiddle\u001Fsuffix\u001Fctx\u001F\u001F"
      // Notice: computeProblemHash normalizes by joining on \u001F
      const h1 = computeProblemHash(injected1);
      const h2 = computeProblemHash(injected2);
      expect(h1).toBe(h2); // Validates theoretical delimiter collision on control char \u001F
    });

    it('verifies auto-healing cycle across multiple fields simultaneously', () => {
      const baselineHash = computeProblemHash(baseProblem);
      expect(isProblemDirty(baseProblem, baselineHash)).toBe(false);

      // Step 1: Mutate idea
      const s1 = { ...baseProblem, idea: 'Mutated idea step 1' };
      expect(isProblemDirty(s1, baselineHash)).toBe(true);

      // Step 2: Mutate targetUser
      const s2 = { ...s1, targetUser: 'Mutated user step 2' };
      expect(isProblemDirty(s2, baselineHash)).toBe(true);

      // Step 3: Mutate context
      const s3 = { ...s2, context: 'Mutated context step 3' };
      expect(isProblemDirty(s3, baselineHash)).toBe(true);

      // Step 4: Mutate constraints
      const s4 = { ...s3, constraints: 'Mutated constraints step 4' };
      expect(isProblemDirty(s4, baselineHash)).toBe(true);

      // Step 5: Mutate observations
      const s5 = { ...s4, existingObservations: 'Mutated observations step 5' };
      expect(isProblemDirty(s5, baselineHash)).toBe(true);

      // Revert step 5
      const r1 = { ...s5, existingObservations: baseProblem.existingObservations };
      expect(isProblemDirty(r1, baselineHash)).toBe(true);

      // Revert step 4
      const r2 = { ...r1, constraints: baseProblem.constraints };
      expect(isProblemDirty(r2, baselineHash)).toBe(true);

      // Revert step 3
      const r3 = { ...r2, context: baseProblem.context };
      expect(isProblemDirty(r3, baselineHash)).toBe(true);

      // Revert step 2
      const r4 = { ...r3, targetUser: baseProblem.targetUser };
      expect(isProblemDirty(r4, baselineHash)).toBe(true);

      // Revert step 1 (all original values restored)
      const r5 = { ...r4, idea: baseProblem.idea };
      expect(isProblemDirty(r5, baselineHash)).toBe(false); // Fully healed!
    });
  });

  // =========================================================================
  // 2. LocalStorage Persistence Stress Testing
  // =========================================================================
  describe('2. LocalStorage Persistence & Corrupted Data Resilience', () => {
    it('gracefully handles syntactic JSON corruption without unhandled exceptions', () => {
      const corruptedPayloads = [
        '{ invalid_json ::: corrupt',
        '{"version": 1, "currentStage": "ANALYZ',
        '<xml><state>corrupted</state></xml>',
        'undefined',
        'NaN',
        '{"version": 1, "findings": [unquoted]}',
        '{{{{{',
      ];

      for (const payload of corruptedPayloads) {
        memory.set(STORAGE_KEY, payload);
        expect(() => {
          const loaded = loadStoredState();
          expect(loaded).toBeDefined();
          expect(loaded.currentStage).toBe('DRAFT');
          expect(loaded.version).toBe(STORAGE_SCHEMA_VERSION);
          expect(loaded.isDirty).toBe(false);
        }).not.toThrow();

        // Corrupted key should be purged from storage
        expect(memory.get(STORAGE_KEY)).toBeUndefined();
      }
    });

    it('gracefully handles non-object and primitive JSON payloads', () => {
      const primitivePayloads = [
        'null',
        'true',
        'false',
        '42',
        '"just a string"',
        '[]',
        '[1, 2, 3]',
        '["DRAFT"]',
      ];

      for (const payload of primitivePayloads) {
        memory.set(STORAGE_KEY, payload);
        expect(() => {
          const loaded = loadStoredState();
          expect(loaded.currentStage).toBe('DRAFT');
          expect(loaded.version).toBe(STORAGE_SCHEMA_VERSION);
        }).not.toThrow();
        expect(memory.get(STORAGE_KEY)).toBeUndefined();
      }
    });

    it('gracefully rejects payloads with missing or malformed schema properties', () => {
      const malformedPayloads = [
        // Missing version
        JSON.stringify({ currentStage: 'DRAFT', problem: baseProblem, findings: [] }),
        // Incompatible version
        JSON.stringify({ version: 2, currentStage: 'DRAFT', problem: baseProblem, findings: [] }),
        // Negative version
        JSON.stringify({ version: -1, currentStage: 'DRAFT', problem: baseProblem, findings: [] }),
        // Invalid stage name
        JSON.stringify({ version: 1, currentStage: 'UNREGISTERED_STAGE', problem: baseProblem, findings: [] }),
        // Problem is null
        JSON.stringify({ version: 1, currentStage: 'DRAFT', problem: null, findings: [] }),
        // Problem is string
        JSON.stringify({ version: 1, currentStage: 'DRAFT', problem: 'invalid problem', findings: [] }),
        // Problem missing idea
        JSON.stringify({ version: 1, currentStage: 'DRAFT', problem: { targetUser: 'Users', context: 'Lab' }, findings: [] }),
        // Problem idea is non-string number
        JSON.stringify({ version: 1, currentStage: 'DRAFT', problem: { idea: 12345, targetUser: 'Users', context: 'Lab' }, findings: [] }),
        // Findings is string instead of array
        JSON.stringify({ version: 1, currentStage: 'DRAFT', problem: baseProblem, findings: 'none' }),
        // Findings is null
        JSON.stringify({ version: 1, currentStage: 'DRAFT', problem: baseProblem, findings: null }),
      ];

      for (const payload of malformedPayloads) {
        memory.set(STORAGE_KEY, payload);
        const loaded = loadStoredState();
        expect(loaded.currentStage).toBe('DRAFT');
        expect(loaded.version).toBe(STORAGE_SCHEMA_VERSION);
        expect(memory.get(STORAGE_KEY)).toBeUndefined();
      }
    });

    it('safely tolerates Storage API errors (getItem / setItem / removeItem throwing)', () => {
      // Test when getItem throws SecurityError (e.g. private mode restrictions)
      const restrictedStorage: Storage = {
        ...mockStorage,
        getItem: () => {
          throw new DOMException('Access is denied for this document', 'SecurityError');
        },
      };
      (globalThis as unknown as { localStorage: Storage }).localStorage = restrictedStorage;

      expect(() => {
        const loaded = loadStoredState();
        expect(loaded.currentStage).toBe('DRAFT');
      }).not.toThrow();

      // Test when setItem throws QuotaExceededError
      const fullStorage: Storage = {
        ...mockStorage,
        setItem: () => {
          throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
        },
      };
      (globalThis as unknown as { localStorage: Storage }).localStorage = fullStorage;

      expect(() => {
        const success = persistState(createInitialValidationState());
        expect(success).toBe(false);
      }).not.toThrow();

      // Test when removeItem throws
      const throwingRemoveStorage: Storage = {
        ...mockStorage,
        removeItem: () => {
          throw new Error('Disk write failure');
        },
      };
      (globalThis as unknown as { localStorage: Storage }).localStorage = throwingRemoveStorage;

      expect(() => {
        clearStoredState();
      }).not.toThrow();
    });

    it('safely handles null localStorage global (SSR / Node / sandbox environment)', () => {
      (globalThis as unknown as { localStorage: Storage | null }).localStorage = null;

      expect(() => {
        const loaded = loadStoredState();
        expect(loaded.currentStage).toBe('DRAFT');
      }).not.toThrow();

      expect(() => {
        const saved = persistState(createInitialValidationState());
        expect(saved).toBe(false);
      }).not.toThrow();

      expect(() => {
        clearStoredState();
      }).not.toThrow();
    });

    it('rehydrates dirty state accurately when stored problem was modified externally', () => {
      // Restore standard mockStorage
      (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;

      const baselineHash = computeProblemHash(baseProblem);
      const stateToStore: ValidationState = {
        ...createInitialValidationState(),
        currentStage: 'ANALYZED',
        stage: 'ANALYZED',
        problem: { ...baseProblem, idea: 'Externally tampered idea text' },
        analyzedProblemHash: baselineHash,
      };

      persistState(stateToStore);
      const rehydrated = loadStoredState();
      expect(rehydrated.currentStage).toBe('ANALYZED');
      // Dirty check on rehydration must catch the mismatch between problem and analyzedProblemHash
      expect(rehydrated.isDirty).toBe(true);
      expect(rehydrated.isProblemStale).toBe(true);
    });

    it('rehydrates clean state when stored problem matches analyzedProblemHash', () => {
      const baselineHash = computeProblemHash(baseProblem);
      const stateToStore: ValidationState = {
        ...createInitialValidationState(),
        currentStage: 'ANALYZED',
        stage: 'ANALYZED',
        problem: { ...baseProblem },
        analyzedProblemHash: baselineHash,
      };

      persistState(stateToStore);
      const rehydrated = loadStoredState();
      expect(rehydrated.currentStage).toBe('ANALYZED');
      expect(rehydrated.isDirty).toBe(false);
      expect(rehydrated.isProblemStale).toBe(false);
    });
  });

  // =========================================================================
  // 3. resetCase / abandonCase Stress Testing
  // =========================================================================
  describe('3. resetCase & State Clean Slate Reset', () => {
    it('clears persisted storage and returns pristine DRAFT state', () => {
      // 1. Populate storage with an advanced stage state
      const advancedState: ValidationState = {
        version: STORAGE_SCHEMA_VERSION,
        id: 'case_advanced_123',
        currentStage: 'EVIDENCE_REVIEWED',
        stage: 'EVIDENCE_REVIEWED',
        problem: baseProblem,
        lastAnalyzedProblem: baseProblem,
        analyzedProblemHash: computeProblemHash(baseProblem),
        isDirty: true,
        isProblemStale: true,
        analysis: {
          problemClarity: { status: 'clear', explanation: 'OK', missingDetails: [] },
          refinedProblemStatement: 'Refined problem',
          targetUserAmbiguity: 'Low',
          assumptions: [],
          evidenceGaps: [],
          alternativeExplanations: [],
          existingWorkarounds: [],
          highestRiskUncertainty: 'None',
        },
        experiment: {
          id: 'EXP-1',
          title: 'Experiment title',
          hypothesis: 'Test hypothesis',
          method: 'Interview',
          steps: ['Step 1'],
          inquiryQuestions: ['Q1?'],
          evidenceToRecord: ['Time'],
          supportingSignals: ['Fast'],
          weakeningSignals: ['Slow'],
          limitations: ['Few users'],
          estimatedEffort: '1 hour',
        },
        alternativeExperiment: null,
        findings: [
          {
            id: 'FND-1',
            description: 'Observation 1',
            sourceType: 'direct_observation',
            timestamp: new Date().toISOString(),
          },
        ],
        ledger: [
          {
            id: 'LED-1',
            timestamp: new Date().toISOString(),
            type: 'FINDING_RECORDED',
            source: 'USER',
            summary: 'Finding recorded',
          },
        ],
        decisionBrief: {
          verdict: 'EVIDENCE SUPPORTS FURTHER TESTING',
          updatedProblemStatement: 'Updated problem',
          supportedClaims: ['Claim 1'],
          unsupportedClaims: [],
          contradictoryFindings: [],
          remainingUncertainties: [],
        },
        verdict: null,
        isDemo: true,
        isDemoMode: true,
        demoScenario: 'A',
        highestCompletedStage: 'EVIDENCE_REVIEWED',
        highestUnlockedStage: 'EVIDENCE_REVIEWED',
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      persistState(advancedState);
      expect(memory.get(STORAGE_KEY)).toBeDefined();

      // Simulate resetCase behavior: clear storage and initialize state
      clearStoredState();
      expect(memory.get(STORAGE_KEY)).toBeUndefined();

      const resetState = createInitialValidationState();

      // Verify all reset state invariants
      expect(resetState.version).toBe(STORAGE_SCHEMA_VERSION);
      expect(resetState.currentStage).toBe('DRAFT');
      expect(resetState.stage).toBe('DRAFT');
      expect(resetState.problem.idea).toBe('');
      expect(resetState.problem.targetUser).toBe('');
      expect(resetState.problem.context).toBe('');
      expect(resetState.problem.constraints).toBe('');
      expect(resetState.problem.existingObservations).toBe('');
      expect(resetState.problem.existingEvidence).toBe('');
      expect(resetState.analysis).toBeNull();
      expect(resetState.experiment).toBeNull();
      expect(resetState.alternativeExperiment).toBeNull();
      expect(resetState.findings).toEqual([]);
      expect(resetState.ledger).toEqual([]);
      expect(resetState.decisionBrief).toBeNull();
      expect(resetState.verdict).toBeNull();
      expect(resetState.isDirty).toBe(false);
      expect(resetState.isProblemStale).toBe(false);
      expect(resetState.analyzedProblemHash).toBeNull();
      expect(resetState.isDemo).toBe(false);
      expect(resetState.isDemoMode).toBe(false);
      expect(resetState.demoScenario).toBeNull();
      expect(resetState.highestCompletedStage).toBe('DRAFT');
      expect(resetState.highestUnlockedStage).toBe('DRAFT');

      // Dirty check on pristine reset state against null baseline
      expect(isProblemDirty(resetState.problem, null)).toBe(false);
      expect(isProblemDirty(resetState.problem, resetState.analyzedProblemHash)).toBe(false);
    });
  });
});
