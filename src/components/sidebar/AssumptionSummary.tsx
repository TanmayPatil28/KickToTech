import type { FC } from 'react';
import { Layers } from 'lucide-react';
import type { Assumption } from '../../types/index.ts';

export interface AssumptionSummaryProps {
  assumptions: Assumption[];
  className?: string;
}

export const AssumptionSummary: FC<AssumptionSummaryProps> = ({
  assumptions = [],
  className = '',
}) => {
  const unverified = assumptions.filter((a) => a.status === 'unverified');
  const partiallySupported = assumptions.filter((a) => a.status === 'partially_supported');
  const supported = assumptions.filter((a) => a.status === 'supported');

  const highRisk = assumptions.filter((a) => (a.riskLevel || a.risk) === 'high');
  const mediumRisk = assumptions.filter((a) => (a.riskLevel || a.risk) === 'medium');
  const lowRisk = assumptions.filter((a) => (a.riskLevel || a.risk) === 'low');

  if (assumptions.length === 0) {
    return (
      <div className={`bg-[#101524] border border-[#212a45] rounded-xl p-4 shadow-premium-card text-xs text-slate-400 space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
          <div className="w-5 h-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold tracking-wider text-slate-200">Assumption Matrix</span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed font-sans pt-1">
          No assumptions challenged yet. Run Stage 1 analysis to surface critical assumptions.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-[#101524] border border-[#212a45] rounded-xl p-4 shadow-premium-card space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#212a45]">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
          <div className="w-5 h-5 rounded bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold tracking-wider text-slate-200">Assumption Matrix</span>
        </div>
        <span className="text-xs font-mono text-slate-500 font-semibold bg-zinc-100 px-2 py-0.5 rounded">
          {assumptions.length} Total
        </span>
      </div>

      {/* Verification Status Metric Cards */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 flex flex-col justify-center">
          <div className="text-lg font-bold text-rose-700">{unverified.length}</div>
          <div className="text-[10px] text-rose-600 uppercase tracking-wider mt-0.5 font-semibold">
            Unverified
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 flex flex-col justify-center">
          <div className="text-lg font-bold text-amber-700">{partiallySupported.length}</div>
          <div className="text-[10px] text-amber-600 uppercase tracking-wider mt-0.5 font-semibold">
            Partial
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex flex-col justify-center">
          <div className="text-lg font-bold text-emerald-700">{supported.length}</div>
          <div className="text-[10px] text-emerald-600 uppercase tracking-wider mt-0.5 font-semibold">
            Supported
          </div>
        </div>
      </div>

      {/* Risk Distribution Breakdown */}
      <div className="pt-2 border-t border-[#212a45] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="uppercase tracking-wider font-semibold">Risk Distribution</span>
          <span className="text-rose-600 font-semibold">{highRisk.length} High Risk</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[10px] font-mono font-medium">
            {highRisk.length} High
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[10px] font-mono font-medium">
            {mediumRisk.length} Med
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 text-slate-500 text-[10px] font-mono font-medium">
            {lowRisk.length} Low
          </span>
        </div>
      </div>
    </div>
  );
};

export default AssumptionSummary;