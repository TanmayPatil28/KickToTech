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
    <div className={`bg-[#181c2a] border border-[#242a3e] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-[#242a3e]/80">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-700 font-bold">
          {viewMode === 'findings' ? (
            <FileText className="w-4 h-4 text-teal-700" />
          ) : (
            <History className="w-4 h-4 text-indigo-700" />
          )}
          <span className="font-semibold tracking-wider">
            {viewMode === 'findings' ? 'Evidence Ledger' : 'Audit Timeline'}
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setViewMode('findings')}
            className={`px-2.5 py-1 rounded-md transition-all active:scale-[0.97] cursor-pointer ${
              viewMode === 'findings'
                ? 'bg-teal-700 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Findings ({findings.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-2.5 py-1 rounded-md transition-all active:scale-[0.97] cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-slate-800 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timeline ({ledger.length})
          </button>
        </div>
      </div>

      {/* Findings Mode */}
      {viewMode === 'findings' && (
        <div className="space-y-2.5">
          {findings.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 italic font-sans">
              No empirical findings recorded yet.
            </div>
          ) : (
            findings.map((f, idx) => (
              <div
                key={f.id}
                className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">
                      #{idx + 1}
                    </span>
                    <Badge variant="source" source={f.sourceType} />
                  </div>
                  {onRemoveFinding && (
                    <button
                      type="button"
                      onClick={() => onRemoveFinding(f.id)}
                      title="Remove finding"
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-slate-900 font-medium leading-relaxed font-sans">
                  {f.description}
                </p>
                {(f.context || f.contextNotes) && (
                  <p className="text-[11px] text-slate-500 italic font-sans">
                    {f.context || f.contextNotes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Audit Timeline Mode */}
      {viewMode === 'timeline' && (
        <div className="space-y-2">
          {ledger.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 italic font-sans">
              Audit timeline is empty.
            </div>
          ) : (
            ledger.map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="font-semibold text-slate-700">{entry.type}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <p className="text-slate-800 text-[11px] leading-snug font-sans">
                  {entry.summary}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default EvidenceLedger;
