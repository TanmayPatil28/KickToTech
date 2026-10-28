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
      <div className={`bg-[#181c2a] border border-[#242a3e] rounded-2xl p-4 sm:p-5 shadow-sm text-xs text-slate-500 space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-700 font-bold">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="font-semibold tracking-wider">Assumption Matrix</span>
        </div>
        <p className="italic text-slate-500 font-sans">
          No assumptions challenged yet. Run Stage 1 analysis to surface critical assumptions.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-[#181c2a] border border-[#242a3e] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#242a3e]/80">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-700 font-bold">
          <Layers className="w-4 h-4 text-teal-700" />
          <span className="font-semibold tracking-wider">Assumption Matrix</span>
        </div>
        <span className="text-xs font-mono text-slate-500 font-semibold">
          {assumptions.length} Total
        </span>
      </div>

      {/* Verification Status Metric Cards */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col justify-center shadow-2xs">
          <div className="text-lg font-bold text-rose-900">{unverified.length}</div>
          <div className="text-[10px] text-rose-700 uppercase tracking-wider mt-0.5 font-semibold">
            Unverified
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex flex-col justify-center shadow-2xs">
          <div className="text-lg font-bold text-amber-900">{partiallySupported.length}</div>
          <div className="text-[10px] text-amber-700 uppercase tracking-wider mt-0.5 font-semibold">
            Partial
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col justify-center shadow-2xs">
          <div className="text-lg font-bold text-emerald-900">{supported.length}</div>
          <div className="text-[10px] text-emerald-700 uppercase tracking-wider mt-0.5 font-semibold">
            Supported
          </div>
        </div>
      </div>

      {/* Risk Distribution Breakdown */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 uppercase tracking-wider">
          <span className="font-semibold">Risk Distribution</span>
          <span className="text-rose-700 font-bold">{highRisk.length} High Risk</span>
        </div>

        <div className="flex gap-1.5 h-2 rounded-full overflow-hidden bg-slate-200">
          <div
            style={{ width: `${(highRisk.length / assumptions.length) * 100}%` }}
            className="bg-rose-500"
            title={`${highRisk.length} High Risk`}
          />
          <div
            style={{ width: `${(mediumRisk.length / assumptions.length) * 100}%` }}
            className="bg-amber-400"
            title={`${mediumRisk.length} Medium Risk`}
          />
          <div
            style={{ width: `${(lowRisk.length / assumptions.length) * 100}%` }}
            className="bg-slate-400"
            title={`${lowRisk.length} Low Risk`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
          <span>{highRisk.length} High</span>
          <span>{mediumRisk.length} Med</span>
          <span>{lowRisk.length} Low</span>
        </div>
      </div>
    </div>
  );
};

export default AssumptionSummary;
