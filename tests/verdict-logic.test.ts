import { describe, expect, it } from 'vitest';
import {
  evaluateEvidenceHeuristic,
  isSubjectiveOpinionOnly,
} from '../src/domain/evidenceEvaluator';
import { DEMO_SCENARIO_A, DEMO_SCENARIO_B_FINDINGS } from '../src/domain/demoData';
import type {
  AnalysisResult,
  Finding,
  ProblemInput,
  ValidationExperiment,
} from '../src/types';

describe('Verdict Logic & Evidence Evaluator (Tiers 1, 2, 3)', () => {
  // Canonical Test Fixtures
  const testProblem: ProblemInput = {
    idea: 'Mechanical engineering students at university labs spend 15 hours/week searching legacy PDF manuals for torque specs.',
    targetUser: 'Mechanical engineering students in university fabrication labs',
    context: 'During lab machining operations when configuring Bridgeport mills and lathes.',
    existingEvidence: 'Interviewed 4 lab assistants who confirmed repeated student interruptions.',
    constraints: 'No internet access permitted at the machine tools.',
  };

  const testAnalysis: AnalysisResult = {
    problemClarity: {
      status: 'clear',
      explanation: 'Specific engineering workflow friction clearly identified.',
      missingDetails: [],
    },
    refinedProblemStatement: 'Students lose lab productivity locating machine specs in unindexed rasterized manuals.',
    targetUserAmbiguity: 'Target persona is well-bounded.',
    assumptions: [
      {
        id: 'ASM-1',
        claim: 'Students cannot find torque specifications in under 5 minutes using current manuals.',
        reason: 'Rasterized diagrams lack searchable text.',
        risk: 'high',
        status: 'unverified',
        evidenceNeeded: ['Timed trials of spec lookup.'],
        nextAction: 'Time 5 students searching manuals.',
      },
      {
        id: 'ASM-2',
        claim: 'Lab assistants are frequently interrupted to answer lookup questions.',
        reason: 'Interruption cost diminishes teaching quality.',
        risk: 'medium',
        status: 'unverified',
        evidenceNeeded: ['Log of questions asked to TAs during lab.'],
        nextAction: 'Observe TA desk for 2 hours.',
      },
      {
        id: 'ASM-3',
        claim: 'Students would actively use an offline tablet lookup index if provided.',
        reason: 'If students prefer asking peers, digital tools will sit unused.',
        risk: 'high',
        status: 'unverified',
        evidenceNeeded: ['Observation of tablet adoption in pilot lab.'],
        nextAction: 'Place pilot tablet at station.',
      },
    ],
    evidenceGaps: [
      {
        description: 'Whether students have mobile phones on their person during machining.',
        importance: 'medium',
        howToInvestigate: 'Check lab safety dress code.',
      },
    ],
    alternativeExplanations: ['Students simply lack basic blueprint reading skills.'],
    existingWorkarounds: ['Asking the lab TA', 'Guessing torque settings from memory'],
    highestRiskUncertainty: 'Assuming students want an app rather than physical cheat-sheets taped to machines.',
    suggestedValidationObjective: 'Verify whether manual lookup time is the true bottleneck.',
  };

  const testExperiment: ValidationExperiment = {
    id: 'EXP-1',
    title: 'Machine Manual Lookup Observational Study',
    objective: 'Measure time to locate Bridgeport mill torque specifications.',
    hypothesis: 'Students spend >10 minutes per session searching through paper/PDF manuals.',
    targetParticipants: '5 mechanical engineering undergraduates',
    method: 'Direct timed observation + retrospective inquiry',
    steps: ['Observe machining session', 'Record lookup delays', 'Interview student after part completion'],
    inquiryQuestions: ['What was the last spec you looked up?', 'Where did you find the tolerance?'],
    evidenceToRecord: ['Time elapsed in minutes', 'Workarounds attempted'],
    supportingSignals: ['Lookup exceeds 10 minutes', 'Student gives up and asks TA'],
    weakeningSignals: ['Lookup takes <2 minutes', 'Student uses personal notebook with all specs pre-written'],
    limitations: ['Small sample size in a single university workshop.'],
    estimatedEffort: '2 hours observation + 30 min synthesis',
  };

  // =========================================================================
  // TIER 1: Feature Coverage (Subjective detection, 3 verdict categories)
  // =========================================================================
  describe('Tier 1: Feature 1 - Subjective Opinion Filtering (isSubjectiveOpinionOnly)', () => {
    it('detects "everyone loves this idea" as subjective praise', () => {
      expect(isSubjectiveOpinionOnly('Everyone loves this idea!')).toBe(true);
    });

    it('detects "they think it is a great idea" as subjective praise', () => {
      expect(isSubjectiveOpinionOnly('They think it is a great idea and will be huge')).toBe(true);
      expect(isSubjectiveOpinionOnly("said it's a great idea")).toBe(true);
    });

    it('detects "cool idea" and "nice concept" as subjective praise', () => {
      expect(isSubjectiveOpinionOnly('This is a really cool idea for students')).toBe(true);
      expect(isSubjectiveOpinionOnly('Nice concept, would definitely help')).toBe(true);
      expect(isSubjectiveOpinionOnly('Loved the concept when I showed them the sketch')).toBe(true);
    });

    it('detects "would totally use" and "my friends said" as polite enthusiasm', () => {
      expect(isSubjectiveOpinionOnly('They said they would totally use it if available')).toBe(true);
      expect(isSubjectiveOpinionOnly('My friends said they like the concept')).toBe(true);
      expect(isSubjectiveOpinionOnly('Definitely gonna blow up on campus')).toBe(true);
    });

    it('identifies concrete past behavioral evidence as NON-subjective', () => {
      expect(
        isSubjectiveOpinionOnly(
          'Student spent 25 minutes flipping through section 4 of the lathe manual before asking the TA.'
        )
      ).toBe(false);
      expect(
        isSubjectiveOpinionOnly(
          'Participant keeps a handwritten spiral notebook with 18 common feed rate formulas on page 3.'
        )
      ).toBe(false);
      expect(
        isSubjectiveOpinionOnly(
          'Lab coordinator reported 12 machine downtime incidents last month caused by incorrect spindle speeds.'
        )
      ).toBe(false);
    });
  });

  describe('Tier 1: Feature 2 - Verdict Category: INSUFFICIENT_EVIDENCE', () => {
    it('returns INSUFFICIENT_EVIDENCE when findings array is completely empty', () => {
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, []);
      expect(verdict.category).toBe('INSUFFICIENT_EVIDENCE');
      expect(verdict.supportedClaims).toHaveLength(0);
      expect(verdict.unsupportedClaims.length).toBe(testAnalysis.assumptions.length);
      expect(verdict.rationale).toContain('No evidence findings were submitted');
      expect(verdict.assumptionStatusUpdates.every((u) => u.newStatus === 'unverified')).toBe(true);
    });

    it('returns INSUFFICIENT_EVIDENCE when all findings are purely polite subjective praise', () => {
      const subjectiveFindings: Finding[] = [
        {
          id: 'F1',
          description: 'Participant 1 said: Everyone loves this idea, definitely gonna blow up!',
          sourceType: 'interpretation',
          isCredibleObservation: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'F2',
          description: 'Participant 2: Loved the concept, think it is a great idea.',
          sourceType: 'user_reported_experience',
          isCredibleObservation: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, subjectiveFindings);
      expect(verdict.category).toBe('INSUFFICIENT_EVIDENCE');
      expect(verdict.supportedClaims).toHaveLength(0);
      expect(verdict.rationale).toContain('exclusively of general positive feedback');
    });

    it('returns INSUFFICIENT_EVIDENCE when only a single supporting finding is recorded', () => {
      const singleSupporting: Finding[] = [
        {
          id: 'F1',
          description: 'Student struggled for 20 minutes and wasted time trying to find spindle specs.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, singleSupporting);
      expect(verdict.category).toBe('INSUFFICIENT_EVIDENCE');
      expect(verdict.rationale).toContain('Only a single supporting observation was recorded');
    });

    it('returns recommended inquiry interview protocol for next experiment when evidence is insufficient', () => {
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, []);
      expect(verdict.recommendedNextExperiment).toBeTruthy();
    });
  });

  describe('Tier 1: Feature 3 - Verdict Category: REVISE_THE_HYPOTHESIS', () => {
    it('evaluates contradictory findings from Demo Scenario B to REVISE_THE_HYPOTHESIS', () => {
      const verdict = evaluateEvidenceHeuristic(
        DEMO_SCENARIO_A.problem,
        DEMO_SCENARIO_A.analysis!,
        DEMO_SCENARIO_A.experiment!,
        DEMO_SCENARIO_B_FINDINGS
      );
      expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(verdict.contradictoryFindings.length).toBeGreaterThanOrEqual(1);
      expect(verdict.rationale).toContain('significant counter-evidence');
      expect(verdict.updatedProblemStatement).toContain('Refined focus:');
    });

    it('detects contradiction keyword "already solved" and marks claim unsupported', () => {
      const findings: Finding[] = [
        {
          id: 'C1',
          description: 'Student stated the spec problem is already solved by an open-source spreadsheet on GitHub.',
          sourceType: 'user_reported_experience',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, findings);
      expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(verdict.contradictoryFindings).toHaveLength(1);
      expect(verdict.unsupportedClaims).toContain(testAnalysis.assumptions[0].claim);
    });

    it('detects "works fine" and "won\'t switch" as clear counter-evidence', () => {
      const findings: Finding[] = [
        {
          id: 'C1',
          description: 'Lab technician says physical cheat-sheets taped to the machine works fine and they won\'t switch to any app.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'ASM-3',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, findings);
      expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(verdict.contradictoryFindings[0]).toContain("won't switch");
    });

    it('recommends a workaround audit when hypothesis must be revised', () => {
      const findings: Finding[] = [
        {
          id: 'C1',
          description: 'Students find lookup painless using their personal cheat-sheets.',
          sourceType: 'user_reported_experience',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, findings);
      expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(verdict.recommendedNextExperiment).toContain('workaround audit');
    });
  });

  describe('Tier 1: Feature 4 - Verdict Category: EVIDENCE_SUPPORTS_FURTHER_TESTING', () => {
    const validSupportingFindings: Finding[] = [
      {
        id: 'S1',
        description: 'Observed student struggled for 22 painful minutes attempting to find lathe gear backlash settings.',
        sourceType: 'direct_observation',
        relatedAssumptionId: 'ASM-1',
        isCredibleObservation: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'S2',
        description: 'Second student lost time and wasted 15 minutes because manual schematics were broken and illegible.',
        sourceType: 'user_reported_experience',
        relatedAssumptionId: 'ASM-1',
        isCredibleObservation: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'S3',
        description: 'Observed TA interrupted 4 times in 1 hour by students with manual lookup questions with manual effort.',
        sourceType: 'direct_observation',
        relatedAssumptionId: 'ASM-2',
        isCredibleObservation: true,
        createdAt: new Date().toISOString(),
      },
    ];

    it('evaluates multiple credible supporting findings as EVIDENCE_SUPPORTS_FURTHER_TESTING', () => {
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, validSupportingFindings);
      expect(verdict.category).toBe('EVIDENCE_SUPPORTS_FURTHER_TESTING');
      expect(verdict.supportedClaims.length).toBeGreaterThanOrEqual(1);
      expect(verdict.supportedClaims).toContain(testAnalysis.assumptions[0].claim);
    });

    it('updates verified assumptions to "supported" status with positive rationales', () => {
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, validSupportingFindings);
      const asm1Update = verdict.assumptionStatusUpdates.find((u) => u.id === 'ASM-1');
      expect(asm1Update?.newStatus).toBe('supported');
      expect(asm1Update?.reason).toContain('Observed past user behavior and friction supported');
    });

    it('recommends low-fidelity behavioral simulation or concierged prototype for further testing', () => {
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, validSupportingFindings);
      expect(verdict.recommendedNextExperiment).toContain('behavioral simulation or concierged prototype');
    });

    it('strictly avoids prohibited epistemic claims ("PROVEN", "GUARANTEED MARKET DEMAND")', () => {
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, validSupportingFindings);
      const fullText = JSON.stringify(verdict).toUpperCase();
      expect(fullText).not.toContain('"PROVEN"');
      expect(fullText).not.toContain('GUARANTEED MARKET DEMAND');
      expect(fullText).not.toContain('VALIDATED AS A CERTAINTY');
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('evaluates tie between contradictory and supporting findings as REVISE_THE_HYPOTHESIS (counter-evidence priority)', () => {
      const mixedFindings: Finding[] = [
        {
          id: 'M1',
          description: 'Student struggled for 15 minutes and failed to find the torque spec.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'M2',
          description: 'Second student said setup is painless and already solved with their phone calculator.',
          sourceType: 'user_reported_experience',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, mixedFindings);
      // In a 1-to-1 tie, counter-evidence triggers REVISE_THE_HYPOTHESIS
      expect(verdict.category).toBe('REVISE_THE_HYPOTHESIS');
      expect(verdict.contradictoryFindings).toHaveLength(1);
    });

    it('treats findings with fewer than 10 characters as subjective/insufficient noise', () => {
      const shortFindings: Finding[] = [
        {
          id: 'T1',
          description: 'struggled', // < 10 chars
          sourceType: 'direct_observation',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'T2',
          description: 'wasted', // < 10 chars
          sourceType: 'direct_observation',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, shortFindings);
      expect(verdict.category).toBe('INSUFFICIENT_EVIDENCE');
      expect(verdict.supportedClaims).toHaveLength(0);
    });

    it('handles findings with unmapped or undefined relatedAssumptionId gracefully', () => {
      const unmappedFindings: Finding[] = [
        {
          id: 'U1',
          description: 'Observed student struggled and lost time due to fragmented manual sheets.',
          sourceType: 'direct_observation',
          relatedAssumptionId: undefined, // unmapped
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'U2',
          description: 'Observed student spent hours dealing with broken paper manual index.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'NON_EXISTENT_ID', // invalid foreign key
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, unmappedFindings);
      // Overall verdict can still detect supporting keywords
      expect(['EVIDENCE_SUPPORTS_FURTHER_TESTING', 'INSUFFICIENT_EVIDENCE']).toContain(verdict.category);
      expect(verdict.assumptionStatusUpdates).toHaveLength(testAnalysis.assumptions.length);
    });

    it('evaluates large volume of findings (50 entries) without performance degradation or errors', () => {
      const largeFindingSet: Finding[] = Array.from({ length: 50 }, (_, i) => ({
        id: `FND-${i}`,
        description: `Student trial ${i}: struggled for ${15 + (i % 10)} painful minutes due to unindexed raster schematics.`,
        sourceType: 'direct_observation' as const,
        relatedAssumptionId: 'ASM-1',
        isCredibleObservation: true,
        createdAt: new Date().toISOString(),
      }));

      const start = performance.now();
      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, largeFindingSet);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Less than 50ms execution
      expect(verdict.category).toBe('EVIDENCE_SUPPORTS_FURTHER_TESTING');
      expect(verdict.supportedClaims).toContain(testAnalysis.assumptions[0].claim);
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Combinations
  // =========================================================================
  describe('Tier 3: Assumption Status Updates Mapping', () => {
    it('sets status to unverified for assumptions with zero direct findings', () => {
      // Finding only applies to ASM-1
      const findings: Finding[] = [
        {
          id: 'F1',
          description: 'Student struggled for 20 minutes with manual friction.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, findings);
      const asm2Update = verdict.assumptionStatusUpdates.find((u) => u.id === 'ASM-2');
      const asm3Update = verdict.assumptionStatusUpdates.find((u) => u.id === 'ASM-3');

      expect(asm2Update?.newStatus).toBe('unverified');
      expect(asm3Update?.newStatus).toBe('unverified');
      expect(verdict.unsupportedClaims).toContain(testAnalysis.assumptions[1].claim);
      expect(verdict.unsupportedClaims).toContain(testAnalysis.assumptions[2].claim);
    });

    it('sets status to partially_supported when an assumption receives mixed signals', () => {
      const mixedFindingsForAsm1: Finding[] = [
        {
          id: 'F1',
          description: 'Participant struggled with finding manual torque specs.',
          sourceType: 'direct_observation',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'F2',
          description: 'Same participant said torque lookup is painless once you know the trick.',
          sourceType: 'user_reported_experience',
          relatedAssumptionId: 'ASM-1',
          isCredibleObservation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const verdict = evaluateEvidenceHeuristic(testProblem, testAnalysis, testExperiment, mixedFindingsForAsm1);
      const asm1Update = verdict.assumptionStatusUpdates.find((u) => u.id === 'ASM-1');
      expect(asm1Update?.newStatus).toBe('partially_supported');
      expect(asm1Update?.reason).toContain('Mixed or inconclusive observations');
    });
  });
});
