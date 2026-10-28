import type { FC } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  GitBranch,
  Wrench,
  HelpCircle,
  Target,
} from 'lucide-react';
import type { AnalysisResult, ProblemInput } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { TactileButton } from '../common/TactileButton.tsx';
import { OutdatedBanner } from '../common/OutdatedBanner.tsx';

export interface Stage2AssumptionsProps {
  problem: ProblemInput;
  analysis: AnalysisResult;
  onProceedToTest: () => void;
  onEditProblem: () => void;
  isDirty?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const Stage2Assumptions: FC<Stage2AssumptionsProps> = ({
  problem,
  analysis,
  onProceedToTest,
  onEditProblem,
  isDirty = false,
  isLoading = false,
  className = '',
}) => {
  const clarity = analysis?.problemClarity || {
    status: 'incomplete',
    explanation: 'Analysis pending.',
    missingDetails: [],
  };

  const clarityIcons = {
    clear: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    incomplete: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    vague: <ShieldAlert className="w-4 h-4 text-rose-400" />,
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onEditProblem} />
      )}

      {/* Main Critique Card */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#242a3e]">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Stage 2: Challenge Assumptions & Epistemic Gaps</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">
              Analytical Critique & Stress Test
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Clarity:</span>
            <Badge
              variant="clarity"
              clarity={clarity.status}
              icon={clarityIcons[clarity.status]}
            />
          </div>
        </div>

        {/* Clarity Assessment Box */}
        <div className="p-4 rounded-xl bg-[#12151f] border border-[#242a3e] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 tracking-wider">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span>Problem Clarity Critique</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {clarity.explanation}
          </p>

          {clarity.missingDetails && clarity.missingDetails.length > 0 && (
            <div className="pt-3 border-t border-[#242a3e]/60">
              <span className="text-xs font-mono uppercase text-amber-400 block mb-1.5 font-semibold">
                Missing Specificity to Address:
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {clarity.missingDetails.map((detail, idx) => (
                  <li key={idx} className="leading-snug">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Submitted vs Refined Problem Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#12151f] border border-[#242a3e] space-y-2">
            <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider block">
              Original Submission:
            </span>
            <p className="text-sm text-slate-300 italic leading-relaxed">
              "{problem.idea}"
            </p>
            <div className="text-[11px] text-slate-500 pt-1">
              Target Cohort: <span className="text-slate-300">{problem.targetUser}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/50 space-y-2">
            <div className="flex items-center gap-1.5 text-blue-400 text-[11px] font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sharpened Problem Formulation:</span>
            </div>
            <p className="text-sm text-blue-100 font-medium leading-relaxed">
              "{analysis.refinedProblemStatement}"
            </p>
            <div className="text-[11px] text-blue-300/80 pt-1">
              User Ambiguity: <span className="text-blue-200">{analysis.targetUserAmbiguity}</span>
            </div>
          </div>
        </div>

        {/* Highest Risk Uncertainty Callout */}
        {analysis.highestRiskUncertainty && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-200 space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 block font-semibold">
              Highest-Risk Uncertainty
            </span>
            <p className="text-sm leading-relaxed">
              {analysis.highestRiskUncertainty}
            </p>
          </div>
        )}

        {/* Unverified Assumptions Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Unverified Assumptions Under Challenge</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                ({analysis.assumptions.length} total)
              </span>
            </h3>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Require empirical behavioral evidence
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.assumptions.map((asm) => {
              const risk = asm.riskLevel || asm.risk || 'medium';
              const nextAction = asm.recommendedNextAction || asm.nextAction;
              const reason = asm.whyItMatters || asm.reason;

              return (
                <div
                  key={asm.id}
                  className="p-4 rounded-xl bg-[#12151f] border border-[#242a3e] flex flex-col justify-between hover:border-[#384260] transition-colors gap-3"
                >
                  <div className="space-y-2.5">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#181c2a] text-slate-300 border border-[#242a3e]">
                        {asm.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="risk" risk={risk} />
                        <Badge variant="status" status={asm.status} />
                      </div>
                    </div>

                    {/* Claim */}
                    <p className="text-sm font-medium text-slate-100 leading-snug">
                      "{asm.claim}"
                    </p>

                    {/* Why It Matters */}
                    {reason && (
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-slate-300 font-medium">Why it matters:</strong> {reason}
                      </p>
                    )}

                    {/* Evidence Needed */}
                    {asm.evidenceNeeded && asm.evidenceNeeded.length > 0 && (
                      <div className="bg-[#181c2a] p-2.5 rounded-lg border border-[#242a3e]/60 space-y-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                          Evidence Required:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-300">
                          {asm.evidenceNeeded.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Recommended Action */}
                  {nextAction && (
                    <div className="pt-2 border-t border-[#242a3e] flex items-center gap-1.5 text-xs text-blue-400">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        <strong>Action:</strong> {nextAction}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Evidence Gaps & Alternative Explanations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Evidence Gaps */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Critical Evidence Gaps ({analysis.evidenceGaps?.length || 0})</span>
            </h3>
            <div className="space-y-2.5">
              {analysis.evidenceGaps?.map((gap, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[#12151f] border border-[#242a3e] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{gap.description}</span>
                    <Badge variant="risk" risk={gap.importance} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    <strong className="text-slate-300 font-normal">How to investigate:</strong>{' '}
                    {gap.howToInvestigate}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Alternatives & Workarounds */}
          <div className="space-y-4">
            <div className="bg-[#12151f] border border-[#242a3e] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-300">
                <GitBranch className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">Alternative Explanations</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {analysis.alternativeExplanations?.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#12151f] border border-[#242a3e] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-300">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">Current Workarounds & Substitutes</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {analysis.existingWorkarounds?.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-[#242a3e]">
          <TactileButton
            variant="secondary"
            size="md"
            onClick={onEditProblem}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Refine Formulation
          </TactileButton>

          <TactileButton
            variant="primary"
            size="lg"
            isLoading={isLoading}
            onClick={onProceedToTest}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Design Validation Experiment
          </TactileButton>
        </div>
      </div>
    </div>
  );
};

export default Stage2Assumptions;
