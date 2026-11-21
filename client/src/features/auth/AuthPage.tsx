import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useContextHooks';
import { useIsMobile } from '@/hooks/useContextHooks';
import { parseApiError, isRoleConflictError } from '@/api/client';
import {
  LoginPayloadSchema,
  SignupPayloadSchema,
  VerifySignupPayloadSchema,
  ForgotPasswordPayloadSchema,
  ResetPasswordPayloadSchema,
} from '@/api/types';
import type {
  LoginPayload,
  SignupPayload,
  VerifySignupPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput, Select } from '@/components/ui/Input';
import { Logo } from '@/components/common/Logo';
import { authApi } from '@/api/auth';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/* ── Verified Platform Capabilities (No Fake Numbers) ── */
const CAPABILITIES = [
  {
    tag: 'HYBRID RETRIEVAL',
    title: 'Dense Vector & BM25 Keyword Search',
    desc: 'Combines semantic deep embeddings with lexical matching for deterministic accuracy across contracts, reports, and technical manuals.',
  },
  {
    tag: 'SECURITY & GOVERNANCE',
    title: 'Strict Row-Level Tenant Isolation',
    desc: 'Super Admin, Admin, and User role-based boundaries ensure organization data remains strictly quarantined and auditable.',
  },
  {
    tag: 'STREAMING PIPELINE',
    title: 'Real-Time SSE Generation',
    desc: 'Token-by-token streaming responses with explicit page-level citations, similarity scoring, and source telemetry.',
  },
  {
    tag: 'DYNAMIC DELTA INDEXING',
    title: 'Intelligent Ingestion & Deduplication',
    desc: 'Content hashing and delta tracking index only modified pages, avoiding redundant embedding computation.',
  },
];

/* ── Alert Box Component (Unslopped: quiet hairline, semantic tint, line icons) ── */
function AlertBox({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const isErr = type === 'error';
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        fontSize: '0.82rem',
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 9,
        background: isErr ? 'rgba(245, 158, 11, 0.07)' : 'rgba(76, 195, 138, 0.07)',
        border: `1px solid ${isErr ? 'rgba(245, 158, 11, 0.22)' : 'rgba(76, 195, 138, 0.22)'}`,
        color: isErr ? '#f59e0b' : '#4cc38a',
        fontFamily: '"Open Sans", sans-serif',
      }}
    >
      {isErr ? (
        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2, color: '#f59e0b' }} />
      ) : (
        <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2, color: '#4cc38a' }} />
      )}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

/* ── 6-Digit OTP Box Component ── */
interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

function OtpInputBoxes({ value, onChange, disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join('');
    onChange(combined);

    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const focusIndex = Math.min(pasted.length, 5);
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '14px 0' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 46,
            height: 54,
            textAlign: 'center',
            fontSize: '1.35rem',
            fontWeight: 700,
            fontFamily: '"Space Mono", monospace',
            background: '#000000',
            border: digits[i] ? '1px solid #00C2DE' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: 3,
            color: '#FFFFFF',
            caretColor: '#00C2DE',
            outline: 'none',
            boxShadow: digits[i] ? '0 0 10px rgba(0,194,222,0.25)' : 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 100ms ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#00C2DE';
            e.currentTarget.style.boxShadow = '0 0 0 0.25rem rgba(0, 194, 222, 0.25)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onBlur={(e) => {
            if (!digits[i]) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.boxShadow = 'none';
            }
            e.currentTarget.style.transform = 'none';
          }}
        />
      ))}
    </div>
  );
}

/* ── Google OAuth: Divider between email/password and Google sign-in ── */
function GoogleOAuthDivider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '4px 0',
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      <span
        style={{
          fontSize: '0.72rem',
          color: '#6C757D',
          fontFamily: '"Open Sans", sans-serif',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        or continue with
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
    </div>
  );
}

/* ── Google OAuth: Step 1 & 2 — Initiates the authorization redirect ──
 *
 * When clicked:
 *  1. Calls the backend GET /auth/google/authorize-url to get the Google
 *     consent URL (with client_id, scopes, redirect_uri, CSRF state token).
 *  2. Redirects the user's browser to that URL.
 *  3. After user grants consent, Google redirects to /auth/callback/google?code=...
 *     which is handled by GoogleCallbackPage (Steps 4–7).
 */
function GoogleSignInButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Build the redirect URI that Google will send the authorization code back to
  const targetCallbackUri = `${window.location.origin}/auth/callback/google`;

  const handleGoogleSignIn = useCallback(async () => {
    setIsRedirecting(true);
    setGoogleError(null);
    try {
      // Step 2: Ask backend to generate the full Google authorization URL
      const googleAuthUrlResponse = await authApi.getGoogleAuthUrl(targetCallbackUri);
      // Redirect the browser to Google's consent screen
      window.location.href = googleAuthUrlResponse.authorization_url;
    } catch (redirectError) {
      setIsRedirecting(false);
      setGoogleError('Failed to connect to Google. Please try again.');
      console.error('Google auth URL fetch failed:', redirectError);
    }
  }, [targetCallbackUri]);

  return (
    <div>
      {googleError && (
        <div style={{ marginBottom: 8 }}>
          <AlertBox type="error">{googleError}</AlertBox>
        </div>
      )}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isRedirecting}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          padding: '10px 16px',
          background: isRedirecting ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 6,
          color: isRedirecting ? '#6C757D' : '#FFFFFF',
          fontSize: '0.88rem',
          fontWeight: 500,
          fontFamily: '"Open Sans", sans-serif',
          cursor: isRedirecting ? 'not-allowed' : 'pointer',
          transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          if (!isRedirecting) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(0, 194, 222, 0.35)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
        }}
      >
        {/* Google "G" SVG icon */}
        {isRedirecting ? (
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              borderTopColor: '#00C2DE',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>{isRedirecting ? 'Redirecting to Google…' : 'Continue with Google'}</span>
      </button>
    </div>
  );
}

