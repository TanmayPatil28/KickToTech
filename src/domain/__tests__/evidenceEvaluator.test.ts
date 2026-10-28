import { describe, expect, it } from 'vitest';
import { evaluateEvidenceHeuristic, isSubjectiveOpinionOnly } from '../evidenceEvaluator';
import { DEMO_SCENARIO_A, DEMO_SCENARIO_B_FINDINGS } from '../demoData';
import type { Finding } from '../../types';

describe('isSubjectiveOpinionOnly', () => {
  it('detects generic praise without behavioral facts', () => {
    expect(isSubjectiveOpinionOnly('Everyone loves this idea!')).toBe(true);
    expect(isSubjectiveOpinionOnly('My friend said they think it is a great idea')).toBe(true);
  });

  it('recognizes objective observation of behavior', () => {
    expect(
      isSubjectiveOpinionOnly(
        'Student spent 45 minutes searching on YouTube because lecture slides were unindexed.'
      )
    ).toBe(false);
  });
});

describe('evaluateEvidenceHeuristic', () => {
  const problem = DEMO_SCENARIO_A.problem;
  const analysis = DEMO_SCENARIO_A.analysis!;
  const experiment = DEMO_SCENARIO_A.experiment!;

  it('evaluates empty findings as INSUFFICIENT_EVIDENCE', () => {
    const verdict = evaluateEvidenceHeuristic(problem, analysis, experiment, []);
    expect(verdict.category).toBe('INSUFFICIENT_EVIDENCE');
    expect(verdict.rationale).toContain('No evidence findings were submitted');
  });

  it('evaluates purely subjective praise as INSUFFICIENT_EVIDENCE', () => {
    const findings: Finding[] = [
      {
        id: '1',
        description: 'Everyone loves this idea!',
        sourceType: 'interpretation',
        isCredibleObservation: false,
        createdAt: new Date().toISOString(),
      },
    ];
    const verdict = evaluateEvidenceHeuristic(problem, analysis, experiment, findings);
    expect(verdict.category).toBe('INSUFFICIENT_EVIDENCE');
    expect(verdict.rationale).toContain('exclusively of general positive feedback');
  });

  it('evaluates contradictory findings as REVISE_THE_HYPOTHESIS', () => {
    const verdict = evaluateEvidenceHeuristic(problem, analysis, experiment, DEMO_SCENARIO_B_FINDINGS);
    expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
    expect(verdict.contradictoryFindings.length).toBeGreaterThan(0);
    expect(verdict.rationale).toContain('significant counter-evidence');
  });

  it('evaluates multiple credible supporting findings as EVIDENCE_SUPPORTS_FURTHER_TESTING', () => {
    const supportingFindings: Finding[] = [
      {
        id: 'S1',
        description:
          'Observed participant: spent 90 painful minutes trying to diagnose why their recursion test failed, with no good way to identify concept gap.',
        sourceType: 'direct_observation',
        relatedAssumptionId: 'ASM-1',
        isCredibleObservation: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'S2',
        description:
          'Second participant: lost time on 3 consecutive assignments because existing practice materials were fragmented and unindexed.',
        sourceType: 'user_reported_experience',
        relatedAssumptionId: 'ASM-1',
        isCredibleObservation: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const verdict = evaluateEvidenceHeuristic(problem, analysis, experiment, supportingFindings);
    expect(verdict.category).toBe('EVIDENCE_SUPPORTS_FURTHER_TESTING');
    expect(verdict.supportedClaims.length).toBeGreaterThan(0);
    expect(verdict.rationale).not.toContain('PROVEN');
    expect(verdict.rationale).not.toContain('GUARANTEED');
  });
});
