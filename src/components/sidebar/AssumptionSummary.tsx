import type { FC } from 'react';
import { Layers } from 'lucide-react';
import type { Assumption } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';

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
      <div className={`bg-[#181c2a] border border-[#242a3e] rounded-xl p-4 shadow-sm text-xs text-slate-500 space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400">
          <Layers className="w-4 h-4 text-slate-500" />
          <span className="font-semibold tracking-wider">Assumption Matrix</span>
        </div>
        <p className="italic text-slate-500">
          No assumptions challenged yet. Run Stage 1 analysis to surface critical assumptions.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-[#181c2a] border border-[#242a3e] rounded-xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#242a3e]/80">
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-300">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="font-semibold tracking-wider">Assumption Matrix</span>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {assumptions.length} Total
        </span>
      </div>

      {/* Verification Status Metric Cards */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 flex flex-col justify-center">
          <div className="text-lg font-bold">{unverified.length}</div>
          <div className="text-[10px] text-rose-400 uppercase tracking-wider mt-0.5 font-medium">
            Unverified
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/50 text-amber-300 flex flex-col justify-center">
          <div className="text-lg font-bold">{partiallySupported.length}</div>
          <div className="text-[10px] text-amber-400 uppercase tracking-wider mt-0.5 font-medium">
            Partial
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 flex flex-col justify-center">
          <div className="text-lg font-bold">{supported.length}</div>
          <div className="text-[10px] text-emerald-400 uppercase tracking-wider mt-0.5 font-medium">
            Supported
          </div>
        </div>
      </div>

      {/* Risk Distribution Breakdown */}
      <div className="bg-[#12151f] p-3 rounded-lg border border-[#242a3e]/60 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          <span>Risk Distribution</span>
          <span className="text-rose-400 font-semibold">{highRisk.length} High Risk</span>
        </div>

        <div className="flex gap-1.5 h-2 rounded overflow-hidden bg-slate-900">
          <div
            style={{ width: `${(highRisk.length / assumptions.length) * 100}%` }}
            className="bg-rose-500 rounded-xs"
            title={`${highRisk.length} High Risk`}
          />
          <div
            style={{ width: `${(mediumRisk.length / assumptions.length) * 100}%` }}
            className="bg-amber-500 rounded-xs"
            title={`${mediumRisk.length} Medium Risk`}
          />
          <div
            style={{ width: `${(lowRisk.length / assumptions.length) * 100}%` }}
            className="bg-slate-600 rounded-xs"
            title={`${lowRisk.length} Low Risk`}
          />
        </div>
      </div>

      {/* High-Risk Assumptions List */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider block">
          Critical Focus Items:
        </span>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {assumptions.map((asm) => {
            const risk = asm.riskLevel || asm.risk || 'medium';
            return (
              <div
                key={asm.id}
                className="p-2 rounded-lg bg-[#12151f] border border-[#242a3e] text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] text-slate-300 font-semibold">
                    {asm.id}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant="risk" risk={risk} className="text-[9px] px-1.5 py-0" />
                    <Badge variant="status" status={asm.status} className="text-[9px] px-1.5 py-0" />
                  </div>
                </div>
                <p className="text-slate-300 text-[11px] leading-snug line-clamp-2">
                  {asm.claim}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AssumptionSummary;
