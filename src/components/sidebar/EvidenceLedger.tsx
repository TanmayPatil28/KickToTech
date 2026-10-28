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
    <div className={`bg-[#101524] border border-[#212a45] rounded-xl p-4 shadow-premium-card space-y-4 ${className}`}>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#212a45]">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
          <div className="w-5 h-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center">
            {viewMode === 'findings' ? (
              <FileText className="w-3.5 h-3.5" />
            ) : (
              <History className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="font-semibold tracking-wider text-slate-200">
            {viewMode === 'findings' ? 'Evidence Ledger' : 'Audit Timeline'}
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-[#151b2e] p-0.5 rounded-lg border border-[#212a45] text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setViewMode('findings')}
            className={`px-2.5 py-1 rounded-md transition-all active:scale-[0.97] cursor-pointer ${
              viewMode === 'findings'
                ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Findings ({findings.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-2.5 py-1 rounded-md transition-all active:scale-[0.97] cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Timeline ({ledger.length})
          </button>
        </div>
      </div>

      {/* Mode 1: Logged Findings */}
      {viewMode === 'findings' && (
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {findings.length === 0 ? (
            <div className="p-5 rounded-lg bg-[#151b2e] border border-dashed border-[#212a45] text-center text-slate-500 text-xs">
              <p className="font-medium text-slate-700">No findings recorded yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Observations recorded in Stage 4 will trace here.
              </p>
            </div>
          ) : (
            findings.map((finding, idx) => (
              <div
                key={finding.id}
                className="p-3 rounded-lg bg-[#151b2e] border border-[#212a45] space-y-1.5 text-xs hover:border-[#2f3b60] transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-400 font-semibold">
                      #{idx + 1}
                    </span>
                    <Badge variant="source" source={finding.sourceType} />
                    {finding.relatedHypothesis && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200">
                        {finding.relatedHypothesis}
                      </span>
                    )}
                  </div>
                  {onRemoveFinding && (
                    <button
                      type="button"
                      onClick={() => onRemoveFinding(finding.id)}
                      title="Remove this finding"
                      className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer active:scale-[0.97]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-zinc-900 leading-snug font-normal text-xs">
                  {finding.description}
                </p>

                {finding.context && (
                  <p className="text-[11px] text-slate-500 italic font-sans">
                    Context: {finding.context}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Mode 2: Chronological System Audit Timeline */}
      {viewMode === 'timeline' && (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {ledger.length === 0 ? (
            <div className="p-5 rounded-lg bg-[#151b2e] border border-dashed border-[#212a45] text-center text-slate-400 text-xs">
              <p className="font-medium text-slate-300">Audit timeline empty.</p>
            </div>
          ) : (
            ledger.map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 rounded-lg bg-[#151b2e] border border-[#212a45] text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="font-semibold text-teal-400 uppercase">
                    {entry.type.replace(/_/g, ' ')}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">{entry.summary}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default EvidenceLedger;