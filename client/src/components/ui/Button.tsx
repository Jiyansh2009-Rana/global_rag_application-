import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: `
    bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)]
    text-[#031f1c] font-semibold
    shadow-[0_4px_16px_rgba(45,212,191,0.25),0_1px_0_rgba(255,255,255,0.15)_inset]
    hover:brightness-110 hover:-translate-y-0.5
    hover:shadow-[0_8px_28px_rgba(45,212,191,0.38)]
    active:translate-y-0 active:shadow-sm
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    disabled:filter-none disabled:shadow-none
  `,
  secondary: `
    bg-[var(--surface-2)] text-[var(--text)]
    border border-[var(--border)]
    hover:bg-[var(--surface-hover)] hover:border-[var(--accent)]
    active:brightness-90
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  ghost: `
    bg-transparent text-[var(--muted)]
    border border-[var(--border)]
    hover:text-[var(--text)] hover:bg-[var(--surface-hover)]
    hover:border-[color:rgba(45,212,191,0.3)]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  danger: `
    bg-[var(--danger-dim)] text-[var(--danger)]
    border border-[color:rgba(248,113,113,0.25)]
    hover:bg-[color:rgba(248,113,113,0.15)]
    hover:border-[color:rgba(248,113,113,0.5)]
    hover:shadow-[0_0_16px_rgba(248,113,113,0.12)]
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-[var(--radius-sm)]',
  lg: 'px-6 py-3.5 text-sm rounded-[var(--radius-md)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      disabled,
      className = '',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={`
          relative inline-flex items-center justify-center gap-2
          font-medium transition-all duration-[220ms] ease-[var(--ease-smooth)]
          cursor-pointer select-none overflow-hidden
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Shine overlay for primary */}
        {variant === 'primary' && (
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
            }}
          />
        )}
        {loading && (
          <span
            className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
            style={{ minWidth: '14px' }}
          />
        )}
        <span className={loading ? 'opacity-80' : ''}>{children}</span>
      </button>
    );
  },
);

Button.displayName = 'Button';
