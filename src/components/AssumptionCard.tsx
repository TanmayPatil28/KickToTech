import type { FC } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Assumption, EvidenceStatus, RiskLevel } from '../types/index.ts';

interface AssumptionCardProps {
  assumption: Assumption;
}

const RISK_BADGES: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-800/60' },
  medium: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-800/60' },
  low: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700/60' },
};

const STATUS_BADGES: Record<EvidenceStatus, { bg: string; text: string; border: string; icon: any }> = {
  unverified: {
    bg: 'bg-rose-950/40',
    text: 'text-rose-400',
    border: 'border-rose-800/50',
    icon: ShieldAlert,
  },
  partially_supported: {
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    border: 'border-amber-800/50',
    icon: AlertTriangle,
  },
  supported: {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    border: 'border-emerald-800/50',
    icon: CheckCircle2,
  },
};

export const AssumptionCard: FC<AssumptionCardProps> = ({ assumption }) => {
  const risk = RISK_BADGES[assumption.risk] || RISK_BADGES.medium;
  const status = STATUS_BADGES[assumption.status] || STATUS_BADGES.unverified;
  const StatusIcon = status.icon;

  return (
    <div className="bg-[#12151f] border border-[#242a3e] rounded-lg p-4 hover:border-[#384260] transition-colors flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#181c2a] text-slate-300 border border-[#242a3e]">
            {assumption.id}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${risk.bg} ${risk.text} ${risk.border}`}
            >
              {assumption.risk} Risk
            </span>
            <span
              className={`flex items-center gap-1 text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${status.bg} ${status.text} ${status.border}`}
            >
              <StatusIcon className="w-3 h-3" />
              <span>{assumption.status.replace(/_/g, ' ')}</span>
            </span>
          </div>
        </div>

        {/* Claim & Reason */}
        <p className="text-sm font-medium text-slate-100 mb-2 leading-snug">
          "{assumption.claim}"
        </p>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          <strong className="text-slate-300 font-medium">Why it matters:</strong> {assumption.reason}
        </p>

        {/* Evidence Needed */}
        {assumption.evidenceNeeded && assumption.evidenceNeeded.length > 0 && (
          <div className="mb-3 bg-[#181c2a] p-2.5 rounded-md border border-[#242a3e]/60">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Evidence Required:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-300">
              {assumption.evidenceNeeded.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommended Action */}
      <div className="pt-2.5 border-t border-[#242a3e] flex items-center gap-1.5 text-xs text-blue-400">
        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          <strong>Next Action:</strong> {assumption.nextAction}
        </span>
      </div>
    </div>
  );
};
