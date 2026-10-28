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
