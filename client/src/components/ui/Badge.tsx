type BadgeVariant = 'default' | 'accent' | 'success' | 'danger' | 'warning' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#1A1A1B] text-[#FFFFFF] border-[rgba(255,255,255,0.12)]',
  accent:  'bg-[#000000] text-[#00C2DE] border-[rgba(0,194,222,0.35)]',
  success: 'bg-[rgba(25,135,84,0.15)] text-[#20c997] border-[rgba(25,135,84,0.35)]',
  danger:  'bg-[rgba(220,53,69,0.15)] text-[#ff6b6b] border-[rgba(220,53,69,0.35)]',
  warning: 'bg-[rgba(234,179,8,0.15)] text-[#fcc419] border-[rgba(234,179,8,0.35)]',
  muted:   'bg-transparent text-[#9D9FA2] border-[rgba(255,255,255,0.08)]',
};

const roleVariantMap: Record<string, BadgeVariant> = {
  'Super Admin': 'danger',
  'Admin':       'accent',
  'User':        'default',
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
        text-[0.72rem] font-semibold tracking-wide rounded-full
        border font-['Open_Sans']
        ${variantClasses[resolvedVariant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
