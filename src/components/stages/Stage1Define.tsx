import { useState, type FC, type FormEvent } from 'react';
import { Target, AlertCircle, ArrowRight, Info, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
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
  const [showOptionalFields, setShowOptionalFields] = useState(
    Boolean(
      initialProblem.context ||
      initialProblem.existingObservations ||
      initialProblem.existingEvidence ||
      initialProblem.constraints
    )
  );

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
    setShowOptionalFields(true);
  };

  const hasCoreDetails = form.idea.trim().length >= 10 && form.targetUser.trim().length >= 3;

  return (
    <div className={`bg-[#181c2a] border border-[#242a3e] rounded-2xl p-6 lg:p-8 shadow-premium-card space-y-6 animate-stage-enter ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-teal-700 text-xs font-mono uppercase tracking-wider mb-1.5 font-semibold">
            <Target className="w-4 h-4" />
            <span>Stage 1: Define the Problem</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight font-sans">
            Articulate the proposed problem hypothesis
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed max-w-2xl font-sans">
            Describe the real daily frustration people face, who struggles with it, and when it happens. Focus on their pain rather than pitching features.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 text-xs text-zinc-500 shrink-0">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Quick Scenarios:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleQuickFill(
                  'An AI app that helps college students study better.',
                  'College students',
                  'During midterm and final exams across university courses.'
                )
              }
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-amber-800 border border-zinc-200 hover:border-amber-400 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer shadow-2xs"
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
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-emerald-800 border border-zinc-200 hover:border-emerald-400 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer shadow-2xs"
            >
              Specific Problem
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Core Problem */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-mono font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider font-mono">
                Core Problem Statement & Target User
              </span>
            </div>
            {hasCoreDetails && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium font-sans">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Core defined</span>
              </span>
            )}
          </div>

          {/* Proposed Problem / Idea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="idea" className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <span>Proposed Problem or Product Hypothesis</span>
                <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[11px] font-mono font-medium ${
                  form.idea.trim().length >= 10 ? 'text-zinc-400' : 'text-amber-600'
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
              className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 rounded-xl p-3.5 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none transition-all font-sans leading-relaxed"
            />
            {touched && form.idea.trim().length < 10 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1.5 font-sans">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Describe the proposed problem in at least 10 characters.</span>
              </div>
            )}
          </div>

          {/* Target User */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="targetUser" className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <span>Target User Cohort</span>
                <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[11px] font-mono font-medium ${
                  form.targetUser.trim().length >= 3 ? 'text-zinc-400' : 'text-amber-600'
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
              className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none transition-all min-h-[44px] font-sans"
            />
            {touched && form.targetUser.trim().length < 3 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1.5 font-sans">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Specify the target user cohort (at least 3 characters).</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Context, Observations & Constraints (Progressive Disclosure) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-200">
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-700 uppercase tracking-wider font-mono hover:text-zinc-950 transition-colors cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-mono font-bold flex items-center justify-center">
                2
              </span>
              <span>Context, Prior Observations & Constraints (Optional)</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                  showOptionalFields ? 'rotate-180' : ''
                }`}
              />
            </button>
            <span className="text-[11px] text-zinc-400 font-mono">
              Enriches critique depth
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="context" className="block text-xs font-semibold text-zinc-800 mb-1.5">
                <span>Operational Context (Where & When the friction occurs)</span>
              </label>
              <input
                id="context"
                type="text"
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
                placeholder="e.g. During lathe and mill setup prior to machining aluminum components"
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none transition-all min-h-[44px] font-sans"
              />
            </div>

            <div>
              <label htmlFor="observations" className="block text-xs font-semibold text-zinc-800 mb-1.5">
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
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none transition-all min-h-[44px] font-sans"
              />
            </div>

            <div>
              <label htmlFor="constraints" className="block text-xs font-semibold text-zinc-800 mb-1.5">
                <span>Technical / Operational Constraints (Optional)</span>
              </label>
              <input
                id="constraints"
                type="text"
                value={form.constraints || ''}
                onChange={(e) => setForm({ ...form, constraints: e.target.value })}
                placeholder="e.g. No internet connectivity permitted at lab machine stations"
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none transition-all min-h-[44px] font-sans"
              />
            </div>
          </div>
        </div>

        {/* Epistemic Honesty Note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 text-xs leading-relaxed shadow-2xs font-sans">
          <Info className="w-4 h-4 shrink-0 text-teal-700 mt-0.5" />
          <span>
            <strong className="font-semibold text-zinc-900">Honest AI Principle:</strong> Broad or solution-first ideas will produce an <em>incomplete</em> or <em>vague</em> clarity critique. ProblemPilot isolates what is unverified without inventing missing facts.
          </span>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
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