import type {
  AnalysisResult,
  DecisionBrief,
  Finding,
  ProblemInput,
  ValidationExperiment,
} from '../src/types/index.ts';

export interface DemoScenario {
  id: string;
  name: string;
  problem: ProblemInput;
  analysis: AnalysisResult;
  experiment: ValidationExperiment;
  findings: Finding[];
  decisionBrief: DecisionBrief;
}

export const DEMO_SCENARIO_A: DemoScenario = {
  id: 'demo-scenario-a',
  name: 'Scenario A: Vague Study App',
  problem: {
    idea: 'An AI app that helps college students study better.',
    targetUser: 'College students',
    context: 'During midterm and final exams across university courses.',
    existingObservations: 'A few friends in my dorm said they feel stressed before exams.',
    existingEvidence: 'A few friends in my dorm said they feel stressed before exams.',
    constraints: 'Hackathon weekend, access to ~10 university peers.',
  },
  analysis: {
    problemClarity: {
      status: 'vague',
      explanation:
        'The proposal describes a broad solution category ("AI app") rather than a specific, identifiable operational bottleneck or painful recurring task.',
      missingDetails: [
        'What specific part of studying fails? (retention, time management, concept comprehension, note synthesis)?',
        'Which specific subgroup of students experiences the highest friction?',
        'Why do existing solutions (Quizlet, flashcards, study groups, calendar alerts) fall short?',
      ],
    },
    refinedProblemStatement:
      'College students cramming for exams struggle to identify which specific topics they misunderstand before taking practice tests.',
    targetUserAmbiguity:
      '"College students" is excessively broad (e.g., STEM undergraduates vs humanities graduate students have radically different study mechanics).',
    assumptions: [
      {
        id: 'ASM-1',
        claim: 'Students struggle because existing study tools do not adapt to their knowledge gaps.',
        reason: 'If existing tools already work adequately, students have zero switching incentive.',
        whyItMatters: 'If existing tools already work adequately, students have zero switching incentive.',
        risk: 'high',
        riskLevel: 'high',
        status: 'unverified',
        evidenceNeeded: ['Observed past failures of current study methods during exam prep.'],
        nextAction: 'Ask students to walk through their preparation for their most recent exam.',
        recommendedNextAction: 'Ask students to walk through their preparation for their most recent exam.',
      },
      {
        id: 'ASM-2',
        claim: 'Students are willing to actively engage with an AI diagnostic tool during stressful crunch periods.',
        reason: 'Under time pressure, students default to low-friction familiar habits (rereading notes).',
        whyItMatters: 'Under time pressure, students default to low-friction familiar habits (rereading notes).',
        risk: 'high',
        riskLevel: 'high',
        status: 'unverified',
        evidenceNeeded: ['Behavioral logs or reports of students adopting new tools during exam weeks.'],
        nextAction: 'Observe whether students actually spend time configuring study tools.',
        recommendedNextAction: 'Observe whether students actually spend time configuring study tools.',
      },
      {
        id: 'ASM-3',
        claim: 'The core bottleneck is study efficiency rather than emotional procrastination.',
        reason: 'If the real blocker is procrastination or anxiety, an AI study assistant will not address the root cause.',
        whyItMatters: 'If the real blocker is procrastination or anxiety, an AI study assistant will not address the root cause.',
        risk: 'medium',
        riskLevel: 'medium',
        status: 'unverified',
        evidenceNeeded: ['Root cause breakdown of student study delays.'],
        nextAction: 'Inquire about what students do during study blocks when they get stuck.',
        recommendedNextAction: 'Inquire about what students do during study blocks when they get stuck.',
      },
    ],
    evidenceGaps: [
      {
        description: 'No empirical observation showing that students cannot diagnose their own weak areas.',
        importance: 'high',
        howToInvestigate: 'Review student self-assessments against actual quiz outcomes.',
      },
      {
        description: 'Zero evidence that students would pay or switch from free tools like Anki or Quizlet.',
        importance: 'high',
        howToInvestigate: 'Examine current spending and tool adoption in target dorms.',
      },
    ],
    alternativeExplanations: [
      'Students do not suffer from lack of study intelligence, but rather sleep deprivation and scheduling overload.',
      'Students already have sufficient notes, but lack motivation to start early.',
    ],
    existingWorkarounds: [
      'Quizlet / Anki flashcards',
      'Rewatching lecture recordings at 2x speed',
      'Peer group cram sessions with shared Google Docs',
    ],
    highestRiskUncertainty:
      'Assuming that students need an AI app when their actual pain point might be emotional procrastination.',
    suggestedValidationObjective:
      'Investigate recent exam study behaviors to pinpoint whether the friction is knowledge diagnosis or start-up inertia.',
  },
  experiment: {
    id: 'EXP-1',
    title: 'Recent Exam Retrospective Interview',
    objective: 'Determine where study workflows broke down during the last exam period.',
    hypothesis:
      'Students spend excessive time deciding what to review rather than actively mastering weak concepts.',
    targetParticipants: '5-8 undergraduate STEM students who completed exams within the last 30 days.',
    method: '15-minute retrospective past-behavior interview (strictly no hypothetical questions).',
    steps: [
      'Ask the student to recall their most difficult exam from last month.',
      'Have them reconstruct their exact actions in the 72 hours leading up to the test.',
      'Identify every tool and resource opened (browser tabs, notebooks, apps).',
      'Note the exact moment they felt confused or wasted time.',
      'Ask what they did to overcome that confusion.',
    ],
    inquiryQuestions: [
      'Tell me about the last exam you studied for. When did you start, and what was the very first thing you opened?',
      'What was the hardest concept to study, and how did you finally realize you did not understand it?',
      'Did you try using any app or software to help? What happened?',
      'What was the most frustrating 30 minutes of that study session?',
    ],
    nonLeadingQuestions: [
      'Tell me about the last exam you studied for. When did you start, and what was the very first thing you opened?',
      'What was the hardest concept to study, and how did you finally realize you did not understand it?',
      'Did you try using any app or software to help? What happened?',
      'What was the most frustrating 30 minutes of that study session?',
    ],
    evidenceToRecord: [
      'Specific tools used and abandoned.',
      'Exact duration spent searching vs studying.',
      'Verbatim descriptions of friction moments.',
    ],
    supportingSignals: [
      'Participant recounts spending >1 hour trying to figure out which chapters to prioritize.',
      'Participant created manual spreadsheets or checklists to track their confusion.',
    ],
    weakeningSignals: [
      'Participant followed professor study guide without difficulty.',
      'Participant states Quizlet or lecture slides were completely sufficient.',
      'Participant admits they only studied 2 hours before the exam due to lack of effort.',
    ],
    limitations: [
      'Self-reported recall may omit small subconscious steps.',
      'Small cohort from a single university department may not represent all majors.',
    ],
    estimatedEffort: '1.5 hours total (5 interviews × 15 min + synthesis)',
  },
  findings: [],
  decisionBrief: {
    verdict: 'INSUFFICIENT EVIDENCE',
    category: 'INSUFFICIENT_EVIDENCE',
    updatedProblemStatement: 'An AI app that helps college students study better.',
    supportedClaims: [],
    unsupportedClaims: [
      'Students struggle because existing study tools do not adapt to their knowledge gaps.',
      'Students are willing to actively engage with an AI diagnostic tool during stressful crunch periods.',
      'The core bottleneck is study efficiency rather than emotional procrastination.',
    ],
    contradictoryFindings: [],
    remainingUncertainties: ['All assumptions remain unverified due to lack of recorded data.'],
    recommendedNextSteps: [
      'Conduct 5 retrospective student interviews focused on past study behaviors.',
      'Document tools used and friction encountered during the most recent midterm period.',
    ],
    recommendedNextExperiment: 'Conduct initial exploratory retrospective interviews.',
    rationale:
      'No evidence findings were submitted. A validation verdict cannot be issued without recorded empirical observations.',
    assumptionStatusUpdates: [
      { id: 'ASM-1', newStatus: 'unverified', reason: 'No evidence provided.' },
      { id: 'ASM-2', newStatus: 'unverified', reason: 'No evidence provided.' },
      { id: 'ASM-3', newStatus: 'unverified', reason: 'No evidence provided.' },
    ],
  },
};

