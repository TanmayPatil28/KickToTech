import type {
  AnalysisResult,
  Assumption,
  EvidenceStatus,
  Finding,
  ProblemInput,
  ValidationExperiment,
  Verdict,
  VerdictCategory,
} from '../types/index.ts';

/**
 * Checks if a finding contains concrete behavioral observation or credible reporting
 * versus unsupported subjective praise/opinion.
 */
export function isSubjectiveOpinionOnly(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  const subjectivePatterns = [
    /everyone love/i,
    /everyone like/i,
    /they think it(?:'s|\s+is|\s+was)\s+a\s+great\s+idea/i,
    /said (?:they|it)(?:'s|\s+is|\s+was)\s+a\s+great\s+idea/i,
    /cool idea/i,
    /nice concept/i,
    /loved the concept/i,
    /great app/i,
    /definitely gonna blow up/i,
    /my friend like/i,
    /my friends said/i,
    /would totally use/i,
  ];

  return subjectivePatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Evaluates user-submitted findings against the problem hypothesis and assumptions.
 * Complies strictly with Lead Directive §5 (Corrected Evidence Evaluation Rules).
 */
export function evaluateEvidenceHeuristic(
  problem: ProblemInput,
  analysis: AnalysisResult,
  experiment: ValidationExperiment,
  findings: Finding[]
): Verdict {
  // Rule 1: Empty findings yields INSUFFICIENT_EVIDENCE
  if (!findings || findings.length === 0) {
    return {
      category: 'INSUFFICIENT_EVIDENCE',
      rationale:
        'No evidence findings were submitted. A validation verdict cannot be issued without recorded empirical observations.',
      updatedProblemStatement: problem.idea,
      supportedClaims: [],
      unsupportedClaims: analysis.assumptions.map((a: Assumption) => a.claim),
      contradictoryFindings: [],
      remainingUncertainties: ['All assumptions remain unverified due to lack of recorded data.'],
      assumptionStatusUpdates: analysis.assumptions.map((a: Assumption) => ({
        id: a.id,
        newStatus: 'unverified' as EvidenceStatus,
        reason: 'No evidence provided.',
      })),
      recommendedNextExperiment: experiment.title || 'Conduct initial exploratory interviews.',
    };
  }

  // Filter findings: separate credible observations/reports from pure subjective assertions
  const credibleFindings = findings.filter(
    (f) => !isSubjectiveOpinionOnly(f.description) && f.description.trim().length >= 10
  );

  const subjectiveOnlyFindings = findings.filter(
    (f) => isSubjectiveOpinionOnly(f.description) || f.description.trim().length < 10
  );

  // Rule 2: If ALL findings are purely subjective praise or too terse, reject as INSUFFICIENT_EVIDENCE
  if (credibleFindings.length === 0 && subjectiveOnlyFindings.length > 0) {
    return {
      category: 'INSUFFICIENT_EVIDENCE',
      rationale:
        'The submitted findings consist exclusively of general positive feedback ("everyone loves this idea") or unsubstantiated opinions. Polite enthusiasm does not establish the existence of a real, recurring problem or actual past behavioral difficulty.',
      updatedProblemStatement: problem.idea,
      supportedClaims: [],
      unsupportedClaims: analysis.assumptions.map((a: Assumption) => a.claim),
      contradictoryFindings: [],
      remainingUncertainties: [
        'Whether users actually experience this problem in real-life workflows.',
        'Whether existing workarounds are truly failing.',
      ],
      assumptionStatusUpdates: analysis.assumptions.map((a: Assumption) => ({
        id: a.id,
        newStatus: 'unverified' as EvidenceStatus,
        reason: 'Subjective praise cannot verify behavioral claims.',
      })),
      recommendedNextExperiment:
        'Interview users strictly about their last actual experience: "Tell me about the last time this happened. What specific tool or workaround did you use?"',
    };
  }

  // Detect contradiction signals in findings
  const contradictionKeywords = [
    /already solved/i,
    /satisfi/i,
    /painless/i,
    /no problem/i,
    /no difficulty/i,
    /not an issue/i,
    /easy with/i,
    /(?:use|used)\s+(?:google|notion|excel|calendar|paper|anki)/i,
    /works fine/i,
    /don't need/i,
    /no app (?:could|can|would)/i,
    /(?:would not|won't)\s+(?:switch|install|pay|use)/i,
    /(?:never|not)\s+(?:pay|paid|switch)/i,
    /happy with existing/i,
  ];

  const supportingKeywords = [
    /struggl/i,
    /failed/i,
    /lost time/i,
    /wasted/i,
    /frustrat/i,
    /painful/i,
    /broken/i,
    /manual effort/i,
    /no good way/i,
    /spent hours/i,
  ];

  const contradictoryFindings: string[] = [];
  const supportingFindings: string[] = [];

  credibleFindings.forEach((f) => {
    const isContradiction = contradictionKeywords.some((rgx) => rgx.test(f.description));
    const isSupport = supportingKeywords.some((rgx) => rgx.test(f.description));

    if (isContradiction) {
      contradictoryFindings.push(`[${f.sourceType}] ${f.description}`);
    } else if (isSupport) {
      supportingFindings.push(`[${f.sourceType}] ${f.description}`);
    }
  });

  // Assumption attribution: Map findings to specific assumptions
  const statusUpdates: Array<{ id: string; newStatus: EvidenceStatus; reason: string }> = [];
  const supportedClaims: string[] = [];
  const unsupportedClaims: string[] = [];

  analysis.assumptions.forEach((asm: Assumption) => {
    const related = credibleFindings.filter((f) => f.relatedAssumptionId === asm.id);

    if (related.length === 0) {
      statusUpdates.push({
        id: asm.id,
        newStatus: 'unverified',
        reason: 'No recorded findings directly evaluated this claim.',
      });
      unsupportedClaims.push(asm.claim);
    } else {
      const hasContradiction = related.some((f) => contradictionKeywords.some((rgx) => rgx.test(f.description)));
      const hasSupport = related.some((f) => supportingKeywords.some((rgx) => rgx.test(f.description)));

      if (hasContradiction && !hasSupport) {
        statusUpdates.push({
          id: asm.id,
          newStatus: 'unverified',
          reason: 'Findings directly challenged or disproved this assumption.',
        });
        unsupportedClaims.push(asm.claim);
      } else if (hasSupport && !hasContradiction) {
        statusUpdates.push({
          id: asm.id,
          newStatus: 'supported',
          reason: 'Observed past user behavior and friction supported this specific claim.',
        });
        supportedClaims.push(asm.claim);
      } else {
        statusUpdates.push({
          id: asm.id,
          newStatus: 'partially_supported',
          reason: 'Mixed or inconclusive observations recorded for this claim.',
        });
        unsupportedClaims.push(asm.claim);
      }
    }
  });

  // Synthesize final decision category (Directive §5: nuanced evaluation)
  let category: VerdictCategory = 'INSUFFICIENT_EVIDENCE';
  let rationale = '';

  if (contradictoryFindings.length > 0 && contradictoryFindings.length >= supportingFindings.length) {
    category = 'REVISE_THE_HYPOTHESIS';
    rationale = `Observed findings reveal significant counter-evidence to the original problem formulation: ${contradictoryFindings.length} observation(s) indicate that target users either do not experience this friction acutely or find existing workarounds satisfactory. The core problem statement must be narrowed or redirected before proceeding with any solution.`;
  } else if (supportingFindings.length >= 2 && supportedClaims.length > 0) {
    category = 'EVIDENCE_SUPPORTS_FURTHER_TESTING';
    rationale = `The collected findings contain credible behavioral evidence demonstrating genuine recurring friction in the targeted scenario. While these findings justify continuing the investigation, they represent a small sample and do not prove broad market demand or product-market fit.`;
  } else if (supportingFindings.length === 1) {
    category = 'INSUFFICIENT_EVIDENCE';
    rationale = `Only a single supporting observation was recorded. An isolated instance demonstrates possibility, but does not provide sufficient empirical confidence to validate recurring severity across the target demographic.`;
  } else {
    category = 'INSUFFICIENT_EVIDENCE';
    rationale = `The recorded findings are mixed or insufficient to confirm that the proposed problem warrants substantial development effort. Further focused inquiry is recommended.`;
  }

  // Refine problem statement based on findings
  let updatedProblem = problem.idea;
  if (category === 'REVISE_THE_HYPOTHESIS' && contradictoryFindings.length > 0) {
    updatedProblem = `Refined focus: Investigate specific niche conditions where current workarounds fail, rather than general ${problem.idea}.`;
  }

  return {
    category,
    rationale,
    updatedProblemStatement: updatedProblem,
    supportedClaims,
    unsupportedClaims,
    contradictoryFindings,
    remainingUncertainties: [
      'Sample size remains limited to recorded participant entries.',
      'Willingness to pay / switch from current workarounds remains unmeasured.',
    ],
    assumptionStatusUpdates: statusUpdates,
    recommendedNextExperiment:
      category === 'REVISE_THE_HYPOTHESIS'
        ? 'Conduct workaround audit: examine why existing tools fail in edge cases.'
        : 'Perform a low-fidelity behavioral simulation or concierged prototype test.',
  };
}
