import type { FC, ReactNode } from 'react';
import type {
  ClarityRating,
  RiskLevel,
  AssumptionStatus,
  SourceType,
  VerdictCategory,
} from '../../types/index.ts';

export interface BadgeProps {
  variant?: 'neutral' | 'risk' | 'clarity' | 'status' | 'source' | 'verdict';
  risk?: RiskLevel;
  clarity?: ClarityRating;
  status?: AssumptionStatus;
  source?: SourceType | string;
  verdict?: VerdictCategory | string;
  label?: string;
  icon?: ReactNode;
  className?: string;
}

export const Badge: FC<BadgeProps> = ({
  variant = 'neutral',
  risk,
  clarity,
  status,
  source,
  verdict,
  label,
  icon,
  className = '',
}) => {
  let colorClasses = 'bg-slate-800/80 text-slate-300 border-slate-700/80';
  let displayLabel = label || '';

  if (variant === 'risk' && risk) {
    displayLabel = displayLabel || `${risk.toUpperCase()} RISK`;
    if (risk === 'high') {
      colorClasses = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    } else if (risk === 'medium') {
      colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    } else {
      colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
    }
  } else if (variant === 'clarity' && clarity) {
    displayLabel = displayLabel || clarity.toUpperCase();
    if (clarity === 'clear') {
      colorClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    } else if (clarity === 'incomplete') {
      colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    } else {
      colorClasses = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    }
  } else if (variant === 'status' && status) {
    displayLabel = displayLabel || status.replace(/_/g, ' ').toUpperCase();
    if (status === 'supported') {
      colorClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    } else if (status === 'partially_supported') {
      colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    } else {
      colorClasses = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    }
  } else if (variant === 'source' && source) {
    const cleanSource = source.replace(/_/g, ' ');
    displayLabel = displayLabel || cleanSource.toUpperCase();
    if (source === 'direct_observation') {
      colorClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium';
    } else if (source === 'user_reported' || source === 'user_reported_experience') {
      colorClasses = 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-medium';
    } else if (source === 'interpretation') {
      colorClasses = 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-medium';
    } else {
      colorClasses = 'bg-slate-800 text-slate-300 border-slate-700 font-medium';
    }
  } else if (variant === 'verdict' && verdict) {
    const cleanVerdict = verdict.replace(/_/g, ' ').toUpperCase();
    displayLabel = displayLabel || cleanVerdict;
    if (cleanVerdict === 'EVIDENCE SUPPORTS FURTHER TESTING') {
      colorClasses = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold';
    } else if (cleanVerdict === 'REVISE THE HYPOTHESIS') {
      colorClasses = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold';
    } else {
      colorClasses = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono tracking-tight uppercase select-none ${colorClasses} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
};

export default Badge;
