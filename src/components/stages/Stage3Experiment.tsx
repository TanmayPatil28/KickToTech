import { useState, type FC } from 'react';
import {
  FlaskConical,
  Clock,
  Users,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ListOrdered,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import type { ValidationExperiment } from '../../types/index.ts';
import { TactileButton } from '../common/TactileButton.tsx';
import { OutdatedBanner } from '../common/OutdatedBanner.tsx';

export interface Stage3ExperimentProps {
  experiment: ValidationExperiment;
  onProceedToFindings: () => void;
  onBackToAnalysis: () => void;
  onReanalyze?: () => void;
  isDirty?: boolean;
  className?: string;
}

export const Stage3Experiment: FC<Stage3ExperimentProps> = ({
  experiment,
  onProceedToFindings,
  onBackToAnalysis,
  onReanalyze,
  isDirty = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const questions =
    experiment?.nonLeadingQuestions || experiment?.inquiryQuestions || [];

  const handleCopyQuestions = () => {
    if (!questions.length) return;
    const text = questions
      .map((q, idx) => `${idx + 1}. ${q}`)
      .join('\n\n');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-6 animate-stage-enter ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onReanalyze || onBackToAnalysis} />
      )}

      {/* Main Experiment Card */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-2xl p-6 lg:p-8 shadow-premium-card space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2 text-teal-700 text-xs font-mono uppercase tracking-wider mb-1.5 font-semibold">
              <FlaskConical className="w-4 h-4" />
              <span>Stage 3: Validation Experiment Design</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-950 tracking-tight font-sans">
              {experiment.title || 'Targeted Behavioral Inquiry Experiment'}
            </h2>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed font-sans">
              The smallest practical test to challenge your highest-risk assumption with empirical behavior.
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono shrink-0">
            {experiment.estimatedEffort && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 font-medium shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>{experiment.estimatedEffort}</span>
              </div>
            )}
            {experiment.targetParticipants && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 font-medium shadow-2xs">
                <Users className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>{experiment.targetParticipants}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hypothesis & Objective */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-zinc-200/90 space-y-1.5 shadow-2xs">
            <span className="text-[11px] font-mono uppercase text-zinc-500 block tracking-wider font-semibold">
              Hypothesis Under Test:
            </span>
            <p className="text-sm font-semibold text-zinc-950 leading-snug font-sans">
              "{experiment.hypothesis}"
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5 shadow-2xs">
            <span className="text-[11px] font-mono uppercase text-teal-800 block tracking-wider font-semibold">
              Experiment Objective:
            </span>
            <p className="text-sm text-teal-950 font-medium leading-snug font-sans">
              {experiment.objective || 'Measure actual user friction and existing workaround satisfaction.'}
            </p>
          </div>
        </div>

        {/* Inquiry Questions — Non-Leading Rule */}
        <div className="p-5 sm:p-6 rounded-xl bg-white border border-zinc-200/90 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-zinc-900 font-sans">
                Non-Leading Past-Behavior Inquiry Questions
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                Past Actions Only &bull; Zero Hypotheticals
              </span>
              <button
                type="button"
                onClick={handleCopyQuestions}
                title="Copy questions to clipboard"
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 px-2.5 py-1 rounded-md transition-colors active:scale-[0.97] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Cheat Sheet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Never ask <em>"Would you use an app that does X?"</em> or pitch your idea. Ask strictly about actual actions, costs, and decisions made during their most recent real experience.
          </p>

          <div className="space-y-2.5 pt-1">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 shadow-2xs"
              >
                <span className="font-mono text-teal-700 font-bold shrink-0">{idx + 1}.</span>
                <span className="font-medium leading-relaxed font-sans">{q}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps & Evidence to Record Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-zinc-500">
              <ListOrdered className="w-4 h-4 text-teal-700" />
              <span className="font-semibold tracking-wider">Execution Protocol</span>
            </div>
            <div className="space-y-2">
              {experiment.steps?.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-xs text-zinc-800 p-3.5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs"
                >
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug font-sans">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence to Record */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-zinc-500">
              <FileText className="w-4 h-4 text-indigo-700" />
              <span className="font-semibold tracking-wider">Evidence to Record</span>
            </div>
            <div className="space-y-2">
              {experiment.evidenceToRecord?.map((ev, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-zinc-800 p-3.5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <span className="leading-snug font-sans">{ev}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Signals Grid: Supporting vs Weakening */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-mono uppercase font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Supporting Signals (Corroborating)</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-800">
              {experiment.supportingSignals?.map((sig, i) => (
                <li key={i} className="leading-snug font-sans">{sig}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-mono uppercase font-semibold">
              <XCircle className="w-4 h-4" />
              <span>Weakening Signals (Counter-Evidence)</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-800">
              {experiment.weakeningSignals?.map((sig, i) => (
                <li key={i} className="leading-snug font-sans">{sig}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Limitations */}
        {experiment.limitations && experiment.limitations.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950 text-xs flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-amber-900 block font-mono">
                Test Limitations & Epistemic Bounds:
              </span>
              <p className="leading-relaxed font-sans text-amber-900/90">{experiment.limitations.join(' ')}</p>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-[#212a45]">
          <TactileButton
            variant="secondary"
            size="md"
            onClick={onBackToAnalysis}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Assumptions
          </TactileButton>

          <TactileButton
            variant="primary"
            size="lg"
            onClick={onProceedToFindings}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Proceed to Log Findings
          </TactileButton>
        </div>
      </div>
    </div>
  );
};

export default Stage3Experiment;
