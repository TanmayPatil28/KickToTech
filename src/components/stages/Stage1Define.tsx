import { useState, type FC, type FormEvent } from 'react';
import { Target, AlertCircle, ArrowRight, Info } from 'lucide-react';
import type { ProblemInput } from '../../types/index.ts';
import { validateProblemInput } from '../../domain/stateMachine.ts';
import { TactileButton } from '../common/TactileButton.tsx';

export interface Stage1DefineProps {
  initialProblem: ProblemInput;
  onSubmit: (problem: ProblemInput) => Promise<void>;
  isLoading: boolean;
  className?: string;
}

export const Stage1Define: FC<Stage1DefineProps> = ({
  initialProblem,
  onSubmit,
  isLoading,
  className = '',
}) => {
  const [form, setForm] = useState<ProblemInput>(initialProblem);
  const [touched, setTouched] = useState(false);

  const validation = validateProblemInput(form);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (validation.valid && !isLoading) {
      onSubmit(form);
    }
  };

  const handleQuickFill = (
    idea: string,
    user: string,
    context: string,
    obs = '',
    constraints = ''
  ) => {
    setForm({
      idea,
      targetUser: user,
      context,
      existingObservations: obs,
      existingEvidence: obs,
      constraints,
    });
    setTouched(true);
  };

  return (
    <div className={`bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-6 border-b border-[#242a3e]">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
            <Target className="w-4 h-4" />
            <span>Stage 1: Define the Problem</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">
            Articulate the proposed problem hypothesis
          </h2>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed">
            Specify the exact friction point, who experiences it, and the operational context. Focus strictly on the friction rather than pitching a solution.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 text-xs text-slate-400 shrink-0">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            Quick Scenarios:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleQuickFill(
                  'An AI app that helps college students study better.',
                  'College students',
                  'During midterm and final exams across university courses.'
                )
              }
              className="px-2.5 py-1 min-h-[36px] rounded-lg bg-[#12151f] border border-[#242a3e] hover:border-amber-700/60 text-amber-300 text-xs transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer"
            >
              Vague Idea
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickFill(
                  'Mechanical engineering students spend 15 hours/week searching through legacy PDF manuals for torque specs because current search indexes text only, not raster schematics.',
                  'Mechanical engineering undergraduates',
                  'During lathe and mill setup prior to machining aluminum components in university labs.',
                  'Interviewed 4 machine shop TAs who report constant manual-lookup interruptions.',
                  'No network access allowed at machine stations.'
                )
              }
              className="px-2.5 py-1 min-h-[36px] rounded-lg bg-[#12151f] border border-[#242a3e] hover:border-emerald-700/60 text-emerald-300 text-xs transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer"
            >
              Specific Problem
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Proposed Problem / Idea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="idea" className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
              <span>Proposed Problem or Product Hypothesis</span>
              <span className="text-rose-400">*</span>
            </label>
            <span
              className={`text-[11px] font-mono ${
                form.idea.trim().length >= 10 ? 'text-slate-500' : 'text-amber-400'
              }`}
            >
              {form.idea.trim().length}/10 chars min
            </span>
          </div>
          <textarea
            id="idea"
            rows={3}
            value={form.idea}
            onChange={(e) => setForm({ ...form, idea: e.target.value })}
            placeholder="e.g. Mechanical engineering students spend 15 hours/week searching through legacy PDF machine manuals for torque specs because current search tools index only text not raster schematics."
            className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
          />
          {touched && form.idea.trim().length < 10 && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Describe the proposed problem in at least 10 characters.</span>
            </div>
          )}
        </div>

        {/* Target User & Context Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="targetUser" className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <span>Target User Cohort</span>
                <span className="text-rose-400">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  form.targetUser.trim().length >= 3 ? 'text-slate-500' : 'text-amber-400'
                }`}
              >
                {form.targetUser.trim().length}/3 chars min
              </span>
            </div>
            <input
              id="targetUser"
              type="text"
              value={form.targetUser}
              onChange={(e) => setForm({ ...form, targetUser: e.target.value })}
              placeholder="e.g. Mechanical engineering undergraduates in machine shops"
              className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors min-h-[44px]"
            />
            {touched && form.targetUser.trim().length < 3 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Specify the target user cohort (at least 3 characters).</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="context" className="block text-xs font-medium text-slate-200 mb-1.5">
              <span>Operational Context (Where & When the friction occurs)</span>
            </label>
            <input
              id="context"
              type="text"
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              placeholder="e.g. During lathe and mill setup prior to machining aluminum components"
              className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors min-h-[44px]"
            />
          </div>
        </div>

        {/* Existing Observations & Constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label htmlFor="observations" className="block text-xs font-medium text-slate-200 mb-1.5">
              <span>Existing Observations or Pilot Data (Optional)</span>
            </label>
            <input
              id="observations"
              type="text"
              value={form.existingObservations || form.existingEvidence || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  existingObservations: e.target.value,
                  existingEvidence: e.target.value,
                })
              }
              placeholder="e.g. Interviewed 4 machine shop TAs who report constant lookup interruptions"
              className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="constraints" className="block text-xs font-medium text-slate-200 mb-1.5">
              <span>Technical / Operational Constraints (Optional)</span>
            </label>
            <input
              id="constraints"
              type="text"
              value={form.constraints || ''}
              onChange={(e) => setForm({ ...form, constraints: e.target.value })}
              placeholder="e.g. No internet connectivity permitted at lab machine stations"
              className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors min-h-[44px]"
            />
          </div>
        </div>

        {/* Epistemic Honesty Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-950/30 border border-blue-900/50 text-blue-300 text-xs leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
          <span>
            <strong>Honest AI Principle:</strong> Broad or solution-first ideas will produce an <em>incomplete</em> or <em>vague</em> clarity critique. ProblemPilot isolates what is unverified without inventing missing facts.
          </span>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-3">
          <TactileButton
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={!validation.valid || isLoading}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Analyze Problem & Challenge Assumptions
          </TactileButton>
        </div>
      </form>
    </div>
  );
};

export default Stage1Define;
