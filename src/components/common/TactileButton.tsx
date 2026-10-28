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
    'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090c15] tracking-tight';

  const tactileMotion = disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]';

  const variantStyles = {
    primary:
      'bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold border border-teal-400/80 shadow-sm focus-visible:ring-teal-400',
    secondary:
      'bg-[#151b2e] hover:bg-[#1c243e] text-slate-200 border border-[#263152] hover:border-slate-500 shadow-2xs focus-visible:ring-slate-400',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-2xs focus-visible:ring-rose-400',
    ghost:
      'bg-transparent hover:bg-[#151b2e] text-slate-400 hover:text-slate-100 focus-visible:ring-slate-400',
    outline:
      'bg-transparent hover:bg-[#151b2e] text-slate-300 border border-[#212a45] hover:border-slate-500 shadow-2xs focus-visible:ring-slate-400',
    subtle:
      'bg-[#151b2e]/70 hover:bg-[#1c243e] text-slate-300 border border-[#212a45] focus-visible:ring-slate-400',
  }[variant];

  // Touch targets >= 44px on mobile ergonomic standards
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-lg gap-1.5 font-medium',
    md: 'text-xs sm:text-sm px-4 py-2 min-h-[44px] rounded-xl gap-2 font-medium',
    lg: 'text-sm sm:text-base px-5 py-2.5 min-h-[48px] rounded-xl gap-2.5 font-semibold',
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
