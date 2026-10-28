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
  let colorClasses = 'bg-[#181c2a] text-slate-300 border-[#242a3e]';
  let displayLabel = label || '';

  if (variant === 'risk' && risk) {
    displayLabel = displayLabel || `${risk.toUpperCase()} RISK`;
    if (risk === 'high') {
      colorClasses = 'bg-rose-950/50 text-rose-300 border-rose-800/60';
    } else if (risk === 'medium') {
      colorClasses = 'bg-amber-950/50 text-amber-300 border-amber-800/60';
    } else {
      colorClasses = 'bg-slate-900 text-slate-400 border-slate-700/60';
    }
  } else if (variant === 'clarity' && clarity) {
    displayLabel = displayLabel || clarity.toUpperCase();
    if (clarity === 'clear') {
      colorClasses = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';
    } else if (clarity === 'incomplete') {
      colorClasses = 'bg-amber-950/50 text-amber-300 border-amber-800/60';
    } else {
      colorClasses = 'bg-rose-950/50 text-rose-300 border-rose-800/60';
    }
  } else if (variant === 'status' && status) {
    displayLabel = displayLabel || status.replace(/_/g, ' ').toUpperCase();
    if (status === 'supported') {
      colorClasses = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';
    } else if (status === 'partially_supported') {
      colorClasses = 'bg-amber-950/50 text-amber-300 border-amber-800/60';
    } else {
      colorClasses = 'bg-rose-950/50 text-rose-300 border-rose-800/60';
    }
  } else if (variant === 'source' && source) {
    const cleanSource = source.replace(/_/g, ' ');
    displayLabel = displayLabel || cleanSource.toUpperCase();
    if (source === 'direct_observation') {
      colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50';
    } else if (source === 'user_reported' || source === 'user_reported_experience') {
      colorClasses = 'bg-blue-950/40 text-blue-300 border-blue-800/50';
    } else if (source === 'interpretation') {
      colorClasses = 'bg-purple-950/40 text-purple-300 border-purple-800/50';
    } else {
      colorClasses = 'bg-slate-900 text-slate-400 border-slate-700/50';
    }
  } else if (variant === 'verdict' && verdict) {
    const cleanVerdict = verdict.replace(/_/g, ' ').toUpperCase();
    displayLabel = displayLabel || cleanVerdict;
    if (cleanVerdict === 'EVIDENCE SUPPORTS FURTHER TESTING') {
      colorClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-700/80';
    } else if (cleanVerdict === 'REVISE THE HYPOTHESIS') {
      colorClasses = 'bg-rose-950/60 text-rose-300 border-rose-700/80';
    } else {
      colorClasses = 'bg-amber-950/60 text-amber-300 border-amber-700/80';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-mono tracking-wider uppercase font-medium select-none ${colorClasses} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
};

export default Badge;
