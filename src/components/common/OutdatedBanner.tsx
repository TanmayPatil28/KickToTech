import type { FC } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { TactileButton } from './TactileButton.tsx';

export interface OutdatedBannerProps {
  onReanalyze?: () => void;
  className?: string;
}

export const OutdatedBanner: FC<OutdatedBannerProps> = ({
  onReanalyze,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-900/40 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono">
            Analysis Outdated — Problem Statement Modified
          </h4>
          <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed font-sans">
            The core problem formulation was edited after the current analysis was generated. Existing assumptions, experiments, and evidence mappings may no longer reflect the revised hypothesis.
          </p>
        </div>
      </div>

      {onReanalyze && (
        <div className="shrink-0 flex items-center self-end sm:self-center">
          <TactileButton
            size="sm"
            variant="secondary"
            onClick={onReanalyze}
            icon={<RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
            className="border-amber-500/40 bg-amber-950/50 text-amber-200 hover:bg-amber-900/50 shadow-2xs"
          >
            Re-run Analysis
          </TactileButton>
        </div>
      )}
    </div>
  );
};

export default OutdatedBanner;