export const DEMO_SCENARIO_B_FINDINGS: Finding[] = [
  {
    id: 'FND-B1',
    description:
      'Participant 1 (Sophomore, CS): Described exam prep. Used Google Calendar for scheduling study blocks. Said scheduling was painless, but struggled with understanding dynamic programming proofs and relied on TA office hours.',
    sourceType: 'user_reported',
    relatedHypothesis: 'EXP-1',
    relatedAssumptionId: 'ASM-1',
    context: 'Workaround (TA office hours) resolved the problem directly.',
    contextNotes: 'Workaround (TA office hours) resolved the problem directly.',
    isCredibleObservation: true,
    timestamp: '2026-10-28T09:00:00.000Z',
    createdAt: '2026-10-28T09:00:00.000Z',
  },
  {
    id: 'FND-B2',
    description:
      'Participant 2 (Junior, Bio): Uses Notion study planner template downloaded from Reddit. Expressed high satisfaction with Notion and stated they would not install another tool for revision planning.',
    sourceType: 'direct_observation',
    relatedHypothesis: 'EXP-1',
    relatedAssumptionId: 'ASM-1',
    context: 'Direct contradiction to claim that students lack workable revision planning tools.',
    contextNotes: 'Direct contradiction to claim that students lack workable revision planning tools.',
    isCredibleObservation: true,
    timestamp: '2026-10-28T09:30:00.000Z',
    createdAt: '2026-10-28T09:30:00.000Z',
  },
  {
    id: 'FND-B3',
    description:
      'Participant 3 (Freshman, Econ): Left revision to the night before. Admitted that no app could have fixed their issue because they were gaming until 2 AM.',
    sourceType: 'user_reported',
    relatedHypothesis: 'EXP-1',
    relatedAssumptionId: 'ASM-3',
    context: 'Friction was motivation/procrastination rather than tool inadequacy.',
    contextNotes: 'Friction was motivation/procrastination rather than tool inadequacy.',
    isCredibleObservation: true,
    timestamp: '2026-10-28T10:00:00.000Z',
    createdAt: '2026-10-28T10:00:00.000Z',
  },
  {
    id: 'FND-B4',
    description:
      'Participant 4 (Senior, MechE): Said they loved the concept and would totally use an AI app if it was free, but has never paid for software in 4 years of college.',
    sourceType: 'interpretation',
    relatedHypothesis: 'EXP-1',
    relatedAssumptionId: 'ASM-2',
    context: 'Polite enthusiasm without willingness to pay.',
    contextNotes: 'Polite enthusiasm without willingness to pay.',
    isCredibleObservation: false,
    timestamp: '2026-10-28T10:30:00.000Z',
    createdAt: '2026-10-28T10:30:00.000Z',
  },
];

