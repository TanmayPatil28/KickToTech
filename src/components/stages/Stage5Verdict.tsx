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
  FileText,
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
    <div className={`space-y-6 animate-stage-enter ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onReanalyze || onRefineHypothesis} />
      )}

      {/* Main Container - Document Brief Format */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-2xl p-6 lg:p-10 shadow-sm space-y-8">
        {/* Document Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#242a3e]">
          <div>
            <div className="flex items-center gap-2 text-teal-700 text-xs font-mono uppercase tracking-wider mb-1.5 font-semibold">
              <Award className="w-4 h-4" />
              <span>Stage 5: Evidence Review & Grounded Decision Brief</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Empirical Validation Verdict
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl font-sans">
              Objective reassessment of your hypothesis against recorded behavioral observations.
            </p>
          </div>

          {/* Primary Verdict Pill */}
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-xs sm:text-sm font-bold tracking-wider font-mono shrink-0 shadow-xs ${config.bg} ${config.text} ${config.border}`}
          >
            <VerdictIcon className="w-5 h-5 shrink-0" />
            <span>{config.label}</span>
          </div>
        </div>

        {/* Epistemic Guardrail Notice */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-3 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-sans">
            <strong className="text-slate-800 font-semibold font-mono">Epistemic Integrity Notice:</strong> ProblemPilot strictly classifies findings under <em>INSUFFICIENT EVIDENCE</em>, <em>REVISE THE HYPOTHESIS</em>, or <em>EVIDENCE SUPPORTS FURTHER TESTING</em>. Hypotheses are never declared "PROVEN" nor is market demand guaranteed from initial pilot signals.
          </p>
        </div>

        {/* Decision Rationale */}
        <div className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-800 font-bold">
              Synthesis Rationale & Assessment
            </h3>
          </div>
          <p className="text-sm text-slate-900 leading-relaxed font-medium font-sans">
            {rationale}
          </p>
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-3 italic font-sans">
            {config.summary}
          </p>
        </div>

        {/* Refined Problem Statement Post-Evidence */}
        <div className="p-5 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-teal-800 text-xs font-mono uppercase tracking-wider font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Refined Problem Formulation Post-Evidence:</span>
          </div>
          <p className="text-sm font-semibold text-teal-950 leading-relaxed font-sans">
            "{updatedProblem}"
          </p>
        </div>

        {/* Supported vs Unsupported Claims */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Supported Claims */}
          <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-mono uppercase font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Supported Claims ({supportedClaims.length})</span>
            </div>
            {supportedClaims.length === 0 ? (
              <p className="text-xs text-slate-500 italic font-sans">
                No claims were verified by current evidence.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-800 font-sans">
                {supportedClaims.map((claim, idx) => (
                  <li key={idx} className="leading-snug">{claim}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Unsupported Claims */}
          <div className="p-5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-mono uppercase font-bold">
              <XCircle className="w-4 h-4" />
              <span>Unsupported Claims ({unsupportedClaims.length})</span>
            </div>
            {unsupportedClaims.length === 0 ? (
              <p className="text-xs text-slate-500 italic font-sans">
                All evaluated claims had supporting observations.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-800 font-sans">
                {unsupportedClaims.map((claim, idx) => (
                  <li key={idx} className="leading-snug">{claim}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Contradictory Findings */}
        {contradictory.length > 0 && (
          <div className="p-5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-mono uppercase font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>
                Contradictory Observations & Workaround Satisfaction ({contradictory.length})
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-rose-900 font-sans font-medium">
              {contradictory.map((cf, idx) => (
                <li key={idx} className="leading-snug">{cf}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Remaining Uncertainties */}
        {uncertainties.length > 0 && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-mono uppercase font-bold">
              <HelpCircle className="w-4 h-4" />
              <span>Remaining Uncertainties ({uncertainties.length})</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 font-sans">
              {uncertainties.map((unc, idx) => (
                <li key={idx} className="leading-snug">{unc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Next Steps & Follow-Up Experiment */}
        <div className="p-5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-indigo-800 text-xs font-mono uppercase font-bold">
            <FlaskConical className="w-4 h-4" />
            <span>Recommended Next Steps & Follow-Up Experiment</span>
          </div>
          {nextSteps.length === 0 ? (
            <p className="text-xs text-slate-500 italic font-sans">No further actions suggested.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-xs text-indigo-950 font-medium font-sans">
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
