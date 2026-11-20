import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { ChatProvider } from '@/features/chat/ChatContext';
import { useAuth } from '@/hooks/useContextHooks';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { AuthPage } from '@/features/auth/AuthPage';
import { ChatPage } from '@/features/chat/ChatPage';
import { UploadPage } from '@/features/upload/UploadPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { SuperAdminPage } from '@/features/super-admin/SuperAdminPage';
import { SpecShowcasePage } from '@/features/spec-showcase/SpecShowcasePage';
import { GoogleCallbackPage } from '@/features/auth/GoogleCallbackPage';
import { GuideModal } from '@/components/guide/GuideModal';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { BookOpen, LogIn, LayoutDashboard } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

type Page = 'overview' | 'chat' | 'upload' | 'admin' | 'super-admin';

/* ── Loading screen ── */
function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1.5rem',
        background: '#000000',
      }}
    >
      <div style={{ animation: 'pulseOpacity 2s ease-in-out infinite' }}>
        <Logo size="lg" showText={false} />
      </div>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,0.1)',
          borderTopColor: '#00C2DE',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: '0.82rem', color: '#9D9FA2', fontFamily: 'Space Mono, monospace' }}>
        Initializing Askmydocsai…
      </p>
    </div>
  );
}

/* ── Pre-auth Navbar (Strictly for unauthenticated users) ── */
function PreAuthNav({ activePage, onNavigate }: { activePage: Page; onNavigate: (page: Page) => void }) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: '#000000',
            boxShadow: '0 2px 6px rgba(0,0,0,0.24)',
          }}
        >
          <nav
            style={{
              maxWidth: 1440,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '0 2rem',
              height: 64,
            }}
          >
            {/* Logo */}
            <div
              onClick={() => onNavigate('overview')}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <Logo size="md" showText={true} />
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              <Button
                variant={activePage === 'overview' ? 'primary' : 'pill'}
                size="sm"
                onClick={() => onNavigate(activePage === 'overview' ? 'chat' : 'overview')}
                style={{ padding: '0 16px', flexShrink: 0 }}
              >
                {activePage === 'overview' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <LogIn size={13} />
                    <span>Sign in</span>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <LayoutDashboard size={13} />
                    <span>Overview</span>
                  </span>
                )}
              </Button>
              <Button
                variant="pill"
                size="sm"
                onClick={() => setGuideOpen(true)}
                aria-label="Open guide"
                style={{ padding: '0 16px', flexShrink: 0 }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={13} style={{ color: 'var(--muted)' }} />
                  <span>Guide</span>
                </span>
              </Button>
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Detect Google OAuth callback: /auth/callback/google?code=...
  // This must be checked BEFORE any auth-gated routing logic
  const isGoogleCallback = window.location.pathname === '/auth/callback/google';

  // When user logs in, bypass Overview and default directly to Chat
  useEffect(() => {
    if (user && page === 'overview') {
      setPage('chat');
    }
  }, [user, page]);

  if (isLoading && !isGoogleCallback) return <LoadingScreen />;

  // ── Google OAuth Callback Route ──
  // Intercept the /auth/callback/google path to complete the token exchange.
  // This renders for unauthenticated users arriving from Google's consent redirect.
  if (isGoogleCallback && !user) {
    return (
      <GoogleCallbackPage
        onSuccess={() => {
          // Clean up the OAuth callback URL — replace history entry so the
          // user cannot navigate back to a stale ?code= URL
          window.history.replaceState({}, '', '/');
          setPage('chat');
        }}
        onError={(errorMessage) => {
          // Clear the callback URL and show auth page with error state
          window.history.replaceState({}, '', '/');
          // The page state will show AuthPage; error surfaces via console for now
          console.error('Google OAuth callback error:', errorMessage);
          setPage('chat'); // triggers auth redirect since user is null
        }}
      />
    );
  }

  // 1. Unauthenticated user flow: Overview/Landing page or Login page
  if (!user) {
    if (page === 'overview') {
      return (
        <SpecShowcasePage onOpenApp={(targetPage) => setPage((targetPage as Page) || 'chat')} />
      );
    }
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column' }}>
        <PreAuthNav activePage={page} onNavigate={(p) => setPage(p)} />
        <AuthPage />
      </div>
    );
  }

  // 2. Authenticated user workspace: Overview is bypassed. Responsive Hover-reveal sidebar + content
  const activeAuthPage = page === 'overview' ? 'chat' : page;

  return (
    <ChatProvider onNavigateToChat={() => setPage('chat')}>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#000000', color: '#FFFFFF', position: 'relative' }}>
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
    </ChatProvider>
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