export const DEMO_SCENARIO_B: DemoScenario = {
  ...DEMO_SCENARIO_A,
  id: 'demo-scenario-b',
  name: 'Scenario B: Contradictory Findings',
  findings: DEMO_SCENARIO_B_FINDINGS,
  decisionBrief: {
    verdict: 'REVISE THE HYPOTHESIS',
    category: 'REVISE_THE_HYPOTHESIS',
    updatedProblemStatement:
      'Refined focus: Investigate specific niche conditions where current workarounds fail, rather than general An AI app that helps college students study better.',
    supportedClaims: [],
    unsupportedClaims: [
      'Students struggle because existing study tools do not adapt to their knowledge gaps.',
      'Students are willing to actively engage with an AI diagnostic tool during stressful crunch periods.',
      'The core bottleneck is study efficiency rather than emotional procrastination.',
    ],
    contradictoryFindings: [
      '[direct_observation] Participant 2 (Junior, Bio): Uses Notion study planner template downloaded from Reddit. Expressed high satisfaction with Notion and stated they would not install another tool for revision planning.',
      '[user_reported] Participant 1 (Sophomore, CS): Described exam prep. Used Google Calendar for scheduling study blocks. Said scheduling was painless, but struggled with understanding dynamic programming proofs and relied on TA office hours.',
    ],
    remainingUncertainties: [
      'Whether any sub-cohort of students experiences tool switching willingness.',
      'Whether procrastination can be influenced by pre-commitment devices.',
    ],
    recommendedNextSteps: [
      'Conduct workaround audit on specific STEM problem types (like dynamic programming) where TA support is unavailable.',
      'Do not build general study scheduler or revision planner.',
    ],
    recommendedNextExperiment: 'Conduct workaround failure audit for upper-level STEM homework blocks.',
    rationale:
      'Observed findings reveal significant counter-evidence: 2 participants report that current workarounds (Google Calendar, Notion, TA hours) are satisfactory, and 1 participant identified procrastination/gaming as root cause rather than study tool deficiencies.',
    assumptionStatusUpdates: [
      {
        id: 'ASM-1',
        newStatus: 'unverified',
        reason: 'Findings directly challenged or disproved this assumption.',
      },
      {
        id: 'ASM-2',
        newStatus: 'unverified',
        reason: 'Polite enthusiasm without behavioral willingness to pay.',
      },
      {
        id: 'ASM-3',
        newStatus: 'unverified',
        reason: 'Participant 3 reported procrastination root cause rather than tool failure.',
      },
    ],
  },
};

export function getDemoScenario(scenario?: string): DemoScenario {
  const norm = (scenario || '').toLowerCase().trim();
  if (norm === 'b' || norm === 'contradictory_study' || norm.includes('contradictory')) {
    return DEMO_SCENARIO_B;
  }
  return DEMO_SCENARIO_A;
}
