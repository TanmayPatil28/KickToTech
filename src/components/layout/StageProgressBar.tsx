import { Fragment, type FC } from 'react';
import { Check, ChevronRight } from 'lucide-react';
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
      className={`bg-white border-b border-slate-200/90 px-4 lg:px-8 py-2 overflow-x-auto shadow-2xs ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[650px] sm:min-w-0">
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
                className={`flex items-center gap-2.5 py-1.5 px-3 rounded-lg transition-all duration-150 ease-out text-left select-none min-h-[44px] ${
                  isCurrent
                    ? 'bg-teal-50 border border-teal-300 text-teal-900 shadow-2xs'
                    : isClickable
                    ? 'hover:bg-slate-50 cursor-pointer text-slate-700 active:scale-[0.97]'
                    : 'opacity-40 cursor-not-allowed text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold transition-colors shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : isCurrent
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-slate-100 border border-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : info.step}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-medium tracking-tight ${
                      isCurrent ? 'text-teal-950 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="hidden sm:inline">{info.title}</span>
                    <span className="sm:hidden">{info.short}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 hidden xl:inline">
                    {info.subtitle}
                  </span>
                </div>
              </button>

              {idx < STAGES.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mx-1 hidden md:block" />
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default StageProgressBar;
