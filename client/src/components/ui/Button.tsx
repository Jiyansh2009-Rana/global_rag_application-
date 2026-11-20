import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'solid-accent' | 'pill';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

/* ── Refined Modern Shapes & Gradients ──
   Primary: Sleek cyan-teal gradient pill with ambient glow
   Solid-accent: Bold vibrant modern capsule
   Secondary: Smooth graphite surface with subtle specular border
   Pill: Glassmorphic aerodynamic capsule
   Ghost: Minimal surface with soft hover highlight
*/
const variantStyles: Record<Variant, string> = {
  primary: `
    bg-gradient-to-r from-[#00C2DE] to-[#008ba3] text-[#000000] font-semibold rounded-xl
    border border-[#38e1f7]/40
    shadow-[0_4px_16px_rgba(0,194,222,0.3)]
    hover:shadow-[0_6px_24px_rgba(0,194,222,0.5)] hover:scale-[1.02] hover:brightness-105
    active:scale-[0.98] active:brightness-95
    focus:outline-none focus:ring-2 focus:ring-[#00C2DE]/50
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
  `,
  'solid-accent': `
    bg-[#00C2DE] text-[#000000] font-bold rounded-xl
    border border-[#00C2DE]
    shadow-[0_4px_16px_rgba(0,194,222,0.35)]
    hover:bg-[#15d4ef] hover:shadow-[0_6px_24px_rgba(0,194,222,0.55)] hover:scale-[1.02]
    active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-[#00C2DE]/50
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `,
  secondary: `
    bg-[#18191B] text-[#FFFFFF] font-medium rounded-xl
    border border-white/10
    shadow-[0_2px_8px_rgba(0,0,0,0.35)]
    hover:bg-[#222426] hover:border-white/25 hover:text-white hover:scale-[1.01]
    active:scale-[0.98] active:bg-[#141516]
    focus:outline-none focus:ring-2 focus:ring-[#00C2DE]/30
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `,
  pill: `
    bg-white/[0.04] backdrop-blur-md text-[#FFFFFF] font-medium rounded-full
    border border-white/15
    hover:border-[#00C2DE]/60 hover:text-[#00C2DE] hover:bg-[#00C2DE]/10 hover:scale-[1.02]
    active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-[#00C2DE]/40
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `,
  ghost: `
    bg-transparent text-[#9D9FA2] font-medium rounded-xl
    border border-transparent
    hover:text-white hover:bg-white/[0.07]
    active:scale-[0.98] active:bg-white/10
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `,
  danger: `
    bg-[rgba(220,53,69,0.12)] text-[#ff6b7d] font-semibold rounded-xl
    border border-[rgba(220,53,69,0.35)]
    hover:bg-[rgba(220,53,69,0.22)] hover:border-[#dc3545] hover:scale-[1.01]
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `,
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-[36px] px-4 text-[0.82rem]',
  md: 'h-[44px] px-5 text-[0.88rem]',
  lg: 'h-[50px] px-7 text-[0.95rem]',
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
      style,
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
          cursor-pointer select-none whitespace-nowrap shrink-0
          transition-all duration-200 ease-out
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        style={style}
        {...props}
      >
        {loading && (
          <span
            className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
            style={{ minWidth: '16px' }}
          />
        )}
        <span className={`inline-flex items-center justify-center gap-2 whitespace-nowrap ${loading ? 'opacity-80' : ''}`}>
          {children}
        </span>
      </button>
    );
  },
);

Button.displayName = 'Button';
