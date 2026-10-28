import { useState, type FC } from 'react';
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
  Copy,
  Check,
  Calendar,
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
    actionProtocol: string[];
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
    actionProtocol: [
      'Stop any solution coding or prototype development immediately.',
      'Conduct 5 targeted retrospective interviews focusing strictly on real past friction events.',
      'Probe whether participants experienced acute pain or are merely expressing polite hypothetical interest.',
      'Verify whether existing workarounds (e.g. calendars, notes, paper) already suffice.',
    ],
  },
  'INSUFFICIENT EVIDENCE': {
    label: 'INSUFFICIENT EVIDENCE',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-700/80',
    icon: AlertTriangle,
    summary:
      'The available findings do not justify a reliable conclusion. Observations are too sparse, subjective, or mixed to validate that the problem exists as formulated.',
    actionProtocol: [
      'Stop any solution coding or prototype development immediately.',
      'Conduct 5 targeted retrospective interviews focusing strictly on real past friction events.',
      'Probe whether participants experienced acute pain or are merely expressing polite hypothetical interest.',
      'Verify whether existing workarounds (e.g. calendars, notes, paper) already suffice.',
    ],
  },
  REVISE_THE_HYPOTHESIS: {
    label: 'REVISE THE HYPOTHESIS',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-700/80',
    icon: RotateCcw,
    summary:
      'The findings weaken the original formulation or indicate that users find existing workarounds satisfactory. A narrower or redirected problem must be investigated.',
    actionProtocol: [
      'Accept that user behavior currently favors existing tools and substitutes.',
      'Pinpoint the exact sub-step where current workarounds break down catastrophically.',
      'Narrow the target cohort to users with extreme operational constraints.',
      'Return to Stage 1 and re-formulate the problem around the uncovered bottleneck.',
    ],
  },
  'REVISE THE HYPOTHESIS': {
    label: 'REVISE THE HYPOTHESIS',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-700/80',
    icon: RotateCcw,
    summary:
      'The findings weaken the original formulation or indicate that users find existing workarounds satisfactory. A narrower or redirected problem must be investigated.',
    actionProtocol: [
      'Accept that user behavior currently favors existing tools and substitutes.',
      'Pinpoint the exact sub-step where current workarounds break down catastrophically.',
      'Narrow the target cohort to users with extreme operational constraints.',
      'Return to Stage 1 and re-formulate the problem around the uncovered bottleneck.',
    ],
  },
  EVIDENCE_SUPPORTS_FURTHER_TESTING: {
    label: 'EVIDENCE SUPPORTS FURTHER TESTING',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-700/80',
    icon: CheckCircle2,
    summary:
      'The recorded findings support continuing the investigation with a deeper test. Note: This does NOT establish broad market demand or product-market fit.',
    actionProtocol: [
      'Design a commitment test measuring user willingness to invest time, data, or money.',
      'Observe 10 additional participants in their live operating environment.',
      'Test whether users will actively adopt a manual concierge or low-fidelity prototype.',
      'Avoid scaling engineering build-out until behavioral repeat usage is established.',
    ],
  },
  'EVIDENCE SUPPORTS FURTHER TESTING': {
    label: 'EVIDENCE SUPPORTS FURTHER TESTING',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-700/80',
    icon: CheckCircle2,
    summary:
      'The recorded findings support continuing the investigation with a deeper test. Note: This does NOT establish broad market demand or product-market fit.',
    actionProtocol: [
      'Design a commitment test measuring user willingness to invest time, data, or money.',
      'Observe 10 additional participants in their live operating environment.',
      'Test whether users will actively adopt a manual concierge or low-fidelity prototype.',
      'Avoid scaling engineering build-out until behavioral repeat usage is established.',
    ],
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
  const [copied, setCopied] = useState(false);

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

  const handleCopyBrief = () => {
    const briefMarkdown = `# ProblemPilot — Executive Decision Brief
**Verdict**: ${config.label}
**Summary**: ${config.summary}

## Problem Formulation
"${updatedProblem}"

## Analytical Rationale
${rationale}

## Supported Claims (${supportedClaims.length})
${supportedClaims.length > 0 ? supportedClaims.map((c) => `- ${c}`).join('\n') : '- None verified'}

## Unsupported Claims (${unsupportedClaims.length})
${unsupportedClaims.length > 0 ? unsupportedClaims.map((c) => `- ${c}`).join('\n') : '- None'}

## Contradictory Observations (${contradictory.length})
${contradictory.length > 0 ? contradictory.map((c) => `- ${c}`).join('\n') : '- None detected'}

## Immediate 48-Hour Protocol
${config.actionProtocol.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(briefMarkdown).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onReanalyze || onRefineHypothesis} />
      )}

      {/* Main Container */}
      <div className="bg-[#101524] border border-[#212a45] rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
        {/* Document Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#212a45]">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1.5 font-semibold">
              <Award className="w-4 h-4" />
              <span>Stage 5: Evidence Review & Grounded Decision Brief</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Empirical Validation Verdict
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl font-sans">
              Objective reassessment of your hypothesis against recorded behavioral observations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyBrief}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#212a45] bg-[#151b2e] hover:bg-[#1c243c] text-slate-300 hover:text-white text-xs font-medium transition-all active:scale-[0.97] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied Markdown!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Brief</span>
                </>
              )}
            </button>

            {/* Primary Verdict Pill */}
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold tracking-wider font-mono shadow-sm ${config.bg} ${config.text} ${config.border}`}
            >
              <VerdictIcon className="w-5 h-5 shrink-0" />
              <span>{config.label}</span>
            </div>
          </div>
        </div>

        {/* Epistemic Guardrail Notice */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs flex items-start gap-3 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-zinc-900 font-semibold font-mono">Epistemic Integrity Notice:</strong> ProblemPilot strictly classifies findings under <em>INSUFFICIENT EVIDENCE</em>, <em>REVISE THE HYPOTHESIS</em>, or <em>EVIDENCE SUPPORTS FURTHER TESTING</em>. Hypotheses are never declared "PROVEN" nor is market demand guaranteed from initial pilot signals.
          </p>
        </div>

        {/* Decision Rationale */}
        <div className="p-5 sm:p-6 rounded-xl bg-zinc-50/70 border border-zinc-200/90 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold">
              Synthesis Rationale & Assessment
            </h3>
          </div>
          <p className="text-sm text-zinc-900 leading-relaxed font-normal font-sans">
            {rationale}
          </p>
          <p className="text-xs text-zinc-500 border-t border-zinc-200 pt-3 italic font-sans">
            {config.summary}
          </p>
        </div>

        {/* Refined Problem Statement Post-Evidence */}
        <div className="p-4 sm:p-5 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-teal-800 text-xs font-mono uppercase tracking-wider font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Refined Problem Formulation Post-Evidence:</span>
          </div>
          <p className="text-sm font-semibold text-teal-950 leading-relaxed font-sans">
            "{updatedProblem}"
          </p>
        </div>

        {/* Supported vs Unsupported Claims */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supported Claims */}
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-mono uppercase font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Supported Claims ({supportedClaims.length})</span>
            </div>
            {supportedClaims.length === 0 ? (
              <p className="text-xs text-zinc-500 italic font-sans">
                No claims were verified by current evidence.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-800 font-sans">
                {supportedClaims.map((claim, idx) => (
                  <li key={idx} className="leading-snug">{claim}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Unsupported Claims */}
          <div className="p-4 sm:p-5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-mono uppercase font-bold">
              <XCircle className="w-4 h-4" />
              <span>Unsupported Claims ({unsupportedClaims.length})</span>
            </div>
            {unsupportedClaims.length === 0 ? (
              <p className="text-xs text-zinc-500 italic font-sans">
                All evaluated claims had supporting observations.
              </p>
            ) : (
              <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-800 font-sans">
                {unsupportedClaims.map((claim, idx) => (
                  <li key={idx} className="leading-snug">{claim}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Contradictory Findings */}
        {contradictory.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-rose-50/60 border border-rose-200 text-rose-950 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-mono uppercase font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>
                Contradictory Observations & Workaround Satisfaction ({contradictory.length})
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-zinc-800 font-sans">
              {contradictory.map((cf, idx) => (
                <li key={idx} className="leading-snug">{cf}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Remaining Uncertainties */}
        {uncertainties.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-mono uppercase font-bold">
              <HelpCircle className="w-4 h-4" />
              <span>Remaining Uncertainties ({uncertainties.length})</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-zinc-800 font-sans">
              {uncertainties.map((unc, idx) => (
                <li key={idx} className="leading-snug">{unc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Immediate 48-Hour Founder Protocol */}
        <div className="p-5 sm:p-6 rounded-xl bg-white border border-zinc-200/90 space-y-3.5 shadow-premium-card">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-800 font-bold">
            <Calendar className="w-4 h-4" />
            <span>Immediate 48-Hour Founder Protocol</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {config.actionProtocol.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-800 flex items-start gap-2.5 shadow-2xs"
              >
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed font-sans">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Next Steps & Follow-Up Experiment */}
        <div className="p-4 sm:p-5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-purple-800 text-xs font-mono uppercase font-bold">
            <FlaskConical className="w-4 h-4" />
            <span>Recommended Next Steps & Follow-Up Experiment</span>
          </div>
          {nextSteps.length === 0 ? (
            <p className="text-xs text-zinc-500 italic font-sans">No further actions suggested.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-xs text-purple-950 font-medium font-sans">
              {nextSteps.map((step, idx) => (
                <li key={idx} className="leading-snug">{step}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-[#212a45]">
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