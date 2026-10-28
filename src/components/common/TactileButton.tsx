import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface TactileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
}

export const TactileButton: FC<TactileButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2';

  const tactileMotion = disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]';

  const variantStyles = {
    primary:
      'bg-teal-700 hover:bg-teal-800 text-white shadow-xs hover:shadow-sm border border-teal-800/40 font-semibold',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 shadow-2xs',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 shadow-2xs',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
    outline:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 shadow-2xs',
    subtle:
      'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
  }[variant];

  // Touch targets >= 44px on mobile ergonomic standards
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-md gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 min-h-[44px] rounded-lg gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 min-h-[48px] rounded-lg gap-2.5 font-semibold',
  }[size];

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${tactileMotion} ${variantStyles} ${sizeStyles} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};

export default TactileButton;
