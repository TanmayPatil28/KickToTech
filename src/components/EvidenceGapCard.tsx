import type { FC } from 'react';
import { HelpCircle, Search } from 'lucide-react';
import type { EvidenceGap } from '../types/index.ts';

interface EvidenceGapCardProps {
  gap: EvidenceGap;
}

export const EvidenceGapCard: FC<EvidenceGapCardProps> = ({ gap }) => {
  return (
    <div className="bg-[#12151f] border border-[#242a3e] rounded-lg p-3.5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1.5 text-xs text-amber-400 font-mono uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Evidence Gap ({gap.importance} Priority)</span>
        </div>
        <p className="text-xs text-slate-200 mb-2 leading-relaxed">
          {gap.description}
        </p>
      </div>
      <div className="pt-2 border-t border-[#242a3e]/60 flex items-start gap-1.5 text-[11px] text-slate-400">
        <Search className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-300">How to investigate:</strong> {gap.howToInvestigate}
        </span>
      </div>
    </div>
  );
};
