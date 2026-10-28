import { useState, type FC, type FormEvent } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  HelpCircle,
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

  // Heuristic detection of subjective praise / vague interpretations
  const isSubjectiveOrVague =
    sourceType === 'interpretation' ||
    /(loved|liked|great idea|sounds amazing|promise|definitely download|definitely buy|would use|cool concept)/i.test(
      description
    );

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
    <div className={`space-y-6 animate-stage-enter ${className}`}>
      {/* Dirty Outdated Banner */}
      {isDirty && (
        <OutdatedBanner onReanalyze={onReanalyze || onBackToExperiment} />
      )}

      {/* Main Container */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#242a3e]">
          <div>
            <div className="flex items-center gap-2 text-teal-700 text-xs font-mono uppercase tracking-wider mb-1.5 font-semibold">
              <FileText className="w-4 h-4" />
              <span>Stage 4: Record Observed Findings</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Log Empirical Evidence & Counter-Signals
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl font-sans">
              Record what participants actually did, spent, or failed to do. Distinguish empirical behavioral observations from subjective enthusiasm.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-col items-start sm:items-end gap-1.5 text-xs shrink-0">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Quick Test Injections:</span>
            </span>
            <div className="flex flex-wrap gap-2">
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
                className="px-2.5 py-1 min-h-[36px] rounded-lg bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-800 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer shadow-2xs"
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
                className="px-2.5 py-1 min-h-[36px] rounded-lg bg-emerald-50 border border-emerald-200 hover:border-emerald-300 text-emerald-800 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer shadow-2xs"
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
                className="px-2.5 py-1 min-h-[36px] rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-300 text-amber-800 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer shadow-2xs"
              >
                + Subjective Praise
              </button>
            </div>
          </div>
        </div>

        {/* Entry Form */}
        <form onSubmit={handleAdd} className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4 shadow-2xs">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-800 font-bold">
            Add New Evidence Entry
          </h3>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-slate-800 mb-1.5">
              <span>Observed Behavioral Finding</span>
              <span className="text-rose-500 ml-1">*</span>
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Participant 2 stated they spent 3 hours last Sunday searching for flashcards, gave up, and simply re-read lecture PDF slides."
              className="w-full bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
            />
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Heuristic Nudge Callout (when subjective praise or interpretation is detected) */}
          {isSubjectiveOrVague && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5 animate-stage-enter">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 font-sans leading-relaxed">
                <span className="font-semibold text-amber-900">
                  Observation Quality Tip:
                </span>{' '}
                Polite enthusiasm (e.g. "they loved the idea") is weak evidence. What did the participant <em>actually do, spend, or struggle with</em> during their past real experience?
              </div>
            </div>
          )}

          {/* Source Type & Related Assumption Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sourceType" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Evidence Source Classification
              </label>
              <select
                id="sourceType"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none min-h-[44px] shadow-2xs font-sans"
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
              <label htmlFor="relatedAssumption" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Related Assumption Under Test
              </label>
              <select
                id="relatedAssumption"
                value={relatedAssumptionId}
                onChange={(e) => setRelatedAssumptionId(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none min-h-[44px] shadow-2xs font-sans"
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
            <label htmlFor="contextNotes" className="block text-xs font-semibold text-slate-800 mb-1.5">
              Participant Background & Environmental Context (Optional)
            </label>
            <input
              id="contextNotes"
              type="text"
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder="e.g. 2nd-year mechanical undergraduate; lathe station during Friday lab session"
              className="w-full bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none min-h-[44px] shadow-2xs font-sans"
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
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span>Recorded Findings Ledger</span>
              <span className="text-xs font-mono text-slate-500 font-normal">
                ({findings.length} record{findings.length === 1 ? '' : 's'})
              </span>
            </h3>

            {findings.length === 0 ? (
              <span className="text-xs text-rose-600 flex items-center gap-1 font-sans">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>At least 1 finding required to synthesize verdict</span>
              </span>
            ) : (
              <span className="text-xs text-emerald-700 flex items-center gap-1 font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sufficient evidence to review</span>
              </span>
            )}
          </div>

          {findings.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-600 text-xs space-y-1">
              <p className="font-semibold text-slate-800">No findings logged yet.</p>
              <p className="text-slate-500 font-sans">
                Log behavioral observations in the form above or click one of the quick test injection presets.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-4 text-xs hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        #{idx + 1}
                      </span>
                      <Badge variant="source" source={f.sourceType} />
                      {(f.relatedHypothesis || f.relatedAssumptionId) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200">
                          {f.relatedHypothesis || f.relatedAssumptionId}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-900 leading-relaxed font-medium font-sans">
                      {f.description}
                    </p>
                    {(f.context || f.contextNotes) && (
                      <p className="text-[11px] text-slate-500 italic font-sans">
                        Context: {f.context || f.contextNotes}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveFinding(f.id)}
                    title="Delete observation"
                    className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
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