/* ── Login Form (With Eye Password Option) ── */
function LoginForm({
  initialEmail = '',
  onForgotPassword,
}: {
  initialEmail?: string;
  onForgotPassword: () => void;
}) {
  const { signIn } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginPayload>({
      resolver: zodResolver(LoginPayloadSchema),
      defaultValues: { email: initialEmail, password: '' },
    });

  const onSubmit = async (data: LoginPayload) => {
    setApiError(null);
    try {
      await signIn(data.email, data.password);
    } catch (err) {
      setApiError(parseApiError(err, 'auth'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {apiError && <AlertBox type="error">{apiError}</AlertBox>}

      <Input
        label="Work Email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <div>
        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            type="button"
            onClick={onForgotPassword}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.78rem',
              color: '#00C2DE',
              cursor: 'pointer',
              fontFamily: '"Open Sans", sans-serif',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              transition: 'color 140ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#00C2DE')}
          >
            Forgot password?
          </button>
        </div>
      </div>

      <Button type="submit" variant="primary" loading={isSubmitting} fullWidth>
        Sign in to Workspace →
      </Button>

      {/* ── Google OAuth Divider ── */}
      <GoogleOAuthDivider />

      {/* ── Google Sign-In Button (Step 1 → redirects to Google consent) ── */}
      <GoogleSignInButton />
    </form>
  );
}

/* ── Password Strength Calculator & Animated Meter (/improve-animations) ── */
interface PasswordRule {
  key: string;
  label: string;
  met: boolean;
}

interface PasswordStrengthDetails {
  score: number;
  percentage: number;
  label: string;
  color: string;
  description: string;
  rules: PasswordRule[];
}

function evaluatePasswordStrength(password: string): PasswordStrengthDetails {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const rules: PasswordRule[] = [
    { key: 'length', label: '8+ chars', met: hasMinLength },
    { key: 'mixed', label: 'A-Z & a-z', met: hasUpper && hasLower },
    { key: 'number', label: '0-9 number', met: hasNumber },
    { key: 'special', label: 'Special symbol', met: hasSpecial },
  ];

  let rawPoints = 0;
  if (hasMinLength) rawPoints++;
  if (hasUpper && hasLower) rawPoints++;
  if (hasNumber) rawPoints++;
  if (hasSpecial) rawPoints++;

  if (!password) {
    return {
      score: 0,
      percentage: 0,
      label: 'Enter password',
      color: '#6C757D',
      description: 'At least 8 characters with letters, numbers and symbols',
      rules,
    };
  }

  if (rawPoints <= 1) {
    return {
      score: 1,
      percentage: 33,
      label: 'Weak',
      color: '#ef4444',
      description: 'Weak password. Add numbers, symbols, or mixed case.',
      rules,
    };
  }

  if (rawPoints === 2 || rawPoints === 3) {
    return {
      score: 2,
      percentage: 66,
      label: 'Good',
      color: '#f59e0b',
      description: 'Good password. Add symbols or mix cases to make it strong.',
      rules,
    };
  }

  return {
    score: 3,
    percentage: 100,
    label: 'Strong',
    color: '#10B981',
    description: 'Strong password. Meets all security criteria.',
    rules,
  };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const strength = evaluatePasswordStrength(password);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: -6 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}
    >
      {/* 3-Segment Animated Gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {[1, 2, 3].map((segmentIndex) => {
          const isFilled = strength.score >= segmentIndex;
          return (
            <div
              key={segmentIndex}
              style={{
                height: 4,
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <motion.div
                initial={false}
                animate={{
                  width: isFilled ? '100%' : '0%',
                  backgroundColor: strength.color,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 24,
                }}
                style={{
                  height: '100%',
                  borderRadius: 999,
                  boxShadow: isFilled ? `0 0 8px ${strength.color}80` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Strength Label & Actionable Guidance Text */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: strength.color,
            fontFamily: '"Space Mono", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            transition: 'color 0.25s ease',
          }}
        >
          {strength.label}
        </span>
        <span
          style={{
            fontSize: '0.68rem',
            color: '#9D9FA2',
            textAlign: 'right',
            lineHeight: 1.3,
            transition: 'color 0.25s ease',
          }}
        >
          {strength.description}
        </span>
      </div>

      {/* 4 Animated Requirement Checkmark Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
        {strength.rules.map((rule) => (
          <motion.div
            key={rule.key}
            animate={{
              color: rule.met ? '#00C2DE' : '#6C757D',
              borderColor: rule.met ? 'rgba(0,194,222,0.4)' : 'rgba(255,255,255,0.08)',
              background: rule.met ? 'rgba(0,194,222,0.1)' : 'rgba(255,255,255,0.02)',
            }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.66rem',
              fontWeight: rule.met ? 600 : 400,
              fontFamily: '"Space Mono", monospace',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>{rule.met ? '✓' : '•'}</span>
            <span>{rule.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Signup Form (With Eye Password Option) ── */
function SignupForm({
  onOtpRequested,
}: {
  onOtpRequested: (email: string, payload: SignupPayload) => void;
}) {
  const { signUp } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<SignupPayload>({
      resolver: zodResolver(SignupPayloadSchema),
      defaultValues: { Role: 'User' },
    });

  const watchedPassword = watch('password', '');

  const onSubmit = async (data: SignupPayload) => {
    setApiError(null);
    setRoleError(null);
    const payload = {
      ...data,
      org_id: data.org_id.trim(),
      tenant_id: data.tenant_id?.trim() || undefined,
    };
    try {
      await signUp(payload);
      onOtpRequested(payload.email, payload);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = parseApiError(err, 'auth');
      if (isRoleConflictError(raw)) setRoleError(friendly);
      else setApiError(friendly);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {apiError && <AlertBox type="error">{apiError}</AlertBox>}
      {roleError && <AlertBox type="error">{roleError}</AlertBox>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input
          label="Username"
          type="text"
          placeholder="johndoe"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <Select
          label="Role"
          error={errors.Role?.message}
          {...register('Role')}
        >
          <option value="User" style={{ background: '#1A1A1B' }}>User</option>
          <option value="Admin" style={{ background: '#1A1A1B' }}>Admin</option>
          <option value="Super Admin" style={{ background: '#1A1A1B' }}>Super Admin</option>
        </Select>
      </div>

      <Input
        label="Work Email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <PasswordInput
        label="Password"
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />

      {/* ── Animated Password Strength Meter & Real-time Policy Feedback ── */}
      <PasswordStrengthMeter password={watchedPassword} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input
          label="Organization ID"
          placeholder="e.g. acme-corp"
          error={errors.org_id?.message}
          {...register('org_id')}
        />
        <Input
          label="Tenant ID (Optional)"
          placeholder="e.g. us-east"
          error={errors.tenant_id?.message}
          {...register('tenant_id')}
        />
      </div>

      <Button type="submit" variant="primary" loading={isSubmitting} fullWidth>
        Request Verification Code →
      </Button>
    </form>
  );
}

/* ── OTP Verification Form ── */
function VerifySignupForm({
  email,
  onVerified,
  onBack,
  resendPayload,
}: {
  email: string;
  onVerified: () => void;
  onBack: () => void;
  resendPayload?: SignupPayload | null;
}) {
  const { verifySignup, signUp } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  const { handleSubmit, setValue, formState: { isSubmitting } } =
    useForm<VerifySignupPayload>({
      resolver: zodResolver(VerifySignupPayloadSchema),
      defaultValues: { email, otp: '' },
    });

  const onSubmit = async () => {
    setApiError(null);
    setResendStatus(null);
    if (otpValue.trim().length !== 6) {
      setApiError('Please enter the complete 6-digit code.');
      return;
    }
    try {
      await verifySignup(email, otpValue.trim());
      onVerified();
    } catch (err) {
      setApiError(parseApiError(err, 'auth'));
    }
  };

  const handleResend = async () => {
    if (!resendPayload) return;
    setIsResending(true);
    setApiError(null);
    setResendStatus(null);
    try {
      await signUp(resendPayload);
      setResendStatus('A fresh 6-digit code has been dispatched to your email.');
    } catch (err) {
      setApiError(parseApiError(err, 'auth'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
          Verify Your Email
        </div>
        <p style={{ fontSize: '0.82rem', color: '#9D9FA2', lineHeight: 1.5 }}>
          We have sent a 6-digit verification code to <span style={{ color: '#00C2DE', fontWeight: 600 }}>{email}</span>
        </p>
      </div>

      {apiError && <AlertBox type="error">{apiError}</AlertBox>}
      {resendStatus && <AlertBox type="success">{resendStatus}</AlertBox>}

      <OtpInputBoxes
        value={otpValue}
        onChange={(val) => {
          setOtpValue(val);
          setValue('otp', val);
        }}
        disabled={isSubmitting}
      />

      <Button type="submit" variant="primary" loading={isSubmitting} fullWidth>
        Confirm & Activate Account
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.78rem',
            color: '#9D9FA2',
            cursor: 'pointer',
          }}
        >
          ← Change details
        </button>

        {resendPayload && (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.78rem',
              color: '#00C2DE',
              cursor: isResending ? 'not-allowed' : 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {isResending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </div>
    </form>
  );
}

/* ── Forgot Password Form ── */
function ForgotPasswordForm({
  initialEmail = '',
  onCodeSent,
  onBack,
}: {
  initialEmail?: string;
  onCodeSent: (email: string) => void;
  onBack: () => void;
}) {
  const { forgotPassword } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ForgotPasswordPayload>({
      resolver: zodResolver(ForgotPasswordPayloadSchema),
      defaultValues: { email: initialEmail },
    });

  const onSubmit = async (data: ForgotPasswordPayload) => {
    setApiError(null);
    try {
      await forgotPassword(data.email);
      onCodeSent(data.email);
    } catch (err) {
      setApiError(parseApiError(err, 'auth'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
          Reset Password
        </div>
        <p style={{ fontSize: '0.82rem', color: '#9D9FA2', lineHeight: 1.5 }}>
          Enter your registered email. We will send a 6-digit recovery code.
        </p>
      </div>

      {apiError && <AlertBox type="error">{apiError}</AlertBox>}

      <Input
        label="Work Email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <Button type="submit" variant="primary" loading={isSubmitting} fullWidth>
        Send Recovery Code →
      </Button>

      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '0.8rem',
          color: '#9D9FA2',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        ← Back to sign in
      </button>
    </form>
  );
}

/* ── Reset Password Form (With Eye Option on Both Password Inputs) ── */
function ResetPasswordForm({
  email,
  onSuccess,
  onBack,
  onResend,
}: {
  email: string;
  onSuccess: () => void;
  onBack: () => void;
  onResend: () => Promise<void>;
}) {
  const { resetPassword } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
    useForm<ResetPasswordPayload>({
      resolver: zodResolver(ResetPasswordPayloadSchema),
      defaultValues: { email, otp: '', new_password: '' },
    });

  const onSubmit = async (data: ResetPasswordPayload) => {
    setApiError(null);
    setConfirmError(null);
    setResendStatus(null);

    if (otpValue.trim().length !== 6) {
      setApiError('Please enter the 6-digit recovery code.');
      return;
    }

    if (data.new_password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      return;
    }

    try {
      await resetPassword(data.email, otpValue.trim(), data.new_password);
      onSuccess();
    } catch (err) {
      setApiError(parseApiError(err, 'auth'));
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setApiError(null);
    setResendStatus(null);
    try {
      await onResend();
      setResendStatus('A fresh recovery code has been sent.');
    } catch (err) {
      setApiError(parseApiError(err, 'auth'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
          Enter Recovery Code
        </div>
        <p style={{ fontSize: '0.82rem', color: '#9D9FA2', lineHeight: 1.5 }}>
          Code sent to <span style={{ color: '#00C2DE', fontWeight: 600 }}>{email}</span>
        </p>
      </div>

      {apiError && <AlertBox type="error">{apiError}</AlertBox>}
      {resendStatus && <AlertBox type="success">{resendStatus}</AlertBox>}

      <OtpInputBoxes
        value={otpValue}
        onChange={(val) => {
          setOtpValue(val);
          setValue('otp', val);
        }}
        disabled={isSubmitting}
      />

      {/* New Password with Eye Toggle */}
      <PasswordInput
        label="New Password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.new_password?.message}
        {...register('new_password')}
      />

      {/* Confirm Password with Eye Toggle */}
      <PasswordInput
        label="Confirm New Password"
        placeholder="Re-enter new password"
        autoComplete="new-password"
        error={confirmError || undefined}
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (confirmError) setConfirmError(null);
        }}
      />

      <Button type="submit" variant="primary" loading={isSubmitting} fullWidth>
        Update Password & Sign In
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: '0.78rem', color: '#9D9FA2', cursor: 'pointer' }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.78rem',
            color: '#00C2DE',
            cursor: isResending ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          {isResending ? 'Sending…' : 'Resend code'}
        </button>
      </div>
    </form>
  );
}

/* ── Main Auth Page with Authentic AMD Wave & Architectural Shapes ── */
export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify-signup' | 'forgot-password' | 'reset-password'>('login');
  const [email, setEmail] = useState('');
  const [savedSignup, setSavedSignup] = useState<SignupPayload | null>(null);
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const isMobile = useIsMobile(1024);
  const { forgotPassword } = useAuth();

  return (
    <div
      style={{
        flex: 1,
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'stretch',
        background: '#000000',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── AUTHENTIC AMD WAVE BACKGROUND (From amd.com) ── */}
      <div className="amd-wave-backdrop amd-wave-animated" />
      <div className="amd-wave-vignette" />

      {/* ── LEFT HERO PANEL (Desktop) ── */}
      {!isMobile && (
        <div
          style={{
            flex: '1 1 55%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '4rem 4rem 3rem 5rem',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ marginBottom: '2.5rem' }}>
              <Logo size="lg" showText={true} />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Pill Shape live tag */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 14px',
                  borderRadius: 9999,
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: '1px solid rgba(0, 194, 222, 0.4)',
                  boxShadow: '0 0 12px rgba(0, 194, 222, 0.2)',
                  color: '#00C2DE',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '1.5rem',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C2DE', boxShadow: '0 0 8px #00C2DE' }} />
                <span>Advancing Document Intelligence</span>
              </div>

              <h1
                style={{
                  fontSize: '2.85rem',
                  fontWeight: 700,
                  lineHeight: 1.12,
                  letterSpacing: '-0.025em',
                  color: '#FFFFFF',
                  fontFamily: '"Open Sans", sans-serif',
                  marginBottom: '1.25rem',
                }}
              >
                Your Trusted Partner for<br />
                <span style={{ color: '#00C2DE' }}>Advancing AI</span> across documents.
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  color: '#9D9FA2',
                  maxWidth: 520,
                  marginBottom: '2.5rem',
                }}
              >
                Confidently build and query enterprise knowledge with hybrid dense-vector search,
                verifiable citations, and hardware-grade data boundaries.
              </p>
            </motion.div>

            {/* Modern Elevated Capability Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', maxWidth: 640 }}>
              {CAPABILITIES.map((cap, i) => (
                <motion.div
                  key={cap.tag}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -3, borderColor: 'rgba(0,194,222,0.45)' }}
                  className="card-feature-modern"
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(22, 23, 25, 0.88)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#00C2DE', letterSpacing: '0.08em', fontFamily: '"Space Mono", monospace' }}>
                      {cap.tag}
                    </span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C2DE', boxShadow: '0 0 8px #00C2DE' }} />
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF', marginBottom: 4 }}>
                    {cap.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#9D9FA2', lineHeight: 1.45 }}>
                    {cap.desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div style={{ fontSize: '0.75rem', color: '#6C757D', paddingTop: '2rem', fontFamily: '"Space Mono", monospace' }}>
            AMD-Inspired Architecture · Neon pgvector HNSW · Groq LLM Inference · Sub-second Hybrid Rerank
          </div>
        </div>
      )}

      {/* ── RIGHT AUTH PANEL ── */}
      <div
        style={{
          flex: isMobile ? '1 1 100%' : '1 1 45%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '2rem 1.25rem' : '3rem 3.5rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <Logo size="md" showText={true} />
            </div>
          )}

          {/* ── MODERN GLASS AUTH CHASSIS ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="card-modern-glass"
            style={{
              padding: isMobile ? '1.75rem 1.25rem' : '2.25rem 2rem',
              boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              background: 'rgba(20, 21, 23, 0.94)',
              borderRadius: '20px',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Pill Tab Track Switcher with Fluid Spring Pill */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="pill-tab-track" style={{ marginBottom: '1.75rem', position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => { setBanner(null); setMode('login'); }}
                  style={{
                    flex: 1,
                    position: 'relative',
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 9999,
                    color: mode === 'login' ? '#FFFFFF' : '#9D9FA2',
                    fontWeight: mode === 'login' ? 600 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    zIndex: 2,
                    transition: 'color 150ms ease',
                  }}
                >
                  {mode === 'login' && (
                    <motion.div
                      layoutId="activeAuthTab"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(0, 194, 222, 0.45)',
                        borderRadius: 9999,
                        boxShadow: '0 2px 10px rgba(0,194,222,0.18)',
                        zIndex: -1,
                      }}
                    />
                  )}
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setBanner(null); setMode('signup'); }}
                  style={{
                    flex: 1,
                    position: 'relative',
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 9999,
                    color: mode === 'signup' ? '#FFFFFF' : '#9D9FA2',
                    fontWeight: mode === 'signup' ? 600 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    zIndex: 2,
                    transition: 'color 150ms ease',
                  }}
                >
                  {mode === 'signup' && (
                    <motion.div
                      layoutId="activeAuthTab"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(0, 194, 222, 0.45)',
                        borderRadius: 9999,
                        boxShadow: '0 2px 10px rgba(0,194,222,0.18)',
                        zIndex: -1,
                      }}
                    />
                  )}
                  Create Account
                </button>
              </div>
            )}

            {banner && (
              <div style={{ marginBottom: 16 }}>
                <AlertBox type={banner.type}>{banner.text}</AlertBox>
              </div>
            )}

            {/* Active Mode Form with Smooth Crossfade Transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {mode === 'login' && (
                  <LoginForm
                    initialEmail={email}
                    onForgotPassword={() => {
                      setBanner(null);
                      setMode('forgot-password');
                    }}
                  />
                )}

                {mode === 'signup' && (
                  <SignupForm
                    onOtpRequested={(submittedEmail, payload) => {
                      setEmail(submittedEmail);
                      setSavedSignup(payload);
                      setBanner({
                        type: 'success',
                        text: 'Account created. Enter the 6-digit verification code sent to your email.',
                      });
                      setMode('verify-signup');
                    }}
                  />
                )}

                {mode === 'verify-signup' && (
                  <VerifySignupForm
                    email={email}
                    resendPayload={savedSignup}
                    onVerified={() => {
                      setBanner({
                        type: 'success',
                        text: 'Email verified. You can now sign in to your workspace.',
                      });
                      setMode('login');
                    }}
                    onBack={() => {
                      setBanner(null);
                      setMode('signup');
                    }}
                  />
                )}

                {mode === 'forgot-password' && (
                  <ForgotPasswordForm
                    initialEmail={email}
                    onCodeSent={(submittedEmail) => {
                      setEmail(submittedEmail);
                      setBanner({
                        type: 'success',
                        text: 'If an account exists, a 6-digit recovery code has been sent.',
                      });
                      setMode('reset-password');
                    }}
                    onBack={() => {
                      setBanner(null);
                      setMode('login');
                    }}
                  />
                )}

                {mode === 'reset-password' && (
                  <ResetPasswordForm
                    email={email}
                    onSuccess={() => {
                      setBanner({
                        type: 'success',
                        text: 'Password updated. Please sign in with your new credentials.',
                      });
                      setMode('login');
                    }}
                    onBack={() => {
                      setBanner(null);
                      setMode('forgot-password');
                    }}
                    onResend={async () => {
                      if (email) await forgotPassword(email);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
