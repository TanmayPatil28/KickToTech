import type { CaseState, Finding } from '../types/index.ts';

export const DEMO_SCENARIO_A: CaseState = {
  id: 'demo-scenario-a',
  stage: 'ANALYZED',
  problem: {
    idea: 'An AI app that helps college students study better.',
    targetUser: 'College students',
    context: 'During midterm and final exams across university courses.',
    existingEvidence: 'A few friends in my dorm said they feel stressed before exams.',
    constraints: 'Hackathon weekend, access to ~10 university peers.',
  },
  isProblemStale: false,
  analysis: {
    problemClarity: {
      status: 'vague',
      explanation:
        'The proposal describes a broad solution category ("AI app") rather than a specific, identifiable operational bottleneck or painful recurring task.',
      missingDetails: [
        'What specific part of studying fails? (retention, time management, concept comprehension, note synthesis)?',
        'Which specific subgroup of students experiences the highest friction?',
        'Why do existing solutions (quizlet, flashcards, study groups, calendar alerts) fall short?',
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
        risk: 'high',
        status: 'unverified',
        evidenceNeeded: ['Observed past failures of current study methods during exam prep.'],
        nextAction: 'Ask students to walk through their preparation for their most recent exam.',
      },
      {
        id: 'ASM-2',
        claim: 'Students are willing to actively engage with an AI diagnostic tool during stressful crunch periods.',
        reason: 'Under time pressure, students default to low-friction familiar habits (rereading notes).',
        risk: 'high',
        status: 'unverified',
        evidenceNeeded: ['Behavioral logs or reports of students adopting new tools during exam weeks.'],
        nextAction: 'Observe whether students actually spend time configuring study tools.',
      },
      {
        id: 'ASM-3',
        claim: 'The core bottleneck is study efficiency rather than emotional procrastination.',
        reason: 'If the real blocker is procrastination or anxiety, an AI study assistant will not address the root cause.',
        risk: 'medium',
        status: 'unverified',
        evidenceNeeded: ['Root cause breakdown of student study delays.'],
        nextAction: 'Inquire about what students do during study blocks when they get stuck.',
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
  ledger: [
    {
      id: 'LED-1',
      timestamp: new Date().toISOString(),
      type: 'INITIAL_CLAIM',
      source: 'USER',
      summary: 'Entered proposal: "An AI app that helps college students study better."',
    },
    {
      id: 'LED-2',
      timestamp: new Date().toISOString(),
      type: 'ANALYSIS_GENERATED',
      source: 'AI_REASONING',
      summary: 'Flagged clarity as VAGUE. Extracted 3 high-risk assumptions and 2 evidence gaps.',
    },
  ],
  verdict: null,
  isDemoMode: true,
  demoScenarioId: 'vague_study',
  updatedAt: new Date().toISOString(),
};

export const DEMO_SCENARIO_B_FINDINGS: Finding[] = [
  {
    id: 'FND-B1',
    description:
      'Participant 1 (Sophomore, CS): Described exam prep. Used Google Calendar for scheduling study blocks. Said scheduling was painless, but struggled with understanding dynamic programming proofs and relied on TA office hours.',
    sourceType: 'user_reported_experience',
    relatedAssumptionId: 'ASM-1',
    contextNotes: 'Workaround (TA office hours) resolved the problem directly.',
    isCredibleObservation: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'FND-B2',
    description:
      'Participant 2 (Junior, Bio): Uses Notion study planner template downloaded from Reddit. Expressed high satisfaction with Notion and stated they would not install another tool for revision planning.',
    sourceType: 'direct_observation',
    relatedAssumptionId: 'ASM-1',
    contextNotes: 'Direct contradiction to claim that students lack workable revision planning tools.',
    isCredibleObservation: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'FND-B3',
    description:
      'Participant 3 (Freshman, Econ): Left revision to the night before. Admitted that no app could have fixed their issue because they were gaming until 2 AM.',
    sourceType: 'user_reported_experience',
    relatedAssumptionId: 'ASM-3',
    contextNotes: 'Friction was motivation/procrastination rather than tool inadequacy.',
    isCredibleObservation: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'FND-B4',
    description:
      'Participant 4 (Senior, MechE): Said they loved the concept and would totally use an AI app if it was free, but has never paid for software in 4 years of college.',
    sourceType: 'interpretation',
    relatedAssumptionId: 'ASM-2',
    contextNotes: 'Polite enthusiasm without willingness to pay.',
    isCredibleObservation: false,
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_SCENARIO_B: CaseState = {
  ...DEMO_SCENARIO_A,
  id: 'demo-scenario-b',
  stage: 'FINDINGS_ENTERED',
  findings: DEMO_SCENARIO_B_FINDINGS,
  ledger: [
    ...DEMO_SCENARIO_A.ledger,
    {
      id: 'LED-3',
      timestamp: new Date().toISOString(),
      type: 'TEST_SELECTED',
      source: 'USER',
      summary: 'Selected Experiment: Recent Exam Retrospective Interview (EXP-1).',
    },
    {
      id: 'LED-4',
      timestamp: new Date().toISOString(),
      type: 'FINDING_RECORDED',
      source: 'USER',
      summary: 'Recorded 4 participant findings highlighting existing tool satisfaction and procrastination bottlenecks.',
    },
  ],
  verdict: null,
  isDemoMode: true,
  demoScenarioId: 'contradictory_study',
  updatedAt: new Date().toISOString(),
};
