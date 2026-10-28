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
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let displayLabel = label || '';

  if (variant === 'risk' && risk) {
    displayLabel = displayLabel || `${risk.toUpperCase()} RISK`;
    if (risk === 'high') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (risk === 'medium') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
    }
  } else if (variant === 'clarity' && clarity) {
    displayLabel = displayLabel || clarity.toUpperCase();
    if (clarity === 'clear') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (clarity === 'incomplete') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    }
  } else if (variant === 'status' && status) {
    displayLabel = displayLabel || status.replace(/_/g, ' ').toUpperCase();
    if (status === 'supported') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (status === 'partially_supported') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    }
  } else if (variant === 'source' && source) {
    const cleanSource = source.replace(/_/g, ' ');
    displayLabel = displayLabel || cleanSource.toUpperCase();
    if (source === 'direct_observation') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
    } else if (source === 'user_reported' || source === 'user_reported_experience') {
      colorClasses = 'bg-teal-50 text-teal-700 border-teal-200 font-medium';
    } else if (source === 'interpretation') {
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200 font-medium';
    } else {
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
    }
  } else if (variant === 'verdict' && verdict) {
    const cleanVerdict = verdict.replace(/_/g, ' ').toUpperCase();
    displayLabel = displayLabel || cleanVerdict;
    if (cleanVerdict === 'EVIDENCE SUPPORTS FURTHER TESTING') {
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
    } else if (cleanVerdict === 'REVISE THE HYPOTHESIS') {
      colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
    } else {
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-mono tracking-wide uppercase font-medium select-none shadow-2xs ${colorClasses} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
};

export default Badge;
