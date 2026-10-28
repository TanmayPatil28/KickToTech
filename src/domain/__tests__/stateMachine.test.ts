import { describe, expect, it } from 'vitest';
import { canTransitionTo, isProblemDirty, validateProblemInput } from '../stateMachine';
import type { CaseState, ProblemInput } from '../../types';

describe('validateProblemInput', () => {
  it('rejects empty or whitespace-only ideas', () => {
    const res = validateProblemInput({
      idea: '   ',
      targetUser: 'Students',
      context: 'School',
    });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('at least 10 characters');
  });

  it('rejects short target user', () => {
    const res = validateProblemInput({
      idea: 'Valid idea description here',
      targetUser: 'a',
      context: 'School',
    });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('Target user must be specified');
  });

  it('accepts valid input', () => {
    const res = validateProblemInput({
      idea: 'An AI app for university students studying STEM',
      targetUser: 'Undergraduates',
      context: 'Exams',
    });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });
});

describe('isProblemDirty', () => {
  const initial: ProblemInput = {
    idea: 'Initial problem formulation',
    targetUser: 'College students',
    context: 'During exam week',
  };

  it('returns false when fields are identical', () => {
    expect(isProblemDirty(initial, { ...initial })).toBe(false);
  });

  it('returns true when idea changes', () => {
    expect(isProblemDirty({ ...initial, idea: 'New modified idea' }, initial)).toBe(true);
  });

  it('returns true when targetUser changes', () => {
    expect(isProblemDirty({ ...initial, targetUser: 'High school students' }, initial)).toBe(true);
  });
});

describe('canTransitionTo guards', () => {
  const baseState: CaseState = {
    id: 'test-case',
    stage: 'DRAFT',
    problem: {
      idea: 'AI app for medical students',
      targetUser: 'Med students',
      context: 'Hospital rotations',
    },
    isProblemStale: false,
    analysis: null,
    experiment: null,
    findings: [],
    ledger: [],
    verdict: null,
    isDemoMode: false,
    updatedAt: new Date().toISOString(),
  };

  it('disallows jumping from DRAFT directly to FINDINGS_ENTERED', () => {
    const res = canTransitionTo(baseState, 'FINDINGS_ENTERED');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Cannot jump');
  });

  it('disallows advancing to ANALYZED without analysis result', () => {
    const res = canTransitionTo(baseState, 'ANALYZED');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Analysis must be completed');
  });

  it('always allows backward transitions', () => {
    const advancedState: CaseState = {
      ...baseState,
      stage: 'TEST_DEFINED',
    };
    expect(canTransitionTo(advancedState, 'DRAFT').allowed).toBe(true);
    expect(canTransitionTo(advancedState, 'ANALYZED').allowed).toBe(true);
  });

  it('disallows advancing to FINDINGS_ENTERED if problem is marked stale', () => {
    const staleState: CaseState = {
      ...baseState,
      stage: 'TEST_DEFINED',
      isProblemStale: true,
      analysis: {} as any,
      experiment: {} as any,
      findings: [{ id: '1', description: 'test finding description', sourceType: 'direct_observation', isCredibleObservation: true, createdAt: '' }],
    };
    const res = canTransitionTo(staleState, 'FINDINGS_ENTERED');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('problem statement was modified');
  });
});
