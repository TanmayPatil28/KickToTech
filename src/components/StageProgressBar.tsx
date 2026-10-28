import { Fragment, type FC } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { WorkflowStage } from '../types/index.ts';
import { STAGE_ORDER } from '../domain/stateMachine.ts';

interface StageProgressBarProps {
  currentStage: WorkflowStage;
  onNavigate: (stage: WorkflowStage) => void;
}

const STAGE_LABELS: Record<WorkflowStage, { step: number; title: string; subtitle: string }> = {
  DRAFT: { step: 1, title: 'Define Problem', subtitle: 'Capture context & user' },
  ANALYZED: { step: 2, title: 'Challenge Assumptions', subtitle: 'Identify evidence gaps' },
  TEST_DEFINED: { step: 3, title: 'Validation Experiment', subtitle: 'Design non-leading test' },
  FINDINGS_ENTERED: { step: 4, title: 'Record Findings', subtitle: 'Log observations' },
  EVIDENCE_REVIEWED: { step: 5, title: 'Evidence Verdict', subtitle: 'Ground decision' },
};

export const StageProgressBar: FC<StageProgressBarProps> = ({
  currentStage,
  onNavigate,
}) => {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  return (
    <nav
      aria-label="Validation Workflow Progress"
      className="bg-[#12151f] border-b border-[#242a3e] px-4 lg:px-8 py-2.5 overflow-x-auto"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[700px]">
        {STAGE_ORDER.map((stage, idx) => {
          const info = STAGE_LABELS[stage];
          const isCurrent = stage === currentStage;
          const isCompleted = idx < currentIndex;
          const isPending = idx > currentIndex;

          return (
            <Fragment key={stage}>
              <button
                type="button"
                onClick={() => isCompleted && onNavigate(stage)}
                disabled={isPending}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex items-center gap-2.5 py-1 px-2.5 rounded-lg transition-all text-left ${
                  isCurrent
                    ? 'bg-blue-950/60 border border-blue-600/50 text-blue-200'
                    : isCompleted
                    ? 'hover:bg-[#181c2a] cursor-pointer text-slate-300'
                    : 'opacity-40 cursor-not-allowed text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold ${
                    isCompleted
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#181c2a] border border-[#242a3e] text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : info.step}
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-medium ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                    {info.title}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden xl:inline">
                    {info.subtitle}
                  </span>
                </div>
              </button>

              {idx < STAGE_ORDER.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
};
