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
        'You described a general tool ("AI app") instead of a specific daily frustration or painful task that students actually struggle with.',
      missingDetails: [
        'Which exact part of studying fails? (remembering facts, managing time, understanding concepts, or organizing notes)?',
        'Which specific students struggle the most? (e.g., first-year engineering students vs. literature students)?',
        'Why aren\'t current tools good enough? (Quizlet, flashcards, study groups, or phone reminders)?',
      ],
    },
    refinedProblemStatement:
      'College students cramming for exams struggle to tell which specific topics they misunderstand until they take a practice quiz.',
    targetUserAmbiguity:
      '"College students" is too broad. For example, engineering undergraduates and history students study in completely different ways.',
    assumptions: [
      {
        id: 'ASM-1',
        claim: 'Students struggle because existing study tools do not adapt to their knowledge gaps.',
        reason: 'If free tools like Quizlet already work well enough, students have no reason to try anything new.',
        whyItMatters: 'If free tools like Quizlet already work well enough, students have no reason to try anything new.',
        risk: 'high',
        riskLevel: 'high',
        status: 'unverified',
        evidenceNeeded: ['Real examples of how their current study routine failed during recent exams.'],
        nextAction: 'Ask students to walk you through how they prepared for their very last exam.',
        recommendedNextAction: 'Ask students to walk you through how they prepared for their very last exam.',
      },
      {
        id: 'ASM-2',
        claim: 'Students are willing to try a new AI tool during stressful exam crunch weeks.',
        reason: 'When stressed before exams, students stick to simple habits like re-reading notes instead of learning new software.',
        whyItMatters: 'When stressed before exams, students stick to simple habits like re-reading notes instead of learning new software.',
        risk: 'high',
        riskLevel: 'high',
        status: 'unverified',
        evidenceNeeded: ['Proof that students actually downloaded and set up new tools right before an exam.'],
        nextAction: 'Watch whether students will spend 5 minutes setting up a study app during midterm week.',
        recommendedNextAction: 'Watch whether students will spend 5 minutes setting up a study app during midterm week.',
      },
      {
        id: 'ASM-3',
        claim: 'The main bottleneck is study efficiency rather than emotional procrastination.',
        reason: 'If the real blocker is putting off studying or feeling anxious, a study app will not solve the problem.',
        whyItMatters: 'If the real blocker is putting off studying or feeling anxious, a study app will not solve the problem.',
        risk: 'medium',
        riskLevel: 'medium',
        status: 'unverified',
        evidenceNeeded: ['Proof of where study time is actually lost (distraction vs. genuine confusion).'],
        nextAction: 'Ask students what they do the exact moment they feel stuck during a study session.',
        recommendedNextAction: 'Ask students what they do the exact moment they feel stuck during a study session.',
      },
    ],
    evidenceGaps: [
      {
        description: 'No proof yet that students cannot already tell which topics they are weak at.',
        importance: 'high',
        howToInvestigate: 'Compare what students think their score will be with their actual practice quiz results.',
      },
      {
        description: 'No proof that students would pay money or switch away from free tools like Quizlet.',
        importance: 'high',
        howToInvestigate: 'Find out what study tools students in your target dorms currently pay for.',
      },
    ],
    alternativeExplanations: [
      'Students understand the material fine, but are simply exhausted from sleep deprivation and busy schedules.',
      'Students already have all the notes they need, but keep putting off studying until the night before.',
    ],
    existingWorkarounds: [
      'Making flashcards on Quizlet or Anki',
      'Watching lecture recordings at 2x speed',
      'Group cram sessions using shared Google Docs',
    ],
    highestRiskUncertainty:
      'Assuming students need an AI app, when their real struggle might simply be putting off studying until the last minute.',
    suggestedValidationObjective:
      'Talk to students about their last exam to find out if the problem is knowledge confusion or procrastination.',
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
