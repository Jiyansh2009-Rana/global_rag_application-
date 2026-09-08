import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { useAuth } from '@/hooks/useContextHooks';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { AuthPage } from '@/features/auth/AuthPage';
import { ChatPage } from '@/features/chat/ChatPage';
import { UploadPage } from '@/features/upload/UploadPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { SuperAdminPage } from '@/features/super-admin/SuperAdminPage';
import { SpecShowcasePage } from '@/features/spec-showcase/SpecShowcasePage';
import { GuideModal } from '@/components/guide/GuideModal';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

type Page = 'overview' | 'chat' | 'upload' | 'admin' | 'super-admin';

/* ── Loading screen ── */
function LoadingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.5rem', background: '#07080a' }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', fontWeight: 900, letterSpacing: '0.05em', color: '#04121f', background: 'linear-gradient(135deg, #46b7ff, #8bf3e6)', boxShadow: '0 0 32px rgba(70,183,255,0.45)', animation: 'pulseOpacity 2s ease-in-out infinite' }}>
        RA
      </div>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.08)', borderTopColor: '#46b7ff', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: '0.8rem', color: '#5a5852', fontFamily: 'Space Mono, monospace' }}>Initializing Rag-Agent…</p>
    </div>
  );
}

/* ── Pre-auth Navbar (Strictly for unauthenticated users, No Theme Toggle) ── */
function PreAuthNav({ activePage, onNavigate }: { activePage: Page; onNavigate: (page: Page) => void }) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,8,10,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <nav style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 1.5rem', height: 58 }}>
            {/* Logo */}
            <div onClick={() => onNavigate('overview')} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', flexShrink: 0 }}>
              <span style={{ display: 'inline-flex', width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: 'linear-gradient(135deg, #46b7ff, #8bf3e6)', fontSize: '0.58rem', fontWeight: 900, color: '#04121f', letterSpacing: '0.04em', boxShadow: '0 0 12px rgba(70,183,255,0.3)' }}>RA</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.025em', fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', color: '#e8e6e0' }}>
                Rag<span style={{ color: '#9a9690' }}>-Agent</span>
              </span>
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => onNavigate(activePage === 'overview' ? 'chat' : 'overview')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 9999, fontSize: '0.85rem', fontWeight: 500, fontFamily: 'Inter, sans-serif', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: activePage === 'overview' ? 'rgba(70,183,255,0.1)' : 'transparent', color: activePage === 'overview' ? '#46b7ff' : '#9a9690', transition: 'all 0.2s ease' }}
              >
                {activePage === 'overview' ? '⚡ Sign In' : '▲ Overview'}
              </button>
              <button
                onClick={() => setGuideOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9999, background: 'rgba(139,243,230,0.08)', border: '1px solid rgba(139,243,230,0.18)', color: '#8bf3e6', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                aria-label="Open guide"
              >
                <span>📖</span>
                <span>Guide</span>
              </button>
            </div>
          </nav>
        </div>
      </header>
      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}

/* ── App Shell (Root Routing & Auth Gating) ── */
function AppShell() {
  const { user, isAdmin, isSuperAdmin, isLoading } = useAuth();
  const [page, setPage] = useState<Page>('overview');

  // When user logs in, bypass Overview and default directly to Chat
  useEffect(() => {
    if (user && page === 'overview') {
      setPage('chat');
    }
  }, [user, page]);

  if (isLoading) return <LoadingScreen />;

  // 1. Unauthenticated user flow: Overview/Landing page or Login page
  if (!user) {
    if (page === 'overview') {
      return (
        <SpecShowcasePage onOpenApp={(targetPage) => setPage((targetPage as Page) || 'chat')} />
      );
    }
    return (
      <>
        <PreAuthNav activePage={page} onNavigate={(p) => setPage(p)} />
        <AuthPage />
      </>
    );
  }

  // 2. Authenticated user workspace: Overview is bypassed. Responsive Hover-reveal sidebar + content
  const activeAuthPage = page === 'overview' ? 'chat' : page;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#07080a', color: '#e8e6e0', position: 'relative' }}>
      {/* Responsive Hover-Reveal & Mobile Drawer Sidebar */}
      <Sidebar
        activePage={activeAuthPage}
        onNavigate={(p) => setPage(p as Page)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <Navbar
          activePage={activeAuthPage}
          onNavigate={(p) => setPage(p as Page)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((o) => !o)}
        />
        
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: activeAuthPage === 'chat' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0, height: '100%' }}>
            <ChatPage />
          </div>
          <div style={{ display: activeAuthPage === 'upload' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <UploadPage />
          </div>
          {isAdmin && (
            <div style={{ display: activeAuthPage === 'admin' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
              <AdminPage />
            </div>
          )}
          {isSuperAdmin && (
            <div style={{ display: activeAuthPage === 'super-admin' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
              <SuperAdminPage />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Root Providers ── */
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}