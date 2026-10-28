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
  Flame,
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

  // Find the single highest-risk or fatal assumption to highlight
  const fatalAssumption =
    analysis?.assumptions?.find((a) => (a.riskLevel || a.risk) === 'high') ||
    analysis?.assumptions?.[0];

  const remainingAssumptions = fatalAssumption
    ? analysis?.assumptions?.filter((a) => a.id !== fatalAssumption.id) || []
    : analysis?.assumptions || [];

  return (
    <div className={`space-y-6 animate-stage-enter ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onEditProblem} />
      )}

      {/* Main Critique Card */}
      <div className="bg-[#101524] border border-[#212a45] rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#212a45]">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-mono uppercase tracking-wider mb-1.5 font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>Stage 2: Challenge Assumptions & Spot Blind Spots</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
              Stress-Test Your Idea
            </h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Separate what you know for sure from what you are just guessing. Below are the hidden assumptions that could break your business idea if they turn out to be false.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 bg-[#151b2e] border border-[#212a45] px-3.5 py-1.5 rounded-lg">
            <span className="text-xs text-slate-400 font-mono font-medium">Clarity:</span>
            <Badge
              variant="clarity"
              clarity={clarity.status}
              icon={clarityIcons[clarity.status]}
            />
          </div>
        </div>

        {/* Clarity Assessment Box */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0c0f19] border border-[#1d243b] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 tracking-wider font-semibold">
            <Target className="w-3.5 h-3.5 text-teal-400" />
            <span>How Clear Is Your Idea? (Problem Clarity Check)</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {clarity.explanation}
          </p>

          {clarity.missingDetails && clarity.missingDetails.length > 0 && (
            <div className="pt-3 border-t border-[#1d243b]">
              <span className="text-xs font-mono uppercase text-amber-400 block mb-1 font-semibold">
                Missing Specificity to Address:
              </span>
              <p className="text-xs text-slate-400 mb-2 font-sans">
                Key questions your idea still needs to answer before you start building:
              </p>
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
          <div className="p-4 sm:p-5 rounded-xl bg-[#0c0f19] border border-[#1d243b] space-y-2">
            <span className="text-[11px] font-mono uppercase text-slate-500 tracking-wider block font-semibold">
              What You Entered (Original Submission):
            </span>
            <p className="text-sm text-slate-300 italic leading-relaxed">
              "{problem.idea}"
            </p>
            <div className="text-[11px] text-slate-500 pt-1.5 border-t border-[#1d243b]">
              Target Audience: <span className="text-slate-200 font-medium">{problem.targetUser}</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2 shadow-2xs">
            <div className="flex items-center gap-1.5 text-teal-800 text-[11px] font-mono uppercase tracking-wider font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>A Clearer Way to Say It (Sharpened Problem Formulation):</span>
            </div>
            <p className="text-sm text-teal-950 font-semibold leading-relaxed font-sans">
              "{analysis.refinedProblemStatement}"
            </p>
            <div className="text-[11px] text-teal-800 pt-1.5 border-t border-teal-200/60 font-sans">
              Audience Scope: <span className="font-semibold text-teal-950">{analysis.targetUserAmbiguity}</span>
            </div>
          </div>
        </div>

        {/* Highest Risk Uncertainty Callout */}
        {analysis.highestRiskUncertainty && (
          <div className="p-4 sm:p-5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-950 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-mono uppercase tracking-wider text-rose-800 block font-bold">
                Highest-Risk Uncertainty (Your #1 Make-or-Break Question)
              </span>
            </div>
            <p className="text-sm leading-relaxed text-rose-950 font-medium font-sans">
              {analysis.highestRiskUncertainty}
            </p>
          </div>
        )}

        {/* Unverified Assumptions Section */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between pb-1 border-b border-[#212a45]">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>Unverified Assumptions Under Challenge</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                ({analysis.assumptions.length} total)
              </span>
            </h3>
            <span className="text-xs text-slate-400 hidden sm:inline font-sans">
              Things you are guessing that need real customer proof
            </span>
          </div>

          {/* Fatal Assumption Spotlight (if exists) */}
          {fatalAssumption && (
            <div className="p-5 rounded-xl bg-amber-50/50 border border-amber-200/90 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                    Priority: Test First
                  </span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white text-zinc-900 border border-zinc-200 shadow-2xs">
                    {fatalAssumption.id}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="risk" risk={fatalAssumption.riskLevel || fatalAssumption.risk || 'high'} />
                  <Badge variant="status" status={fatalAssumption.status} />
                </div>
              </div>

              <p className="text-sm font-semibold text-zinc-950 leading-snug font-sans">
                "{fatalAssumption.claim}"
              </p>

              {(fatalAssumption.whyItMatters || fatalAssumption.reason) && (
                <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                  <strong className="text-zinc-900 font-medium">Why it matters:</strong> {fatalAssumption.whyItMatters || fatalAssumption.reason}
                </p>
              )}

              {fatalAssumption.evidenceNeeded && fatalAssumption.evidenceNeeded.length > 0 && (
                <div className="bg-white p-3 rounded-lg border border-amber-200/70 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-mono text-amber-900 uppercase tracking-wider block font-semibold">
                    Evidence Required:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-zinc-700">
                    {fatalAssumption.evidenceNeeded.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(fatalAssumption.recommendedNextAction || fatalAssumption.nextAction) && (
                <div className="pt-2 border-t border-amber-200/60 flex items-center gap-1.5 text-xs text-teal-800 font-medium">
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-teal-700" />
                  <span className="truncate">
                    <strong className="text-teal-900">Action:</strong> {fatalAssumption.recommendedNextAction || fatalAssumption.nextAction}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Remaining Assumptions Grid (only unhighlighted ones to avoid duplicates) */}
          {remainingAssumptions.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider font-mono">
                Other Key Assumptions ({remainingAssumptions.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {remainingAssumptions.map((asm) => {
                  const risk = asm.riskLevel || asm.risk || 'medium';
                  const nextAction = asm.recommendedNextAction || asm.nextAction;
                  const reason = asm.whyItMatters || asm.reason;

                  return (
                    <div
                      key={asm.id}
                      className="p-5 rounded-xl bg-white border border-zinc-200/90 flex flex-col justify-between hover:border-zinc-300 transition-colors gap-3.5 shadow-premium-card"
                    >
                      <div className="space-y-2.5">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                            {asm.id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="risk" risk={risk} />
                            <Badge variant="status" status={asm.status} />
                          </div>
                        </div>

                        {/* Claim */}
                        <p className="text-sm font-semibold text-zinc-950 leading-snug font-sans">
                          "{asm.claim}"
                        </p>

                        {/* Why It Matters */}
                        {reason && (
                          <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                            <strong className="text-zinc-900 font-medium">Why it matters:</strong> {reason}
                          </p>
                        )}

                        {/* Evidence Needed */}
                        {asm.evidenceNeeded && asm.evidenceNeeded.length > 0 && (
                          <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 space-y-1">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-semibold">
                              Evidence Required:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-xs text-zinc-700">
                              {asm.evidenceNeeded.map((ev, i) => (
                                <li key={i}>{ev}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Recommended Action */}
                      {nextAction && (
                        <div className="pt-2.5 border-t border-zinc-100 flex items-center gap-1.5 text-xs text-teal-800">
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-teal-700" />
                          <span className="truncate">
                            <strong className="text-teal-900">Action:</strong> {nextAction}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Evidence Gaps & Alternative Explanations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3">
          {/* Evidence Gaps */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Critical Evidence Gaps ({analysis.evidenceGaps?.length || 0}) — What You Still Don't Know</span>
            </h3>
            <div className="space-y-2.5">
              {analysis.evidenceGaps?.map((gap, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white border border-zinc-200/90 text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">{gap.description}</span>
                    <Badge variant="risk" risk={gap.importance} />
                  </div>
                  <p className="text-[11px] text-zinc-600 font-sans">
                    <strong className="text-zinc-900 font-medium">How to investigate:</strong>{' '}
                    {gap.howToInvestigate}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Alternatives & Workarounds */}
          <div className="space-y-4">
            <div className="bg-white border border-zinc-200/90 rounded-xl p-4 sm:p-5 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-purple-800">
                <GitBranch className="w-4 h-4 text-purple-600" />
                <span className="font-semibold">Alternative Explanations (Other Reasons for This Problem)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-zinc-700 font-sans">
                {analysis.alternativeExplanations?.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-xl p-4 sm:p-5 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-teal-800">
                <Wrench className="w-4 h-4 text-teal-600" />
                <span className="font-semibold">Current Workarounds & Substitutes (What People Use Today)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-zinc-700 font-sans">
                {analysis.existingWorkarounds?.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-[#212a45]">
          <TactileButton
            variant="secondary"
            size="md"
            onClick={onEditProblem}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto justify-center"
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
            className="w-full sm:w-auto justify-center"
          >
            Design Validation Experiment
          </TactileButton>
        </div>
      </div>
    </div>
  );
};

export default Stage2Assumptions;
