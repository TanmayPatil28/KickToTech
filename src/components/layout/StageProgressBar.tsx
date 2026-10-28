import { Fragment, type FC } from 'react';
import { Check } from 'lucide-react';
import type { Stage, WorkflowStage } from '../../types/index.ts';

export interface StageProgressBarProps {
  currentStage: Stage | WorkflowStage;
  onNavigate: (stage: Stage) => void;
  canNavigateTo?: (stage: Stage) => { allowed: boolean; reason?: string };
  className?: string;
}

const STAGE_META: Record<
  Stage,
  { step: number; title: string; subtitle: string; short: string }
> = {
  DRAFT: {
    step: 1,
    title: 'Define Problem',
    subtitle: 'Friction & context',
    short: '1. Define',
  },
  ANALYZED: {
    step: 2,
    title: 'Challenge Assumptions',
    subtitle: 'Surface epistemic gaps',
    short: '2. Critique',
  },
  TEST_DEFINED: {
    step: 3,
    title: 'Validation Experiment',
    subtitle: 'Non-leading test design',
    short: '3. Test',
  },
  FINDINGS_ENTERED: {
    step: 4,
    title: 'Record Findings',
    subtitle: 'Log observed facts',
    short: '4. Findings',
  },
  EVIDENCE_REVIEWED: {
    step: 5,
    title: 'Evidence Verdict',
    subtitle: 'Grounded decision brief',
    short: '5. Verdict',
  },
};

const STAGES: Stage[] = [
  'DRAFT',
  'ANALYZED',
  'TEST_DEFINED',
  'FINDINGS_ENTERED',
  'EVIDENCE_REVIEWED',
];

export const StageProgressBar: FC<StageProgressBarProps> = ({
  currentStage,
  onNavigate,
  canNavigateTo,
  className = '',
}) => {
  const currentIndex = STAGES.indexOf(currentStage as Stage);

  return (
    <nav
      aria-label="Validation Workflow Progress"
      className={`bg-white border-b border-zinc-200/80 px-4 lg:px-8 py-2 overflow-x-auto ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[620px] sm:min-w-0">
        {STAGES.map((stage, idx) => {
          const info = STAGE_META[stage];
          const isCurrent = stage === currentStage;
          const isCompleted = idx < currentIndex;
          const isPending = idx > currentIndex;

          // Check if forward jump is permitted by guards if provided
          const check = canNavigateTo ? canNavigateTo(stage) : { allowed: isCompleted || isCurrent };
          const isClickable = isCompleted || (isPending && check.allowed);

          return (
            <Fragment key={stage}>
              <button
                type="button"
                onClick={() => isClickable && onNavigate(stage)}
                disabled={!isClickable && !isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                title={
                  !isClickable && !isCurrent
                    ? check.reason || 'Complete previous steps before advancing.'
                    : `Switch to Stage ${info.step}: ${info.title}`
                }
                className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg transition-all duration-150 ease-out text-left select-none min-h-[44px] ${
                  isCurrent
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : isClickable
                    ? 'hover:bg-zinc-50 cursor-pointer text-zinc-600 hover:text-zinc-900 active:scale-[0.98]'
                    : 'opacity-35 cursor-not-allowed text-zinc-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-all shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : info.step}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-xs tracking-tight ${
                      isCurrent ? 'text-zinc-950 font-semibold' : 'text-zinc-600 font-medium'
                    }`}
                  >
                    <span className="hidden md:inline">{info.title}</span>
                    <span className="md:hidden">{info.short}</span>
                  </span>
                </div>
              </button>

              {idx < STAGES.length - 1 && (
                <div className="flex-1 max-w-[40px] h-px bg-zinc-200 hidden sm:block mx-1" />
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default StageProgressBar;
