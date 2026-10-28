import { useState, type FC, type FormEvent } from 'react';
import { Target, AlertCircle, ArrowRight, Loader2, Info } from 'lucide-react';
import type { ProblemInput } from '../types/index.ts';
import { validateProblemInput } from '../domain/stateMachine.ts';

interface ProblemInputFormProps {
  initialProblem: ProblemInput;
  onSubmit: (problem: ProblemInput) => Promise<void>;
  isLoading: boolean;
}

export const ProblemInputForm: FC<ProblemInputFormProps> = ({
  initialProblem,
  onSubmit,
  isLoading,
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

  const handleQuickFill = (idea: string, user: string, context: string) => {
    setForm({
      ...form,
      idea,
      targetUser: user,
      context,
    });
    setTouched(true);
  };

  return (
    <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg">
      <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-[#242a3e]">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
            <Target className="w-4 h-4" />
            <span>Stage 1: Define the Problem</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">
            Articulate the proposed problem hypothesis
          </h2>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed">
            Specify the friction point, who experiences it, and the context. Do not pitch a solution yet—focus strictly on the difficulty.
          </p>
        </div>

        {/* Quick Example Fillers */}
        <div className="hidden sm:flex flex-col items-end gap-1.5 text-xs text-slate-400">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Load Quick Preset:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleQuickFill(
                  'An AI app that helps college students study better.',
                  'College students',
                  'During midterm and final exams across university courses.'
                )
              }
              className="px-2.5 py-1 rounded bg-[#12151f] border border-[#242a3e] hover:border-amber-700/60 text-amber-300 text-[11px] active:scale-[0.98]"
            >
              Vague Idea
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickFill(
                  'Junior remote software engineers spend >3 hours daily blocked by ambiguous internal API specifications without timely senior answers.',
                  'Junior remote developers (0-2 yrs)',
                  'During sprint feature execution across distributed teams.'
                )
              }
              className="px-2.5 py-1 rounded bg-[#12151f] border border-[#242a3e] hover:border-emerald-700/60 text-emerald-300 text-[11px] active:scale-[0.98]"
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
              <span>Proposed Problem or Product Idea</span>
              <span className="text-rose-400">*</span>
            </label>
            <span
              className={`text-[11px] font-mono ${
                form.idea.trim().length >= 10 ? 'text-slate-400' : 'text-amber-400'
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
            placeholder="e.g. University students cramming for midterms cannot identify which specific concepts they misunderstand before taking practice exams."
            className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
          />
          {touched && form.idea.trim().length < 10 && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Please describe the proposed problem in at least 10 characters.</span>
            </div>
          )}
        </div>

        {/* Target User & Context Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="targetUser" className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <span>Target User Profile</span>
                <span className="text-rose-400">*</span>
              </label>
            </div>
            <input
              id="targetUser"
              type="text"
              value={form.targetUser}
              onChange={(e) => setForm({ ...form, targetUser: e.target.value })}
              placeholder="e.g. Undergraduate STEM college students"
              className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
            />
            {touched && form.targetUser.trim().length < 3 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Specify the target user (e.g. Undergraduate students).</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="context" className="block text-xs font-medium text-slate-200 mb-1.5">
              <span>Operational Context (Where/When)</span>
            </label>
            <input
              id="context"
              type="text"
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              placeholder="e.g. During exam study weeks, 48 hours prior to testing"
              className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Optional Existing Observations & Constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label htmlFor="evidence" className="block text-xs font-medium text-slate-200 mb-1.5">
              <span>Current Observations or Evidence (Optional)</span>
            </label>
            <input
              id="evidence"
              type="text"
              value={form.existingEvidence || ''}
              onChange={(e) => setForm({ ...form, existingEvidence: e.target.value })}
              placeholder="e.g. 3 classmates asked for my study guides last week"
              className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="constraints" className="block text-xs font-medium text-slate-200 mb-1.5">
              <span>Research Constraints (Optional)</span>
            </label>
            <input
              id="constraints"
              type="text"
              value={form.constraints || ''}
              onChange={(e) => setForm({ ...form, constraints: e.target.value })}
              placeholder="e.g. 48 hours available, 5 peer interviews max"
              className="w-full bg-[#12151f] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Helper Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-950/30 border border-blue-900/40 text-blue-300 text-xs leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
          <span>
            <strong>Honest AI Principle:</strong> If you submit a broad or solution-centric idea, ProblemPilot will identify the missing specificity rather than pretending the problem is already understood.
          </span>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={!validation.valid || isLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
              validation.valid && !isLoading
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Challenging Assumptions with AI...</span>
              </>
            ) : (
              <>
                <span>Analyze Problem & Challenge Assumptions</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
