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
  ShieldCheck,
} from 'lucide-react';
import type {
  DecisionBrief,
  Verdict,
} from '../../types/index.ts';
import { TactileButton } from '../common/TactileButton.tsx';
import { OutdatedBanner } from '../common/OutdatedBanner.tsx';

export interface Stage5VerdictProps {
  decisionBrief?: DecisionBrief | null;
  verdict?: Verdict | null;
  onRefineHypothesis: () => void;
  onBackToFindings: () => void;
  onReanalyze?: () => void;
  isDirty?: boolean;
  className?: string;
}

const VERDICT_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: any;
    summary: string;
  }
> = {
  INSUFFICIENT_EVIDENCE: {
    label: 'INSUFFICIENT EVIDENCE',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-700/80',
    icon: AlertTriangle,
    summary:
      'The available findings do not justify a reliable conclusion. Observations are too sparse, subjective, or mixed to validate that the problem exists as formulated.',
  },
  'INSUFFICIENT EVIDENCE': {
    label: 'INSUFFICIENT EVIDENCE',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-700/80',
    icon: AlertTriangle,
    summary:
      'The available findings do not justify a reliable conclusion. Observations are too sparse, subjective, or mixed to validate that the problem exists as formulated.',
  },
  REVISE_THE_HYPOTHESIS: {
    label: 'REVISE THE HYPOTHESIS',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-700/80',
    icon: RotateCcw,
    summary:
      'The findings weaken the original formulation or indicate that users find existing workarounds satisfactory. A narrower or redirected problem must be investigated.',
  },
  'REVISE THE HYPOTHESIS': {
    label: 'REVISE THE HYPOTHESIS',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-700/80',
    icon: RotateCcw,
    summary:
      'The findings weaken the original formulation or indicate that users find existing workarounds satisfactory. A narrower or redirected problem must be investigated.',
  },
  EVIDENCE_SUPPORTS_FURTHER_TESTING: {
    label: 'EVIDENCE SUPPORTS FURTHER TESTING',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-700/80',
    icon: CheckCircle2,
    summary:
      'The recorded findings support continuing the investigation with a deeper test. Note: This does NOT establish broad market demand or product-market fit.',
  },
  'EVIDENCE SUPPORTS FURTHER TESTING': {
    label: 'EVIDENCE SUPPORTS FURTHER TESTING',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-700/80',
    icon: CheckCircle2,
    summary:
      'The recorded findings support continuing the investigation with a deeper test. Note: This does NOT establish broad market demand or product-market fit.',
  },
};

export const Stage5Verdict: FC<Stage5VerdictProps> = ({
  decisionBrief,
  verdict,
  onRefineHypothesis,
  onBackToFindings,
  onReanalyze,
  isDirty = false,
  className = '',
}) => {
  // Normalize data from decisionBrief or verdict
  const data = decisionBrief || (verdict as unknown as DecisionBrief);

  const rawVerdict = data?.verdict || data?.category || 'INSUFFICIENT EVIDENCE';
  const cleanCategory = String(rawVerdict).replace(/_/g, ' ').toUpperCase();

  const config =
    VERDICT_CONFIG[cleanCategory] ||
    VERDICT_CONFIG[String(rawVerdict)] ||
    VERDICT_CONFIG['INSUFFICIENT EVIDENCE'];
  const VerdictIcon = config.icon;

  const rationale = data?.rationale || 'Evidence evaluation completed against recorded findings.';
  const updatedProblem =
    data?.updatedProblemStatement ||
    'Problem formulation requires further empirical calibration.';
  const supportedClaims = data?.supportedClaims || [];
  const unsupportedClaims = data?.unsupportedClaims || [];
  const contradictory = data?.contradictoryFindings || [];
  const uncertainties = data?.remainingUncertainties || [];
  const nextSteps =
    data?.recommendedNextSteps ||
    (data?.recommendedNextExperiment ? [data.recommendedNextExperiment] : []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onReanalyze || onRefineHypothesis} />
      )}

      {/* Main Container */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg space-y-6">
        {/* Header & Primary Verdict */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#242a3e]">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" />
              <span>Stage 5: Evidence Review & Grounded Decision Brief</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">
              Empirical Validation Verdict
            </h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Objective reassessment of your hypothesis against recorded behavioral observations.
            </p>
          </div>

          {/* Primary Verdict Pill */}
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold tracking-wider font-mono shrink-0 shadow-md ${config.bg} ${config.text} ${config.border}`}
          >
            <VerdictIcon className="w-5 h-5 shrink-0" />
            <span>{config.label}</span>
          </div>
        </div>

        {/* Epistemic Guardrail Notice */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Epistemic Integrity Notice:</strong> ProblemPilot strictly classifies findings under <em>INSUFFICIENT EVIDENCE</em>, <em>REVISE THE HYPOTHESIS</em>, or <em>EVIDENCE SUPPORTS FURTHER TESTING</em>. Hypotheses are never declared "PROVEN" nor is market demand guaranteed from initial pilot signals.
          </p>
        </div>

        {/* Decision Rationale */}
        <div className="p-5 rounded-xl bg-[#12151f] border border-[#242a3e] space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Synthesis Rationale & Assessment
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {rationale}
          </p>
          <p className="text-xs text-slate-400 border-t border-[#242a3e]/60 pt-2.5 italic">
            {config.summary}
          </p>
        </div>

        {/* Refined Problem Statement Post-Evidence */}
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/50 space-y-1.5">
          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-mono uppercase tracking-wider font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Refined Problem Formulation Post-Evidence:</span>
          </div>
          <p className="text-sm font-medium text-blue-100 leading-relaxed">
            "{updatedProblem}"
          </p>
        </div>

        {/* Supported vs Unsupported Claims */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supported Claims */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Supported Claims ({supportedClaims.length})</span>
            </div>
            {supportedClaims.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No claims were verified by current evidence.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                {supportedClaims.map((claim, idx) => (
                  <li key={idx} className="leading-snug">{claim}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Unsupported Claims */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase font-semibold">
              <XCircle className="w-4 h-4" />
              <span>Unsupported Claims ({unsupportedClaims.length})</span>
            </div>
            {unsupportedClaims.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                All evaluated claims had supporting observations.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                {unsupportedClaims.map((claim, idx) => (
                  <li key={idx} className="leading-snug">{claim}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Contradictory Findings */}
        {contradictory.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>
                Contradictory Observations & Workaround Satisfaction ({contradictory.length})
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-200">
              {contradictory.map((cf, idx) => (
                <li key={idx} className="leading-snug">{cf}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Remaining Uncertainties */}
        {uncertainties.length > 0 && (
          <div className="p-4 rounded-xl bg-[#12151f] border border-[#242a3e] space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>Remaining Uncertainties ({uncertainties.length})</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
              {uncertainties.map((unc, idx) => (
                <li key={idx} className="leading-snug">{unc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Next Steps & Follow-Up Experiment */}
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-mono uppercase font-semibold">
            <FlaskConical className="w-4 h-4" />
            <span>Recommended Next Steps & Follow-Up Experiment</span>
          </div>
          {nextSteps.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No further actions suggested.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-xs text-purple-200 font-medium">
              {nextSteps.map((step, idx) => (
                <li key={idx} className="leading-snug">{step}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-[#242a3e]">
          <TactileButton
            variant="secondary"
            size="md"
            onClick={onBackToFindings}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Review Findings Ledger
          </TactileButton>

          <TactileButton
            variant="primary"
            size="lg"
            onClick={onRefineHypothesis}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Refine Problem Formulation
          </TactileButton>
        </div>
      </div>
    </div>
  );
};

export default Stage5Verdict;
