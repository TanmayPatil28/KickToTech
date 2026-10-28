import type { FC } from 'react';
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
  const questions =
    experiment?.nonLeadingQuestions || experiment?.inquiryQuestions || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onReanalyze || onBackToAnalysis} />
      )}

      {/* Main Experiment Card */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#242a3e]">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
              <FlaskConical className="w-4 h-4" />
              <span>Stage 3: Validation Experiment Design</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">
              {experiment.title || 'Targeted Behavioral Inquiry Experiment'}
            </h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              The smallest practical test to challenge your highest-risk assumption with empirical behavior.
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono shrink-0">
            {experiment.estimatedEffort && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151f] border border-[#242a3e] text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{experiment.estimatedEffort}</span>
              </div>
            )}
            {experiment.targetParticipants && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151f] border border-[#242a3e] text-slate-300">
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>{experiment.targetParticipants}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hypothesis & Objective */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#12151f] border border-[#242a3e] space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 block tracking-wider font-semibold">
              Hypothesis Under Test:
            </span>
            <p className="text-sm font-medium text-slate-200 leading-snug">
              "{experiment.hypothesis}"
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40 space-y-1">
            <span className="text-[11px] font-mono uppercase text-blue-400 block tracking-wider font-semibold">
              Experiment Objective:
            </span>
            <p className="text-sm text-blue-100 leading-snug">
              {experiment.objective || 'Measure actual user friction and existing workaround satisfaction.'}
            </p>
          </div>
        </div>

        {/* Inquiry Questions — Non-Leading Rule */}
        <div className="p-5 rounded-xl bg-[#12151f] border border-[#242a3e] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Non-Leading Past-Behavior Inquiry Questions
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded self-start sm:self-auto font-medium">
              Past Actions Only &bull; Zero Hypotheticals
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Never ask <em>"Would you use an app that does X?"</em> or pitch your idea. Ask strictly about actual actions, costs, and decisions made during their most recent real experience.
          </p>

          <div className="space-y-2 pt-1">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-[#181c2a] border border-[#242a3e]/80 text-xs text-slate-200"
              >
                <span className="font-mono text-slate-400 font-semibold">{idx + 1}.</span>
                <span className="font-medium leading-relaxed">{q}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps & Evidence to Record Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-300">
              <ListOrdered className="w-4 h-4 text-blue-400" />
              <span className="font-semibold tracking-wider">Execution Protocol</span>
            </div>
            <div className="space-y-2">
              {experiment.steps?.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-slate-300 p-2.5 rounded-lg bg-[#12151f] border border-[#242a3e]/60"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence to Record */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-300">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="font-semibold tracking-wider">Evidence to Record</span>
            </div>
            <div className="space-y-2">
              {experiment.evidenceToRecord?.map((ev, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-300 p-2.5 rounded-lg bg-[#12151f] border border-[#242a3e]/60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{ev}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Signals Grid: Supporting vs Weakening */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Supporting Signals (Corroborating)</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
              {experiment.supportingSignals?.map((sig, i) => (
                <li key={i} className="leading-snug">{sig}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase font-semibold">
              <XCircle className="w-4 h-4" />
              <span>Weakening Signals (Counter-Evidence)</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
              {experiment.weakeningSignals?.map((sig, i) => (
                <li key={i} className="leading-snug">{sig}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Limitations */}
        {experiment.limitations && experiment.limitations.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-300 block">
                Test Limitations & Epistemic Bounds:
              </span>
              <p className="leading-relaxed">{experiment.limitations.join(' ')}</p>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-[#242a3e]">
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
