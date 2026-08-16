import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useContextHooks';
import { useTheme } from '@/hooks/useContextHooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/* ── Theme Toggle ── */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={toggle}
      className="flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer"
      style={{
        width: 34, height: 34,
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--muted)',
        fontSize: '1rem',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
        (e.currentTarget as HTMLElement).style.color = 'var(--text)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </motion.button>
  );
}

/* ── Profile Dropdown ── */
function ProfileDropdown({ onClose }: { onClose: () => void }) {
  const { user, role, signOut } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSignOut = async () => { onClose(); await signOut(); };

  const rows = [
    { label: 'User ID',      value: <span className="font-mono text-[0.67rem] text-[var(--muted)] truncate max-w-[160px] block">{user?.user_id ?? '—'}</span> },
    { label: 'Organisation', value: user?.org_id ?? '—' },
    { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 26, stiffness: 380 }}
      className="absolute top-[calc(100%+10px)] right-0 z-[300]"
      style={{ width: 288 }}
    >
      {/* The glass panel */}
      <div
        className="glass-deep overflow-hidden"
        style={{
          borderRadius: 18,
          padding: 0,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,212,191,0.09)',
        }}
      >
        {/* Avatar header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.875rem',
            padding: '1.25rem 1.25rem 1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-fg)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              boxShadow: '0 0 18px rgba(45,212,191,0.38)',
            }}
          >
            {user?.email?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
            <div style={{ marginTop: '4px' }}>
              <Badge role={role ?? undefined}>{role ?? '—'}</Badge>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div style={{ padding: '0.5rem 1.25rem' }}>
          {rows.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{label}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
          <Button variant="danger" size="sm" fullWidth onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Navbar ── */
interface NavbarProps {
  activePage: string;
  onNavigate?: (page: string) => void;
}

export function Navbar({ activePage, onNavigate }: NavbarProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const navLinks = [
    { key: 'chat',   label: 'Chat',   icon: '◆' },
    { key: 'upload', label: 'Upload', icon: '↑' },
    ...(isAdmin ? [{ key: 'admin', label: 'Admin', icon: '⊞' }] : []),
    ...(isSuperAdmin ? [{ key: 'super-admin', label: 'Super Admin', icon: '⚡' }] : []),
  ];

  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.75rem', height: 60,
        background: 'var(--navbar-bg)',
        backdropFilter: 'var(--navbar-blur)',
        WebkitBackdropFilter: 'var(--navbar-blur)',
        borderBottom: '1px solid var(--navbar-border)',
        boxShadow: 'var(--navbar-shadow)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div
          style={{
            width: 30, height: 30, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.05em',
            color: 'var(--accent-fg)',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            boxShadow: '0 0 14px rgba(45,212,191,0.45)',
          }}
        >
          GR
        </div>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.025em', fontFamily: '"Space Grotesk", sans-serif' }}>
          Global<span style={{ color: 'var(--accent)' }}>RAG</span>
        </span>
      </div>

      {/* Nav links */}
      {onNavigate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {navLinks.map((link) => {
            const isActive = activePage === link.key;
            return (
              <motion.button
                key={link.key}
                whileTap={{ scale: 0.94 }}
                onClick={() => onNavigate(link.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.375rem 0.875rem',
                  borderRadius: 10,
                  fontSize: '0.78rem', fontWeight: 500,
                  cursor: 'pointer', border: 'none',
                  transition: 'all 0.18s ease',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  outline: isActive ? '1px solid var(--border-accent)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
                  }
                }}
              >
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{link.icon}</span>
                {link.label}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {user?.org_id && (
          <span className="hide-mobile" style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
            org: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{user.org_id}</span>
          </span>
        )}
        <ThemeToggle />
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setProfileOpen((p) => !p)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-fg)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              border: '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.22s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(45,212,191,0.22), 0 0 18px rgba(45,212,191,0.3)';
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
          >
            {user?.email?.charAt(0).toUpperCase() ?? '?'}
          </motion.button>
          <AnimatePresence>
            {profileOpen && <ProfileDropdown onClose={() => setProfileOpen(false)} />}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
