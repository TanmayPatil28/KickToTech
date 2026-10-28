import { useState, type FC } from 'react';
import { History, FileText, Trash2, Clock } from 'lucide-react';
import type { Finding, LedgerEntry } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';

export interface EvidenceLedgerProps {
  findings: Finding[];
  ledger?: LedgerEntry[];
  onRemoveFinding?: (id: string) => void;
  className?: string;
}

export const EvidenceLedger: FC<EvidenceLedgerProps> = ({
  findings = [],
  ledger = [],
  onRemoveFinding,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'findings' | 'timeline'>('findings');

  return (
    <div className={`bg-[#181c2a] border border-[#242a3e] rounded-xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-[#242a3e]/80">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-300">
          {viewMode === 'findings' ? (
            <FileText className="w-4 h-4 text-emerald-400" />
          ) : (
            <History className="w-4 h-4 text-purple-400" />
          )}
          <span className="font-semibold tracking-wider">
            {viewMode === 'findings' ? 'Evidence Ledger' : 'Audit Timeline'}
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-[#12151f] p-0.5 rounded-lg border border-[#242a3e] text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setViewMode('findings')}
            className={`px-2 py-0.5 rounded transition-all active:scale-[0.97] ${
              viewMode === 'findings'
                ? 'bg-blue-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Findings ({findings.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-2 py-0.5 rounded transition-all active:scale-[0.97] ${
              viewMode === 'timeline'
                ? 'bg-purple-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Timeline ({ledger.length})
          </button>
        </div>
      </div>

      {/* Findings Mode */}
      {viewMode === 'findings' && (
        <div className="space-y-2">
          {findings.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#12151f] border border-dashed border-[#242a3e] text-center text-slate-400 text-xs">
              <p className="italic">No evidence recorded yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Log behavioral observations in Stage 4 to populate this ledger.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {findings.map((finding, idx) => (
                <div
                  key={finding.id}
                  className="p-3 rounded-lg bg-[#12151f] border border-[#242a3e] text-xs space-y-1.5 hover:border-[#384260] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                      <Badge variant="source" source={finding.sourceType} />
                      {finding.relatedHypothesis && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {finding.relatedHypothesis}
                        </span>
                      )}
                      {finding.relatedAssumptionId && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                          {finding.relatedAssumptionId}
                        </span>
                      )}
                    </div>

                    {onRemoveFinding && (
                      <button
                        type="button"
                        onClick={() => onRemoveFinding(finding.id)}
                        title="Remove this observation"
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-slate-200 text-xs leading-relaxed font-normal">
                    {finding.description}
                  </p>

                  {(finding.context || finding.contextNotes) && (
                    <div className="text-[11px] text-slate-400 italic">
                      Context: {finding.context || finding.contextNotes}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 pt-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span>
                      {finding.timestamp || finding.createdAt
                        ? new Date(finding.timestamp || finding.createdAt!).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recorded'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline Mode */}
      {viewMode === 'timeline' && (
        <div className="space-y-2">
          {ledger.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#12151f] border border-dashed border-[#242a3e] text-center text-slate-400 text-xs">
              <p className="italic">No events in audit ledger yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-xs">
              {ledger
                .slice()
                .reverse()
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-lg bg-[#12151f] border border-[#242a3e] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span
                        className={`px-1.5 py-0.2 rounded font-semibold ${
                          entry.source === 'USER'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : entry.source === 'AI_REASONING'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        [{entry.source}]
                      </span>
                      <span className="text-slate-500">
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-snug">{entry.summary}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvidenceLedger;
