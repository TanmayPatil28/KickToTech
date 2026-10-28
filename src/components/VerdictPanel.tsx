import type { FC } from 'react';
import {
  Award,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import type { Verdict, VerdictCategory } from '../types/index.ts';

interface VerdictPanelProps {
  verdict: Verdict;
  onRefineHypothesis: () => void;
  onBackToFindings: () => void;
}

const VERDICT_CONFIG: Record<
  VerdictCategory,
  { label: string; bg: string; text: string; border: string; icon: any; summary: string }
> = {
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-800/80',
    icon: AlertTriangle,
    summary:
      'The available findings do not justify a reliable conclusion. Observations are too sparse, subjective, or mixed to validate that the problem exists as formulated.',
  },
  REVISE_THE_HYPOTHESIS: {
    label: 'Revise the Hypothesis',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-800/80',
    icon: RotateCcw,
    summary:
      'The findings weaken the original formulation or indicate that users find existing workarounds satisfactory. A narrower or redirected problem must be investigated.',
  },
  EVIDENCE_SUPPORTS_FURTHER_TESTING: {
    label: 'Evidence Supports Further Testing',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-800/80',
    icon: CheckCircle2,
    summary:
      'The recorded findings support continuing the investigation with a deeper test. Note: This does NOT establish broad market demand or product-market fit.',
  },
};

export const VerdictPanel: FC<VerdictPanelProps> = ({
  verdict,
  onRefineHypothesis,
  onBackToFindings,
}) => {
  const config = VERDICT_CONFIG[verdict.category] || VERDICT_CONFIG.INSUFFICIENT_EVIDENCE;
  const VerdictIcon = config.icon;

  return (
    <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg space-y-6">
      {/* Header & Primary Decision Category */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#242a3e]">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Stage 5: Evidence Review & Decision Brief</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">
            Empirical Validation Verdict
          </h2>
        </div>

        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-semibold tracking-wide ${config.bg} ${config.text} ${config.border}`}
        >
          <VerdictIcon className="w-5 h-5 shrink-0" />
          <span>{config.label.toUpperCase()}</span>
        </div>
      </div>

      {/* Plain Language Rationale */}
      <div className="p-5 rounded-lg bg-[#12151f] border border-[#242a3e]">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Decision Rationale & Assessment
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed mb-3">
          {verdict.rationale}
        </p>
        <p className="text-xs text-slate-400 border-t border-[#242a3e]/60 pt-2.5 italic">
          {config.summary}
        </p>
      </div>

      {/* Updated Problem Statement */}
      <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/40">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Refined Problem Statement Post-Evidence:</span>
        </div>
        <p className="text-sm font-medium text-blue-100">
          "{verdict.updatedProblemStatement}"
        </p>
      </div>

      {/* Supported vs Unsupported Claims */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supported Claims */}
        <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Supported Claims ({verdict.supportedClaims.length})</span>
          </div>
          {verdict.supportedClaims.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No claims were verified by current evidence.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
              {verdict.supportedClaims.map((claim, idx) => (
                <li key={idx}>{claim}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Unsupported Claims */}
        <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/40">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase mb-2">
            <XCircle className="w-4 h-4" />
            <span>Unsupported Claims ({verdict.unsupportedClaims.length})</span>
          </div>
          {verdict.unsupportedClaims.length === 0 ? (
            <p className="text-xs text-slate-400 italic">All evaluated claims had supporting observations.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
              {verdict.unsupportedClaims.map((claim, idx) => (
                <li key={idx}>{claim}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Contradictory Findings */}
      {verdict.contradictoryFindings && verdict.contradictoryFindings.length > 0 && (
        <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/60 text-rose-200">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Contradictory Observations & Workaround Satisfaction ({verdict.contradictoryFindings.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-200">
            {verdict.contradictoryFindings.map((cf, idx) => (
              <li key={idx}>{cf}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Remaining Uncertainties */}
      <div className="p-4 rounded-lg bg-[#12151f] border border-[#242a3e]">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase mb-2">
          <HelpCircle className="w-4 h-4" />
          <span>Remaining Uncertainties</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
          {verdict.remainingUncertainties.map((unc, idx) => (
            <li key={idx}>{unc}</li>
          ))}
        </ul>
      </div>

      {/* Recommended Next Action / Experiment */}
      <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-900/40">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-mono uppercase mb-1">
          <FlaskConical className="w-4 h-4" />
          <span>Recommended Next Experiment</span>
        </div>
        <p className="text-sm font-medium text-purple-100">
          {verdict.recommendedNextExperiment}
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-[#242a3e]">
        <button
          type="button"
          onClick={onBackToFindings}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 bg-[#12151f] border border-[#242a3e] rounded-lg hover:bg-[#1e2335] active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Review Findings Ledger</span>
        </button>

        <button
          type="button"
          onClick={onRefineHypothesis}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 cursor-pointer active:scale-[0.98] transition-all"
        >
          <span>Refine Problem Formulation</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
