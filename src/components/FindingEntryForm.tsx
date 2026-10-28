import { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import type {
  Assumption,
  Finding,
  FindingSourceType,
} from '../types/index.ts';

interface FindingEntryFormProps {
  assumptions: Assumption[];
  findings: Finding[];
  onAddFinding: (finding: Omit<Finding, 'id' | 'createdAt'>) => void;
  onRemoveFinding: (id: string) => void;
  onSubmitForReview: () => Promise<void>;
  onBackToExperiment: () => void;
  isLoading: boolean;
}

export const FindingEntryForm: React.FC<FindingEntryFormProps> = ({
  assumptions,
  findings,
  onAddFinding,
  onRemoveFinding,
  onSubmitForReview,
  onBackToExperiment,
  isLoading,
}) => {
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<FindingSourceType>('direct_observation');
  const [relatedAssumptionId, setRelatedAssumptionId] = useState(
    assumptions[0]?.id || ''
  );
  const [contextNotes, setContextNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 8) {
      setError('Finding description must contain at least 8 characters describing the observation.');
      return;
    }
    setError(null);
    onAddFinding({
      description: description.trim(),
      sourceType,
      relatedAssumptionId: relatedAssumptionId || undefined,
      contextNotes: contextNotes.trim() || undefined,
      isCredibleObservation:
        sourceType === 'direct_observation' || sourceType === 'user_reported_experience',
    });
    setDescription('');
    setContextNotes('');
  };

  const handleQuickAdd = (
    desc: string,
    type: FindingSourceType,
    asmId: string,
    notes: string
  ) => {
    onAddFinding({
      description: desc,
      sourceType: type,
      relatedAssumptionId: asmId,
      contextNotes: notes,
      isCredibleObservation: type === 'direct_observation' || type === 'user_reported_experience',
    });
  };

  return (
    <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#242a3e]">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Stage 4: Record Observed Findings</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">
            Log Empirical Evidence & Counter-Signals
          </h2>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed">
            Record what participants actually did, said, or failed to do. Distinguish direct observations from opinions.
          </p>
        </div>

        {/* Quick Test Presets */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 text-xs">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Insert Test Scenario:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Participant reported existing Google Calendar satisfies their planning needs completely; expressed zero interest in a new scheduling tool.',
                  'user_reported_experience',
                  assumptions[0]?.id || 'ASM-1',
                  'Direct counter-evidence to problem severity.'
                )
              }
              className="px-2.5 py-1 rounded bg-[#12151f] border border-[#242a3e] hover:border-rose-700 text-rose-300 text-[11px] active:scale-[0.98]"
            >
              + Contradiction
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Observed participant: spent 45 minutes manually cross-checking study guides and voiced severe frustration with scattered notes.',
                  'direct_observation',
                  assumptions[0]?.id || 'ASM-1',
                  'Behavioral confirmation of study friction.'
                )
              }
              className="px-2.5 py-1 rounded bg-[#12151f] border border-[#242a3e] hover:border-emerald-700 text-emerald-300 text-[11px] active:scale-[0.98]"
            >
              + Supporting Signal
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Everyone loves this idea and said they would totally use it if it launched tomorrow!',
                  'interpretation',
                  assumptions[0]?.id || 'ASM-1',
                  'Unsubstantiated polite praise.'
                )
              }
              className="px-2.5 py-1 rounded bg-[#12151f] border border-[#242a3e] hover:border-amber-700 text-amber-300 text-[11px] active:scale-[0.98]"
            >
              + Subjective Praise
            </button>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleAdd} className="p-4 rounded-xl bg-[#12151f] border border-[#242a3e] space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Add New Finding
        </h3>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-medium text-slate-200 mb-1">
            Observation or Finding Description <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Participant 2 stated they spent 3 hours last Sunday searching for flashcards, gave up, and simply re-read lecture PDF slides."
            className="w-full bg-[#181c2a] border border-[#242a3e] focus:border-blue-500 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
          />
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Source Type & Related Assumption Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sourceType" className="block text-xs font-medium text-slate-200 mb-1">
              Source Evidence Type
            </label>
            <select
              id="sourceType"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as FindingSourceType)}
              className="w-full bg-[#181c2a] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
            >
              <option value="direct_observation">Direct Observation (Observed behavior in session)</option>
              <option value="user_reported_experience">User-Reported Experience (Recalled past event)</option>
              <option value="interpretation">Interpretation (Observer inference/deduction)</option>
              <option value="assumption">Assumption (Unverified claim)</option>
            </select>
          </div>

          <div>
            <label htmlFor="relatedAssumption" className="block text-xs font-medium text-slate-200 mb-1">
              Related Assumption Evaluated
            </label>
            <select
              id="relatedAssumption"
              value={relatedAssumptionId}
              onChange={(e) => setRelatedAssumptionId(e.target.value)}
              className="w-full bg-[#181c2a] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
            >
              <option value="">General / None</option>
              {assumptions.map((asm) => (
                <option key={asm.id} value={asm.id}>
                  {asm.id}: {asm.claim.substring(0, 45)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Context Notes */}
        <div>
          <label htmlFor="contextNotes" className="block text-xs font-medium text-slate-200 mb-1">
            Context & Observer Notes (Optional)
          </label>
          <input
            id="contextNotes"
            type="text"
            value={contextNotes}
            onChange={(e) => setContextNotes(e.target.value)}
            placeholder="e.g. In-person dorm observation, 2nd-year computer science major"
            className="w-full bg-[#181c2a] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
          />
        </div>

        {/* Add Button */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#242a3e] hover:bg-[#2e3752] text-slate-100 text-xs font-medium rounded-lg cursor-pointer active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Finding to Ledger</span>
          </button>
        </div>
      </form>

      {/* Recorded Findings List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Evidence Ledger</span>
            <span className="text-xs font-mono text-slate-400 font-normal">
              ({findings.length} record{findings.length === 1 ? '' : 's'})
            </span>
          </h3>
          {findings.length === 0 && (
            <span className="text-xs text-rose-400">
              * At least one finding is required to synthesize a verdict.
            </span>
          )}
        </div>

        {findings.length === 0 ? (
          <div className="p-8 rounded-lg bg-[#12151f] border border-dashed border-[#242a3e] text-center text-slate-400 text-xs">
            No findings recorded yet. Use the form above or click a quick preset to add observations.
          </div>
        ) : (
          <div className="space-y-2.5">
            {findings.map((f, idx) => (
              <div
                key={f.id}
                className="p-3 rounded-lg bg-[#12151f] border border-[#242a3e] flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#181c2a] text-blue-300 border border-blue-900/40">
                      {f.sourceType.replace(/_/g, ' ')}
                    </span>
                    {f.relatedAssumptionId && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-800/40">
                        {f.relatedAssumptionId}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed">{f.description}</p>
                  {f.contextNotes && (
                    <p className="text-[11px] text-slate-400">Note: {f.contextNotes}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveFinding(f.id)}
                  title="Remove finding"
                  className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-[#242a3e]">
        <button
          type="button"
          onClick={onBackToExperiment}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 bg-[#12151f] border border-[#242a3e] rounded-lg hover:bg-[#1e2335] active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Experiment</span>
        </button>

        <button
          type="button"
          disabled={findings.length === 0 || isLoading}
          onClick={onSubmitForReview}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
            findings.length > 0 && !isLoading
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing Evidence Decision...</span>
            </>
          ) : (
            <>
              <span>Review Evidence & Synthesize Verdict</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
