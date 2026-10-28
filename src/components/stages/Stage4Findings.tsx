import { useState, type FC, type FormEvent } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import type {
  Assumption,
  Finding,
  SourceType,
} from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { TactileButton } from '../common/TactileButton.tsx';
import { OutdatedBanner } from '../common/OutdatedBanner.tsx';

export interface Stage4FindingsProps {
  assumptions: Assumption[];
  findings: Finding[];
  onAddFinding: (finding: Omit<Finding, 'id' | 'createdAt' | 'timestamp'>) => void;
  onRemoveFinding: (id: string) => void;
  onSubmitForReview: () => Promise<void>;
  onBackToExperiment: () => void;
  onReanalyze?: () => void;
  isDirty?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const Stage4Findings: FC<Stage4FindingsProps> = ({
  assumptions = [],
  findings = [],
  onAddFinding,
  onRemoveFinding,
  onSubmitForReview,
  onBackToExperiment,
  onReanalyze,
  isDirty = false,
  isLoading = false,
  className = '',
}) => {
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('direct_observation');
  const [relatedAssumptionId, setRelatedAssumptionId] = useState(
    assumptions[0]?.id || ''
  );
  const [contextNotes, setContextNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 8) {
      setError('Observation description must contain at least 8 characters describing the behavior.');
      return;
    }
    setError(null);
    onAddFinding({
      description: description.trim(),
      sourceType,
      relatedHypothesis: relatedAssumptionId || undefined,
      relatedAssumptionId: relatedAssumptionId || undefined,
      context: contextNotes.trim() || undefined,
      contextNotes: contextNotes.trim() || undefined,
      isCredibleObservation:
        sourceType === 'direct_observation' ||
        sourceType === 'user_reported' ||
        (sourceType as string) === 'user_reported_experience',
    });
    setDescription('');
    setContextNotes('');
  };

  const handleQuickAdd = (
    desc: string,
    type: SourceType,
    asmId: string,
    notes: string
  ) => {
    onAddFinding({
      description: desc,
      sourceType: type,
      relatedHypothesis: asmId,
      relatedAssumptionId: asmId,
      context: notes,
      contextNotes: notes,
      isCredibleObservation:
        type === 'direct_observation' ||
        type === 'user_reported' ||
        (type as string) === 'user_reported_experience',
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onReanalyze || onBackToExperiment} />
      )}

