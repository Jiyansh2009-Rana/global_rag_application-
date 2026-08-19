import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { useAuth } from '@/hooks/useContextHooks';
import { useTheme } from '@/hooks/useContextHooks';
import { Navbar } from '@/components/layout/Navbar';
import { AuthPage } from '@/features/auth/AuthPage';
import { ChatPage } from '@/features/chat/ChatPage';
import { UploadPage } from '@/features/upload/UploadPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { SuperAdminPage } from '@/features/super-admin/SuperAdminPage';

import { GuideModal } from '@/components/guide/GuideModal';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

type Page = 'chat' | 'upload' | 'admin' | 'super-admin';

/* ── Loading screen ── */
function LoadingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.5rem' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.05em', color: '#021b18', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 0 32px rgba(45,212,191,0.45)', animation: 'pulseOpacity 2s ease-in-out infinite' }}>
        GR
      </div>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Loading session…</p>
    </div>
  );
}

/* ── Pre-auth Navbar (no profile, no nav, just logo + guide + theme toggle) ── */
function PreAuthNav() {
  const { theme, toggle } = useTheme();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.75rem', height: 60, background: 'var(--navbar-bg)', backdropFilter: 'var(--navbar-blur)', WebkitBackdropFilter: 'var(--navbar-blur)', borderBottom: '1px solid var(--navbar-border)', boxShadow: 'var(--navbar-shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.05em', color: '#021b18', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 0 14px rgba(45,212,191,0.45)' }}>
            GR
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: '"Comfortaa", "Quicksand", "Outfit", sans-serif' }}>
            Global<span style={{ color: 'var(--accent)' }}>RAG</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {/* Guide button */}
          <button
            onClick={() => setGuideOpen(true)}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0, 210, 200, 0.08)',
              border: '1px solid rgba(0, 210, 200, 0.22)',
              color: 'var(--accent)',
              fontSize: '0.78rem',
              fontWeight: 500,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 210, 200, 0.16)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 210, 200, 0.4)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 14px rgba(0, 210, 200, 0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 210, 200, 0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 210, 200, 0.22)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
            aria-label="Open platform guide"
          >
            <span style={{ fontSize: '0.85rem' }}>📖</span>
            <span>Guide</span>
          </button>

          {/* Theme toggle */}
          <button onClick={toggle} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </nav>
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}

/* ── App Shell (inside all providers) ── */
function AppShell() {
  const { user, isAdmin, isSuperAdmin, isLoading } = useAuth();
  const [page, setPage] = useState<Page>('chat');

  if (isLoading) return <LoadingScreen />;

  if (!user) {
    return (
      <>
        <PreAuthNav />
        <AuthPage />
      </>
    );
  }

  const pageMap: Record<Page, React.ReactNode> = {
    chat:          <ChatPage />,
    upload:        <UploadPage />,
    admin:         isAdmin ? <AdminPage /> : <ChatPage />,
    'super-admin': isSuperAdmin ? <SuperAdminPage /> : <ChatPage />,
  };

  return (
    <>
      <Navbar activePage={page} onNavigate={(p) => setPage(p as Page)} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {pageMap[page]}
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
}

/* ── Root Providers ── */
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <div className="glow-tl" />
          <div className="glow-br" />
          <div className="glow-mid" />
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
