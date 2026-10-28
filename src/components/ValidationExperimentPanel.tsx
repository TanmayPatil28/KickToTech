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
import type { ValidationExperiment } from '../types/index.ts';

interface ValidationExperimentPanelProps {
  experiment: ValidationExperiment;
  onProceedToFindings: () => void;
  onBackToAnalysis: () => void;
}

export const ValidationExperimentPanel: FC<ValidationExperimentPanelProps> = ({
  experiment,
  onProceedToFindings,
  onBackToAnalysis,
}) => {
  return (
    <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#242a3e]">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
            <FlaskConical className="w-4 h-4" />
            <span>Stage 3: Design Validation Experiment</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">{experiment.title}</h2>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed">
            The smallest practical test to reduce your highest-risk uncertainty.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151f] border border-[#242a3e] text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{experiment.estimatedEffort}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151f] border border-[#242a3e] text-slate-300">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>{experiment.targetParticipants}</span>
          </div>
        </div>
      </div>

      {/* Hypothesis & Objective */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-[#12151f] border border-[#242a3e]">
          <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
            Hypothesis Under Test:
          </span>
          <p className="text-sm font-medium text-slate-200 leading-snug">
            "{experiment.hypothesis}"
          </p>
        </div>

        <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/40">
          <span className="text-[11px] font-mono uppercase text-blue-400 block mb-1">
            Experiment Objective:
          </span>
          <p className="text-sm text-blue-100 leading-snug">
            {experiment.objective}
          </p>
        </div>
      </div>

      {/* Inquiry Questions — Non-Leading Rule */}
      <div className="p-5 rounded-lg bg-[#12151f] border border-[#242a3e]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Non-Leading Past-Behavior Inquiry Questions
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded">
            Past Behavior Only (Zero Hypotheticals)
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          Never ask "Would you use an app that...?". Ask strictly about real actions, costs, and decisions made during past occurrences.
        </p>

        <div className="space-y-2.5">
          {experiment.inquiryQuestions.map((q, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-md bg-[#181c2a] border border-[#242a3e]/80 text-xs text-slate-200"
            >
              <span className="font-mono text-slate-400 font-semibold">{idx + 1}.</span>
              <span className="font-medium">{q}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps & Evidence to Record Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Steps */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400">
            <ListOrdered className="w-4 h-4 text-blue-400" />
            <span>Execution Protocol</span>
          </div>
          <div className="space-y-2">
            {experiment.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs text-slate-300 p-2.5 rounded-md bg-[#12151f] border border-[#242a3e]/60"
              >
                <span className="w-4 h-4 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence to Record */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Evidence to Record</span>
          </div>
          <div className="space-y-2">
            {experiment.evidenceToRecord.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-300 p-2.5 rounded-md bg-[#12151f] border border-[#242a3e]/60"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{ev}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signals Grid: Supporting vs Weakening */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Supporting Signals (Corroborating)</span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            {experiment.supportingSignals.map((sig, i) => (
              <li key={i}>{sig}</li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/40">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase mb-2">
            <XCircle className="w-4 h-4" />
            <span>Weakening Signals (Counter-Evidence)</span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            {experiment.weakeningSignals.map((sig, i) => (
              <li key={i}>{sig}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Limitations */}
      <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300 block mb-0.5">
            Test Limitations & Scope Bounds:
          </span>
          <p>{experiment.limitations.join(' ')}</p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-[#242a3e]">
        <button
          type="button"
          onClick={onBackToAnalysis}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 bg-[#12151f] border border-[#242a3e] rounded-lg hover:bg-[#1e2335] active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analysis</span>
        </button>

        <button
          type="button"
          onClick={onProceedToFindings}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 cursor-pointer active:scale-[0.98] transition-all"
        >
          <span>Record Observed Findings</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
