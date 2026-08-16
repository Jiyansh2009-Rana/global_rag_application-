type BadgeVariant = 'default' | 'accent' | 'success' | 'danger' | 'warning' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]',
  accent:  'bg-[var(--accent-dim)] text-[var(--accent)] border-[color:rgba(45,212,191,0.25)]',
  success: 'bg-[var(--success-dim)] text-[var(--success)] border-[color:rgba(52,211,153,0.25)]',
  danger:  'bg-[var(--danger-dim)] text-[var(--danger)] border-[color:rgba(248,113,113,0.25)]',
  warning: 'bg-[var(--warning-dim)] text-[var(--warning)] border-[color:rgba(251,191,36,0.25)]',
  muted:   'bg-transparent text-[var(--muted)] border-[var(--border)]',
};

const roleVariantMap: Record<string, BadgeVariant> = {
  'Super Admin': 'danger',
  'Admin':       'warning',
  'User':        'accent',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  role?: string;
  className?: string;
}

export function Badge({ children, variant, role, className = '' }: BadgeProps) {
  const resolvedVariant = role ? (roleVariantMap[role] ?? 'accent') : (variant ?? 'default');
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-[0.68rem] font-semibold tracking-wide rounded-full
        border backdrop-blur-sm
        ${variantClasses[resolvedVariant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
