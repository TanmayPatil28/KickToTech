import type { FC } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  History,
  FileText,
} from 'lucide-react';
import type { CaseState } from '../types/index.ts';

interface SecondaryColumnProps {
  state: CaseState;
  onReanalyze: () => void;
}

export const SecondaryColumn: FC<SecondaryColumnProps> = ({
  state,
  onReanalyze,
}) => {
  const assumptions = state.analysis?.assumptions || [];
  const unverifiedCount = assumptions.filter((a) => a.status === 'unverified').length;
  const partialCount = assumptions.filter((a) => a.status === 'partially_supported').length;
  const supportedCount = assumptions.filter((a) => a.status === 'supported').length;

  return (
    <aside className="space-y-4">
      {/* Current Hypothesis Card */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Active Hypothesis</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {state.problem.targetUser ? `@${state.problem.targetUser}` : 'Undefined user'}
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed font-medium">
          {state.problem.idea || (
            <span className="text-slate-500 italic">No problem statement defined yet.</span>
          )}
        </p>

        {/* Stale Warning */}
        {state.isProblemStale && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-950/50 border border-amber-800/60 text-amber-300 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Hypothesis Modified (Stale)</span>
            </div>
            <p className="text-amber-300/80 mb-2">
              The problem was updated after analysis. Re-run analysis to re-align validation experiments.
            </p>
            <button
              type="button"
              onClick={onReanalyze}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-medium active:scale-[0.98]"
            >
              Re-analyze Now
            </button>
          </div>
        )}
      </div>

      {/* Assumption Verification Tally */}
      {assumptions.length > 0 && (
        <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
            Assumption Status Tracker
          </h4>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-300">
              <div className="text-lg font-bold">{unverifiedCount}</div>
              <div className="text-[10px] text-rose-400 uppercase mt-0.5">Unverified</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-900/40 text-amber-300">
              <div className="text-lg font-bold">{partialCount}</div>
              <div className="text-[10px] text-amber-400 uppercase mt-0.5">Partial</div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-emerald-300">
              <div className="text-lg font-bold">{supportedCount}</div>
              <div className="text-[10px] text-emerald-400 uppercase mt-0.5">Supported</div>
            </div>
          </div>
        </div>
      )}

      {/* Recorded Findings Summary */}
      {state.findings.length > 0 && (
        <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Evidence Ledger</span>
            </div>
            <span className="text-[11px] font-mono text-blue-400">
              {state.findings.length} record{state.findings.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {state.findings.map((f, i) => (
              <div
                key={f.id}
                className="p-2 rounded bg-[#12151f] border border-[#242a3e] text-[11px] flex items-start gap-2"
              >
                <span className="font-mono text-slate-500">#{i + 1}</span>
                <span className="text-slate-300 truncate">{f.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Audit Ledger */}
      <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400 mb-3">
          <History className="w-4 h-4 text-purple-400" />
          <span>Case Timeline & Ledger</span>
        </div>

        {state.ledger.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 text-xs">
            {state.ledger.slice().reverse().map((entry) => (
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
    </aside>
  );
};
