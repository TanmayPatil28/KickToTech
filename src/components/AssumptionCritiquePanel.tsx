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
} from 'lucide-react';
import type { AnalysisResult, ProblemInput } from '../types/index.ts';
import { AssumptionCard } from './AssumptionCard.tsx';
import { EvidenceGapCard } from './EvidenceGapCard.tsx';

interface AssumptionCritiquePanelProps {
  problem: ProblemInput;
  analysis: AnalysisResult;
  onProceedToTest: () => void;
  onEditProblem: () => void;
  isProblemStale: boolean;
}

export const AssumptionCritiquePanel: FC<AssumptionCritiquePanelProps> = ({
  problem,
  analysis,
  onProceedToTest,
  onEditProblem,
  isProblemStale,
}) => {
  const clarity = analysis.problemClarity;

  const clarityConfig = {
    clear: {
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
      icon: CheckCircle2,
      label: 'Sufficiently Clear Problem Definition',
    },
    incomplete: {
      color: 'text-amber-400 bg-amber-950/40 border-amber-800/60',
      icon: AlertTriangle,
      label: 'Incomplete Problem Definition',
    },
    vague: {
      color: 'text-rose-400 bg-rose-950/40 border-rose-800/60',
      icon: ShieldAlert,
      label: 'Vague or Solution-Centric Proposition',
    },
  }[clarity.status] || {
    color: 'text-amber-400 bg-amber-950/40 border-amber-800/60',
    icon: AlertTriangle,
    label: 'Needs Refinement',
  };

  const ClarityIcon = clarityConfig.icon;

  return (
    <div className="space-y-6">
      {/* Stale Warning Banner if user edited hypothesis */}
      {isProblemStale && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-700/80 text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold block mb-0.5 text-sm">
              Analysis Outdated (Problem Formulation Modified)
            </span>
            <span>
              You modified the problem text after this critique was generated. You should re-run analysis from Stage 1 before taking this analysis into an experiment.
            </span>
            <button
              type="button"
              onClick={onEditProblem}
              className="mt-2 block underline font-medium text-amber-100 hover:text-white"
            >
              Return to Stage 1 & Re-analyze
            </button>
          </div>
        </div>
      )}

      {/* Main Analysis Container */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-6 border-b border-[#242a3e]">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Stage 2: Challenge Assumptions & Evidence</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">
              Analytical Critique & Stress Test
            </h2>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${clarityConfig.color}`}
          >
            <ClarityIcon className="w-4 h-4" />
            <span>{clarityConfig.label}</span>
          </div>
        </div>

        {/* Clarity Assessment Box */}
        <div className="mb-6 p-4 rounded-lg bg-[#12151f] border border-[#242a3e]">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
            Clarity Assessment Rationale
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed mb-3">
            {clarity.explanation}
          </p>

          {clarity.missingDetails && clarity.missingDetails.length > 0 && (
            <div className="pt-3 border-t border-[#242a3e]/60">
              <span className="text-xs font-mono uppercase text-amber-400 block mb-1.5">
                Missing Details to Clarify:
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {clarity.missingDetails.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Refined Problem Statement Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-[#12151f] border border-[#242a3e]">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Your Submitted Formulation:
            </span>
            <p className="text-sm text-slate-300 italic">"{problem.idea}"</p>
            <span className="text-[11px] text-slate-500 mt-2 block">
              Target: {problem.targetUser}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/50">
            <div className="flex items-center gap-1.5 text-blue-400 text-[11px] font-mono uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sharpened Problem Hypothesis:</span>
            </div>
            <p className="text-sm text-blue-100 font-medium">
              "{analysis.refinedProblemStatement}"
            </p>
            <span className="text-[11px] text-blue-300/70 mt-2 block">
              User Ambiguity: {analysis.targetUserAmbiguity}
            </span>
          </div>
        </div>

        {/* Highest Risk Uncertainty Callout */}
        {analysis.highestRiskUncertainty && (
          <div className="mb-6 p-4 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-200">
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 block mb-1">
              Highest-Risk Uncertainty
            </span>
            <p className="text-sm leading-relaxed">
              {analysis.highestRiskUncertainty}
            </p>
          </div>
        )}

        {/* Unverified Assumptions Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Unverified Assumptions</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                ({analysis.assumptions.length} identified)
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              Each assumption must be validated with empirical behavior.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analysis.assumptions.map((asm) => (
              <AssumptionCard key={asm.id} assumption={asm} />
            ))}
          </div>
        </div>

        {/* Evidence Gaps & Alternative Explanations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Evidence Gaps */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Critical Evidence Gaps</span>
            </h3>
            <div className="space-y-3">
              {analysis.evidenceGaps.map((gap, i) => (
                <EvidenceGapCard key={i} gap={gap} />
              ))}
            </div>
          </div>

          {/* Alternatives & Workarounds */}
          <div className="space-y-4">
            <div className="bg-[#12151f] border border-[#242a3e] rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 mb-2">
                <GitBranch className="w-4 h-4 text-purple-400" />
                <span>Alternative Explanations</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {analysis.alternativeExplanations.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#12151f] border border-[#242a3e] rounded-lg p-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 mb-2">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span>Current Workarounds & Substitutes</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {analysis.existingWorkarounds.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-[#242a3e]">
          <button
            type="button"
            onClick={onEditProblem}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 bg-[#12151f] border border-[#242a3e] rounded-lg hover:bg-[#1e2335] active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Refine Problem Definition</span>
          </button>

          <button
            type="button"
            onClick={onProceedToTest}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 cursor-pointer active:scale-[0.98] transition-all"
          >
            <span>Proceed to Validation Experiment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
