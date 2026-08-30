import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useContextHooks';
import { useTheme } from '@/hooks/useContextHooks';
import { useIsMobile } from '@/hooks/useContextHooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GuideModal } from '@/components/guide/GuideModal';

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

/* ── Profile Dropdown (desktop) ── */
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
      <div className="glass-deep overflow-hidden" style={{ borderRadius: 18, padding: 0, boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,212,191,0.09)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-fg)', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 0 18px rgba(45,212,191,0.38)' }}>
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
        <div style={{ padding: '0.5rem 1.25rem' }}>
          {rows.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{label}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
          <Button variant="danger" size="sm" fullWidth onClick={handleSignOut}>Sign out</Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Mobile Profile Sheet (bottom sheet) ── */
function MobileProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, role, signOut } = useAuth();
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: 'var(--glass-bg-deep)',
              backdropFilter: 'var(--glass-blur-deep)',
              WebkitBackdropFilter: 'var(--glass-blur-deep)',
              borderRadius: '22px 22px 0 0',
              border: '1px solid var(--glass-border)',
              borderTopColor: 'rgba(0,210,200,0.25)',
              borderBottom: 'none',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.55)',
              paddingBottom: 'calc(var(--bottom-tab-h, 0px) + 0.75rem)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.20)' }} />
            </div>
            {/* Avatar row */}
            <div style={{ padding: '0.5rem 1.5rem 1rem', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-fg)', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 0 20px rgba(0,210,200,0.4)' }}>
                {user?.email?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                <div style={{ marginTop: 4 }}><Badge role={role ?? undefined}>{role ?? '—'}</Badge></div>
              </div>
            </div>
            {/* Info rows */}
            <div style={{ padding: '0.5rem 1.5rem' }}>
              {[
                { label: 'User ID',      value: user?.user_id ?? '—', mono: true },
                { label: 'Organisation', value: user?.org_id ?? '—' },
                { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: mono ? 'monospace' : 'inherit', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
            {/* Actions */}
            <div style={{ padding: '0.75rem 1.5rem 0' }}>
              <Button variant="danger" size="sm" fullWidth onClick={async () => { onClose(); await signOut(); }}>
                Sign out
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Mobile Bottom Tab Bar ── */
interface TabBarProps {
  navLinks: { key: string; label: string; icon: string }[];
  activePage: string;
  onNavigate: (page: string) => void;
  onProfileTap: () => void;
}

function MobileBottomTabBar({ navLinks, activePage, onNavigate, onProfileTap }: TabBarProps) {
  const allTabs = [
    ...navLinks,
    { key: '__profile__', label: 'Profile', icon: '◉' },
  ];

  return (
    <nav
      className="mobile-bottom-tab"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--navbar-bg)',
        backdropFilter: 'var(--navbar-blur)',
        WebkitBackdropFilter: 'var(--navbar-blur)',
        borderTop: '1px solid var(--navbar-border)',
        boxShadow: '0 -4px 28px rgba(0,0,0,0.45)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        alignItems: 'stretch',
      }}
    >
      {allTabs.map((tab) => {
        const isActive = tab.key !== '__profile__' && activePage === tab.key;
        const onTap = tab.key === '__profile__' ? onProfileTap : () => onNavigate(tab.key);

        return (
          <button
            key={tab.key}
            onClick={onTap}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4,
              padding: '10px 4px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              transition: 'color 0.18s ease',
              position: 'relative', minHeight: 56,
            }}
          >
            {/* Active indicator — glowing line at top */}
            {isActive && (
              <motion.div
                layoutId="tab-active-bar"
                style={{
                  position: 'absolute', top: 0, left: '18%', right: '18%',
                  height: 2, borderRadius: '0 0 2px 2px',
                  background: 'linear-gradient(90deg, var(--accent), var(--nebula))',
                  boxShadow: '0 0 10px var(--accent)',
                }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              />
            )}
            <span style={{
              fontSize: '1.1rem', lineHeight: 1,
              filter: isActive ? `drop-shadow(0 0 6px var(--accent))` : 'none',
              transition: 'filter 0.2s, transform 0.18s',
              transform: isActive ? 'scale(1.15)' : 'scale(1)',
              display: 'block',
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: '0.6rem', fontWeight: isActive ? 600 : 400,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              letterSpacing: isActive ? '0.02em' : 0,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
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
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const isMobile = useIsMobile(768);

  const navLinks = [
    { key: 'chat',   label: 'Chat',   icon: '◆' },
    { key: 'upload', label: 'Upload', icon: '↑' },
    ...(isAdmin ? [{ key: 'admin', label: 'Admin', icon: '⊞' }] : []),
    ...(isSuperAdmin ? [{ key: 'super-admin', label: 'S.Admin', icon: '⚡' }] : []),
  ];

  return (
    <>
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1.25rem', height: 60,
          background: 'var(--navbar-bg)',
          backdropFilter: 'var(--navbar-blur)',
          WebkitBackdropFilter: 'var(--navbar-blur)',
          borderBottom: '1px solid var(--navbar-border)',
          boxShadow: 'var(--navbar-shadow)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--accent-fg)', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 0 14px rgba(45,212,191,0.45)' }}>
            GR
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: '"Comfortaa", "Quicksand", "Outfit", sans-serif', lineHeight: 1 }}>
            Global<span style={{ color: 'var(--accent)' }}> RAG</span>
          </span>
        </div>

        {/* Desktop Nav links — hidden on mobile */}
        {onNavigate && !isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navLinks.map((link) => {
              const isActive = activePage === link.key;
              return (
                <motion.button
                  key={link.key}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onNavigate(link.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 0.9rem', borderRadius: 11,
                    fontSize: '0.78rem', fontWeight: 500,
                    cursor: 'pointer', border: 'none',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
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
                  <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>{link.icon}</span>
                  {link.label}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Org badge — desktop only */}
          {user?.org_id && !isMobile && (
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              org: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{user.org_id}</span>
            </span>
          )}

          {/* Guide button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setGuideOpen(true)}
            style={{
              height: 34, padding: isMobile ? '0 10px' : '0 12px', borderRadius: 11,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(0, 210, 200, 0.08)',
              border: '1px solid rgba(0, 210, 200, 0.22)',
              color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 500,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 210, 200, 0.16)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 210, 200, 0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 210, 200, 0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 210, 200, 0.22)';
            }}
            aria-label="Open platform guide"
          >
            <span style={{ fontSize: '0.85rem' }}>📖</span>
            {!isMobile && <span>Guide</span>}
          </motion.button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Avatar — desktop only (mobile uses bottom tab profile) */}
          {!isMobile && (
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
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      {onNavigate && (
        <MobileBottomTabBar
          navLinks={navLinks}
          activePage={activePage}
          onNavigate={onNavigate}
          onProfileTap={() => setMobileProfileOpen(true)}
        />
      )}

      {/* Mobile profile sheet */}
      <MobileProfileSheet
        open={mobileProfileOpen}
        onClose={() => setMobileProfileOpen(false)}
      />

      {/* Platform Guide Modal */}
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
