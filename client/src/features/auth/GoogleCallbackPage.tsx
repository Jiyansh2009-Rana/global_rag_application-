/**
 * GoogleCallbackPage.tsx
 *
 * Step 3 → 4: Google Authorization Server redirects the user back here
 * after they grant (or deny) consent on the Google login/consent screen.
 *
 * URL format on arrival:
 *   /auth/callback/google?code=<authorization_code>&state=<csrf_token>
 *
 * This component:
 *  1. Reads the short-lived `authorization_code` from the query string.
 *  2. Calls `signInWithGoogle` → backend `/api/v1/auth/google/exchange`
 *     which performs Steps 4, 5, 6, and 7 (token exchange + user resolution).
 *  3. On success → navigates the user into the authenticated app shell.
 *  4. On error  → navigates back to /auth with an error message in state.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useContextHooks';
import { Logo } from '@/components/common/Logo';

interface GoogleCallbackPageProps {
  /** Called when OAuth completes successfully — parent navigates to chat */
  onSuccess: () => void;
  /** Called with an error message when OAuth fails */
  onError: (errorMessage: string) => void;
}

export function GoogleCallbackPage({ onSuccess, onError }: GoogleCallbackPageProps) {
  const { signInWithGoogle } = useAuth();

  // Guard against double-execution in React Strict Mode (mounts twice in dev)
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    // Parse the Google authorization code from the URL query parameters
    const urlSearchParams = new URLSearchParams(window.location.search);
    const receivedAuthorizationCode = urlSearchParams.get('code');
    const googleErrorParam = urlSearchParams.get('error');

    // Handle explicit denial: user clicked "Deny" on the Google consent screen
    if (googleErrorParam) {
      onError(
        googleErrorParam === 'access_denied'
          ? 'Google sign-in was cancelled. Please try again.'
          : `Google authentication error: ${googleErrorParam}`,
      );
      return;
    }

    // No code present — something went wrong with the redirect
    if (!receivedAuthorizationCode) {
      onError('No authorization code received from Google. Please try again.');
      return;
    }

    // The redirect_uri MUST match exactly what was registered in Google Cloud Console
    // and what was sent in the initial authorization request (Step 2)
    const currentRedirectUri = `${window.location.origin}/auth/callback/google`;

    // Step 4: Exchange authorization code → platform JWT cookies
    signInWithGoogle(receivedAuthorizationCode, currentRedirectUri)
      .then(() => {
        onSuccess();
      })
      .catch((exchangeError: unknown) => {
        const errorDetail =
          exchangeError instanceof Error
            ? exchangeError.message
            : 'Google authentication failed. Please try again.';
        onError(errorDetail);
      });
  }, [signInWithGoogle, onSuccess, onError]);

  // Loading state displayed while the backend completes the token exchange
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
        color: '#FFFFFF',
      }}
    >
      <Logo size="lg" showText={false} />

      {/* Spinner */}
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

      <p
        style={{
          fontSize: '0.9rem',
          color: '#9D9FA2',
          fontFamily: '"Open Sans", sans-serif',
          textAlign: 'center',
          maxWidth: 300,
        }}
      >
        Completing Google sign-in…
        <br />
        <span style={{ fontSize: '0.78rem', color: '#6C757D' }}>
          Verifying identity and loading your workspace.
        </span>
      </p>
    </div>
  );
}