      {/* Main Container */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-6 lg:p-8 shadow-lg space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#242a3e]">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4" />
              <span>Stage 4: Record Observed Findings</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">
              Log Empirical Evidence & Counter-Signals
            </h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Record what participants actually did, spent, or failed to do. Distinguish empirical behavioral observations from subjective enthusiasm.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-col items-start sm:items-end gap-1.5 text-xs shrink-0">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Quick Test Injections:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleQuickAdd(
                    'Participant reported that existing Google Calendar and alarms completely resolve their study scheduling; stated zero interest in an automated planning tool.',
                    'user_reported',
                    assumptions[0]?.id || 'ASM-1',
                    'Direct counter-evidence: existing workaround fully satisfies user cohort.'
                  )
                }
                className="px-2.5 py-1 min-h-[36px] rounded-lg bg-[#12151f] border border-[#242a3e] hover:border-rose-700/80 text-rose-300 text-xs transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer"
              >
                + Contradiction
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickAdd(
                    'Observed participant spend 35 minutes searching for spindle torque tolerances in unindexed PDF manual before giving up and walking across lab to interrupt TA.',
                    'direct_observation',
                    assumptions[0]?.id || 'ASM-1',
                    'Timed session observation: verified schematics search bottleneck.'
                  )
                }
                className="px-2.5 py-1 min-h-[36px] rounded-lg bg-[#12151f] border border-[#242a3e] hover:border-emerald-700/80 text-emerald-300 text-xs transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer"
              >
                + Supporting Signal
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickAdd(
                    'All my roommates said this idea sounds amazing and promised they would definitely download it when it launches!',
                    'interpretation',
                    assumptions[0]?.id || 'ASM-1',
                    'Hypothetical enthusiasm / polite praise without verified action.'
                  )
                }
                className="px-2.5 py-1 min-h-[36px] rounded-lg bg-[#12151f] border border-[#242a3e] hover:border-amber-700/80 text-amber-300 text-xs transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer"
              >
                + Subjective Praise
              </button>
            </div>
          </div>
        </div>

        {/* Entry Form */}
        <form onSubmit={handleAdd} className="p-4 sm:p-5 rounded-xl bg-[#12151f] border border-[#242a3e] space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
            Add New Evidence Entry
          </h3>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-medium text-slate-200 mb-1.5">
              <span>Observed Behavioral Finding</span>
              <span className="text-rose-400 ml-1">*</span>
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
              <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Source Type & Related Assumption Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sourceType" className="block text-xs font-medium text-slate-200 mb-1.5">
                Evidence Source Classification
              </label>
              <select
                id="sourceType"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full bg-[#181c2a] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none min-h-[44px]"
              >
                <option value="direct_observation">
                  Direct Observation (Recorded behavior in test session)
                </option>
                <option value="user_reported">
                  User-Reported Experience (Recalled past factual event)
                </option>
                <option value="interpretation">
                  Interpretation (Observer deduction or inference)
                </option>
                <option value="assumption">
                  Assumption (Unverified claim or speculation)
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="relatedAssumption" className="block text-xs font-medium text-slate-200 mb-1.5">
                Related Assumption Under Test
              </label>
              <select
                id="relatedAssumption"
                value={relatedAssumptionId}
                onChange={(e) => setRelatedAssumptionId(e.target.value)}
                className="w-full bg-[#181c2a] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none min-h-[44px]"
              >
                <option value="">General / Entire Hypothesis</option>
                {assumptions.map((asm) => (
                  <option key={asm.id} value={asm.id}>
                    {asm.id}: {asm.claim.substring(0, 48)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context Notes */}
          <div>
            <label htmlFor="contextNotes" className="block text-xs font-medium text-slate-200 mb-1.5">
              Participant Background & Environmental Context (Optional)
            </label>
            <input
              id="contextNotes"
              type="text"
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder="e.g. 2nd-year mechanical undergraduate; lathe station during Friday lab session"
              className="w-full bg-[#181c2a] border border-[#242a3e] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none min-h-[44px]"
            />
          </div>

          {/* Add Button */}
          <div className="flex justify-end pt-1">
            <TactileButton
              type="submit"
              variant="secondary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              className="min-h-[44px]"
            >
              Add Finding to Ledger
            </TactileButton>
          </div>
        </form>

        {/* Recorded Findings List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Recorded Findings Ledger</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                ({findings.length} record{findings.length === 1 ? '' : 's'})
              </span>
            </h3>

            {findings.length === 0 ? (
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>At least 1 finding required to synthesize verdict</span>
              </span>
            ) : (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sufficient evidence to review</span>
              </span>
            )}
          </div>

          {findings.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#12151f] border border-dashed border-[#242a3e] text-center text-slate-400 text-xs space-y-1">
              <p className="font-medium text-slate-300">No findings logged yet.</p>
              <p className="text-slate-500">
                Log behavioral observations in the form above or click one of the quick test injection presets.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {findings.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-3.5 rounded-xl bg-[#12151f] border border-[#242a3e] flex items-start justify-between gap-3 text-xs hover:border-[#384260] transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-500 font-semibold">
                        #{idx + 1}
                      </span>
                      <Badge variant="source" source={f.sourceType} />
                      {(f.relatedHypothesis || f.relatedAssumptionId) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-800/40">
                          {f.relatedHypothesis || f.relatedAssumptionId}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {f.description}
                    </p>
                    {(f.context || f.contextNotes) && (
                      <p className="text-[11px] text-slate-400 italic">
                        Context: {f.context || f.contextNotes}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveFinding(f.id)}
                    title="Delete observation"
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-950/30 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-[#242a3e]">
          <TactileButton
            variant="secondary"
            size="md"
            onClick={onBackToExperiment}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Experiment
          </TactileButton>

          <TactileButton
            variant="primary"
            size="lg"
            disabled={findings.length === 0 || isLoading}
            isLoading={isLoading}
            onClick={onSubmitForReview}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Review Evidence & Synthesize Verdict
          </TactileButton>
        </div>
      </div>
    </div>
  );
};

export default Stage4Findings;
