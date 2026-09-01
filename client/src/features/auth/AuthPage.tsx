import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useContextHooks';
import { useIsMobile } from '@/hooks/useContextHooks';
import { parseApiError, isRoleConflictError } from '@/api/client';
import { LoginPayloadSchema, SignupPayloadSchema } from '@/api/types';
import type { LoginPayload, SignupPayload } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE DATA — alternating teal / purple
─────────────────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '⬡', title: 'Global & Session Indexes',  color: '#00d2c8',
    desc: 'Permanent org index on Neon · session index on Redis with 1-hour TTL' },
  { icon: '◈', title: 'LangChain Chunking',         color: '#a855f7',
    desc: 'Recursive, doc-aware, slide-aware strategies with OCR fallback for scanned PDFs' },
  { icon: '⌖', title: 'Hybrid Retrieval',            color: '#00d2c8',
    desc: 'Vector + BM25 keyword search with configurable weights per query' },
  { icon: '◆', title: 'Page-Level Citations',        color: '#a855f7',
    desc: 'Every answer links directly to source pages with similarity scores' },
  { icon: '⊞', title: 'RBAC · Tenant Isolation',    color: '#00d2c8',
    desc: 'Super Admin → Admin → User roles with full per-org data isolation' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   FLOATING ORB — animated teal/purple sphere with orbiting rings
   Shown prominently on mobile hero, subtly as desktop background decoration
─────────────────────────────────────────────────────────────────────────────── */
function FloatingOrb({ size = 180 }: { size?: number }) {
  const s = size;
  return (
    <div style={{ position: 'relative', width: s, height: s, flexShrink: 0 }}>
      {/* Outer slow-pulse glow */}
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.22, 0.38, 0.22] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: -s * 0.25,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(0,210,200,0.22) 0%, rgba(168,85,247,0.10) 50%, transparent 75%)`,
          pointerEvents: 'none',
        }}
      />
      {/* Core orb — breathing */}
      <motion.div
        animate={{ scale: [1, 1.10, 1], opacity: [0.82, 1, 0.82] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: '22%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 35%, rgba(0,255,240,0.95) 0%, rgba(0,210,200,0.7) 30%, rgba(0,180,180,0.2) 65%, transparent 100%)',
          boxShadow: `0 0 ${s * 0.22}px rgba(0,210,200,0.7), 0 0 ${s * 0.50}px rgba(0,210,200,0.35), 0 0 ${s * 0.80}px rgba(0,210,200,0.14)`,
        }}
      />
      {/* Inner bright core */}
      <div style={{
        position: 'absolute', inset: '36%',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95) 0%, rgba(0,255,240,0.6) 40%, transparent 75%)',
      }} />

      {/* Ring 1 — teal, orbits clockwise */}
      <motion.div
        style={{
          position: 'absolute', inset: '6%',
          borderRadius: '50%',
          border: '1px solid rgba(0,210,200,0.5)',
          boxShadow: '0 0 8px rgba(0,210,200,0.2)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
      >
        {/* Travelling dot on ring 1 */}
        <div style={{
          position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
          width: 8, height: 8, borderRadius: '50%',
          background: '#00d2c8', boxShadow: '0 0 10px #00d2c8, 0 0 20px rgba(0,210,200,0.5)',
        }} />
      </motion.div>

      {/* Ring 2 — purple, orbits counter-clockwise */}
      <motion.div
        style={{
          position: 'absolute', inset: '-4%',
          borderRadius: '50%',
          border: '1px solid rgba(168,85,247,0.38)',
          boxShadow: '0 0 6px rgba(168,85,247,0.15)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
      >
        <div style={{
          position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
          width: 6, height: 6, borderRadius: '50%',
          background: '#a855f7', boxShadow: '0 0 8px #a855f7, 0 0 16px rgba(168,85,247,0.5)',
        }} />
      </motion.div>

      {/* Ring 3 — very faint, slow */}
      <motion.div
        style={{
          position: 'absolute', inset: '-15%',
          borderRadius: '50%',
          border: '0.5px solid rgba(0,210,200,0.14)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />

      {/* Float animation wrapper */}
      <motion.div
        style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE FEATURE STACK — vertical cards shown on mobile hero screen
─────────────────────────────────────────────────────────────────────────────── */
function MobileFeatureStack() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360, padding: '0 0.25rem' }}>
      {FEATURES.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.09, duration: 0.32 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(18px) saturate(160%)',
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
            border: `1px solid ${f.color}28`,
            borderTopColor: `${f.color}48`,
            boxShadow: `0 2px 12px rgba(0,0,0,0.38), 0 0 0 1px ${f.color}0a`,
          }}
        >
          <span style={{
            fontSize: '1.05rem', flexShrink: 0,
            color: f.color,
            filter: `drop-shadow(0 0 6px ${f.color}99)`,
          }}>{f.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)',
              fontFamily: '"Comfortaa", "Plus Jakarta Sans", sans-serif',
              letterSpacing: '-0.015em', marginBottom: 2,
            }}>{f.title}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.45 }}>{f.desc}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DRIFTING PARTICLES — subtle background dots for the mobile hero
─────────────────────────────────────────────────────────────────────────────── */
function DriftingParticles() {
  const particles = [
    { x: '15%', delay: 0,    dur: 6,  color: '#00d2c8', size: 3 },
    { x: '35%', delay: 1.2,  dur: 8,  color: '#a855f7', size: 2 },
    { x: '55%', delay: 0.5,  dur: 7,  color: '#00d2c8', size: 2 },
    { x: '72%', delay: 2,    dur: 9,  color: '#a855f7', size: 3 },
    { x: '85%', delay: 0.8,  dur: 6,  color: '#00d2c8', size: 2 },
    { x: '25%', delay: 3,    dur: 10, color: '#a855f7', size: 1.5 },
    { x: '65%', delay: 1.8,  dur: 7,  color: '#00d2c8', size: 1.5 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{ y: [0, -300, -600], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

/* ── Alert box ── */
function AlertBox({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const s = {
    error:   { bg: 'var(--danger-dim)',  border: 'rgba(248,113,113,0.22)', color: 'var(--danger)',  icon: '⚠' },
    success: { bg: 'var(--success-dim)', border: 'rgba(52,211,153,0.22)',  color: 'var(--success)', icon: '✓' },
  }[type];
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
        borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`,
        color: s.color, fontSize: '0.82rem', lineHeight: 1.55 }}>
      <span style={{ flexShrink: 0, fontWeight: 700 }}>{s.icon}</span>
      <span>{children}</span>
    </motion.div>
  );
}

/* ── Login Form ── */
function LoginForm() {
  const { signIn } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginPayload>({ resolver: zodResolver(LoginPayloadSchema) });

  const onSubmit = async (data: LoginPayload) => {
    setApiError(null);
    try { await signIn(data.email, data.password); }
    catch (err) { setApiError(parseApiError(err)); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {apiError && <AlertBox type="error">{apiError}</AlertBox>}
      <Input label="Work email" type="email" placeholder="you@company.com"
        autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input label="Password" type="password" placeholder="At least 8 characters"
        autoComplete="current-password" error={errors.password?.message} {...register('password')} />
      <Button type="submit" fullWidth loading={isSubmitting} size="md" style={{ marginTop: 8 }}>
        Sign in →
      </Button>
    </form>
  );
}

/* ── Signup Form ── */
function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const { signUp } = useAuth();
  const [apiError,  setApiError]  = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<SignupPayload>({ resolver: zodResolver(SignupPayloadSchema), defaultValues: { Role: 'User' } });

  const onSubmit = async (data: SignupPayload) => {
    setApiError(null); setRoleError(null);
    const payload = {
      ...data,
      org_id:    data.org_id.trim(),
      tenant_id: data.tenant_id?.trim() || undefined,
    };
    try {
      await signUp(payload);
      setSuccessMsg('Account created! Switching to sign in…');
      setTimeout(() => onSuccess(), 1400);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = parseApiError(err);
      if (isRoleConflictError(raw)) setRoleError(friendly); else setApiError(friendly);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {apiError   && <AlertBox type="error">{apiError}</AlertBox>}
      {successMsg && <AlertBox type="success">{successMsg}</AlertBox>}
      <Input label="Username" type="text" placeholder="e.g. alex_doe"
        autoComplete="username" error={errors.username?.message} {...register('username')} />
      <Input label="Work email" type="email" placeholder="you@company.com"
        autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input label="Password" type="password" placeholder="At least 8 characters"
        autoComplete="new-password" error={errors.password?.message} {...register('password')} />
      <Input label="Organisation ID" type="text" placeholder="e.g. acme-corp"
        error={errors.org_id?.message} {...register('org_id')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Select label="Role" error={roleError ?? errors.Role?.message} {...register('Role')}>
          <option value="User">User</option>
          <option value="Admin">Admin</option>
          <option value="Super Admin">Super Admin</option>
        </Select>
        {roleError && (
          <p style={{ fontSize: '0.72rem', color: 'var(--danger)', lineHeight: 1.5 }}>⚠ {roleError}</p>
        )}
      </div>
      <Button type="submit" fullWidth loading={isSubmitting} size="md" style={{ marginTop: 6 }}>
        Create account →
      </Button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ZIG-ZAG FEATURE SECTION (desktop)
─────────────────────────────────────────────────────────────────────────────── */
function ZigZagFeatures() {
  const W       = 480;
  const CARD_W  = 255;
  const PITCH   = 138;
  const N       = FEATURES.length;

  const getCardHeight = (index: number) => {
    if (index === 0) return 95;
    if (index === 1) return 96;
    return 95;
  };

  const maxCardH = 96;
  const TOTAL_H = (N - 1) * PITCH + maxCardH + 20;

  const nxL = 30;
  const nxR = W - 30;
  const cxL = nxL + 18;
  const cxR = nxR - CARD_W - 18;

  const nodes = FEATURES.map((_, i) => ({
    x: i % 2 === 0 ? nxL : nxR,
    y: i * PITCH + maxCardH / 2,
  }));

  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) {
    const p = nodes[i - 1];
    const c = nodes[i];
    d += ` C ${p.x} ${p.y + PITCH * 0.50}, ${c.x} ${c.y - PITCH * 0.50}, ${c.x} ${c.y}`;
  }

  const dashTotal = PITCH * N * 1.4;

  return (
    <div style={{ position: 'relative', width: W, maxWidth: '100%', height: TOTAL_H, margin: '0 auto', flexShrink: 0 }}>
      <svg viewBox={`0 0 ${W} ${TOTAL_H}`} width={W} height={TOTAL_H}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
        <defs>
          <linearGradient id="zigGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#00d2c8" stopOpacity="1"   />
            <stop offset="40%"  stopColor="#7c3aed" stopOpacity="0.9" />
            <stop offset="70%"  stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00d2c8" stopOpacity="1"   />
          </linearGradient>
          <filter id="pathGlow" x="-20%" y="-5%" width="140%" height="110%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="nodeGlow" x="-100%" y="-100%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <path d={d} stroke="url(#zigGrad)" strokeWidth={10} fill="none"
          strokeLinecap="round" strokeLinejoin="round"
          opacity={0.16} filter="url(#pathGlow)" />
        <path d={d} stroke="url(#zigGrad)" strokeWidth={0.8} fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity={0.28} />
        <motion.path d={d} stroke="url(#zigGrad)" strokeWidth={2} fill="none"
          strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 7"
          initial={{ strokeDashoffset: dashTotal }}
          animate={{ strokeDashoffset: -dashTotal }}
          transition={{ duration: 4, ease: 'linear', repeat: Infinity }} />

        {nodes.map((n, i) => {
          const col = i % 2 === 0 ? '#00d2c8' : '#a855f7';
          return (
            <g key={i} filter="url(#nodeGlow)">
              <motion.circle cx={n.x} cy={n.y} fill="none" stroke={col} strokeWidth={0.8}
                initial={{ r: 12, opacity: 0.7 }} animate={{ r: 24, opacity: 0 }}
                transition={{ duration: 2.2, ease: 'easeOut', repeat: Infinity, delay: i * 0.4 }} />
              <circle cx={n.x} cy={n.y} r={14} fill="none" stroke={col} strokeWidth={0.9} opacity={0.28} />
              <circle cx={n.x} cy={n.y} r={9} fill="none" stroke={col} strokeWidth={1.1} opacity={0.50} />
              <circle cx={n.x} cy={n.y} r={5.5} fill={col} />
              <circle cx={n.x} cy={n.y} r={2.2} fill="#ffffff" />
            </g>
          );
        })}
      </svg>

      {FEATURES.map((f, i) => {
        const isLeft = i % 2 === 0;
        const cardW  = 255;
        const cardH  = getCardHeight(i);
        const cardX  = isLeft ? cxL : cxR;
        const cardY  = nodes[i].y - cardH / 2;

        return (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, x: isLeft ? -22 : 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.11, duration: 0.36 }}
            style={{
              position: 'absolute', left: cardX, top: cardY, width: cardW, height: cardH,
              padding: '11px 14px', borderRadius: 13,
              background: 'rgba(255,255,255,0.046)',
              backdropFilter: 'blur(24px) saturate(165%)',
              WebkitBackdropFilter: 'blur(24px) saturate(165%)',
              border: `1px solid ${f.color}2e`,
              borderTopColor: `${f.color}52`,
              boxShadow: `0 4px 22px rgba(0,0,0,0.48), 0 0 0 1px ${f.color}0a, inset 0 1px 0 rgba(255,255,255,0.07)`,
              cursor: 'default', transition: 'all 0.22s ease', overflow: 'hidden',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background  = `${f.color}13`;
              el.style.borderColor = `${f.color}58`;
              el.style.boxShadow   = `0 8px 36px rgba(0,0,0,0.55), 0 0 26px ${f.color}22`;
              el.style.transform   = isLeft ? 'translateX(6px)' : 'translateX(-6px)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background  = 'rgba(255,255,255,0.046)';
              el.style.borderColor = `${f.color}2e`;
              el.style.boxShadow   = `0 4px 22px rgba(0,0,0,0.48), 0 0 0 1px ${f.color}0a, inset 0 1px 0 rgba(255,255,255,0.07)`;
              el.style.transform   = 'translateX(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: '0.95rem', flexShrink: 0, color: f.color, filter: `drop-shadow(0 0 7px ${f.color}95)` }}>
                {f.icon}
              </span>
              <span style={{ fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                {f.title}
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.55, paddingLeft: 26 }}>
              {f.desc}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED AUTH CARD CONTENT (tab switcher + forms)
   Used by both desktop right-panel and mobile slide-up sheet
─────────────────────────────────────────────────────────────────────────────── */
function AuthCardContent({
  tab,
  setTab,
}: {
  tab: 'login' | 'signup';
  setTab: (t: 'login' | 'signup') => void;
}) {
  return (
    <div className="glass-deep" style={{ padding: '2.25rem 1.75rem 2rem', borderRadius: 22 }}>
      {/* Tab switcher */}
      <div style={{
        display: 'flex', marginBottom: 28, padding: 4, borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(0,210,200,0.10)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.35) inset',
      }}>
        {(['login', 'signup'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 11,
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none',
              fontFamily: '"Comfortaa", "Plus Jakarta Sans", sans-serif',
              transition: 'all 0.2s ease',
              background: tab === t
                ? 'linear-gradient(135deg, rgba(0,210,200,0.16), rgba(168,85,247,0.12))'
                : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--muted)',
              outline: tab === t ? '1px solid rgba(0,210,200,0.24)' : 'none',
              boxShadow: tab === t
                ? '0 2px 10px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.08) inset'
                : 'none',
            }}
          >
            {t === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: tab === 'login' ? -14 : 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: tab === 'login' ? 14 : -14 }}
          transition={{ duration: 0.17 }}
        >
          <h2 style={{
            fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif',
            fontSize: '1.25rem', fontWeight: 600,
            letterSpacing: '-0.025em', marginBottom: 5, color: 'var(--text)',
          }}>
            {tab === 'login' ? 'Welcome back' : 'Create an account'}
          </h2>
          <p style={{
            fontSize: '0.8rem', color: 'var(--muted)',
            lineHeight: 1.6, marginBottom: '1.6rem',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>
            {tab === 'login'
              ? 'Use your organisation credentials to access the retrieval console.'
              : 'Sign up to gain access to enterprise document retrieval.'}
          </p>
          {tab === 'login' ? <LoginForm /> : <SignupForm onSuccess={() => setTab('login')} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH PAGE
─────────────────────────────────────────────────────────────────────────────── */
export function AuthPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [mobileView, setMobileView] = useState<'hero' | 'auth'>('hero');
  const isMobile = useIsMobile(768);

  /* ══════════════════════════════════════════════════════════
     MOBILE LAYOUT — hero screen + sliding auth form
  ══════════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex', flexDirection: 'column',
        overflowX: 'hidden', position: 'relative',
      }}>
        {/* Drifting particle background */}
        <DriftingParticles />

        {/* ── HERO SCREEN ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '2.5rem 1.25rem 6rem',
          gap: '1.5rem', overflowY: 'auto',
          position: 'relative', zIndex: 1,
        }}>
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)',
              animation: 'pulseOpacity 2s infinite', display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--accent)',
              fontFamily: '"Comfortaa", "Quicksand", "Outfit", sans-serif',
            }}>
              Enterprise RAG Platform
            </span>
          </motion.div>

          {/* Floating orb animation — the main visual centrepiece on mobile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FloatingOrb size={180} />
            </motion.div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            style={{
              fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif',
              fontSize: 'clamp(1.45rem, 5.5vw, 1.75rem)',
              fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.25,
              color: 'var(--text)', textAlign: 'center', maxWidth: 320,
            }}
          >
            Grounded answers from{' '}
            <span style={{
              color: 'transparent',
              backgroundImage: 'linear-gradient(90deg, #00d2c8 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', fontWeight: 700,
            }}>
              every document
            </span>{' '}
            your org trusts.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.65, textAlign: 'center', maxWidth: 290 }}
          >
            Hybrid retrieval · RBAC · Session & org indexes
          </motion.p>

          {/* Feature cards (vertical stack) */}
          <MobileFeatureStack />

          {/* CTA button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            style={{ width: '100%', maxWidth: 340, paddingTop: '0.5rem' }}
          >
            <Button variant="primary" size="md" fullWidth onClick={() => setMobileView('auth')}>
              Get Started →
            </Button>
            <p style={{ textAlign: 'center', fontSize: '0.64rem', color: 'var(--muted)', marginTop: 10, opacity: 0.55 }}>
              Secured with JWT · RBAC · TLS in transit
            </p>
          </motion.div>
        </div>

        {/* ── SLIDING AUTH FORM (mobile) ── */}
        <AnimatePresence>
          {mobileView === 'auth' && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobileView('hero')}
                style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              />
              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 49,
                  background: 'linear-gradient(180deg, rgba(4,14,22,0.97) 0%, rgba(2,10,18,0.99) 100%)',
                  backdropFilter: 'blur(28px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                  borderRadius: '24px 24px 0 0',
                  border: '1px solid rgba(0,210,200,0.18)',
                  borderBottom: 'none',
                  boxShadow: '0 -8px 48px rgba(0,0,0,0.65)',
                  maxHeight: '92vh',
                  overflowY: 'auto',
                  padding: '0 1.25rem',
                  paddingBottom: 'calc(var(--bottom-tab-h, 0px) + 1.5rem)',
                }}
              >
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 4px' }}>
                  <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }} />
                </div>

                {/* Back button */}
                <button
                  onClick={() => setMobileView('hero')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', color: 'var(--accent)',
                    fontSize: '0.82rem', cursor: 'pointer', padding: '8px 0 16px',
                    fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 500,
                  }}
                >
                  ← Back to overview
                </button>

                {/* Auth card */}
                <AuthCardContent tab={tab} setTab={setTab} />

                <p style={{ textAlign: 'center', fontSize: '0.62rem', color: 'var(--muted)', marginTop: '0.75rem', opacity: 0.45 }}>
                  Secured with JWT · RBAC · TLS in transit
                </p>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     DESKTOP LAYOUT — side-by-side hero + auth card
  ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', minHeight: 'calc(100vh - 60px)' }}>

      {/* ── LEFT: Hero + Zig-Zag Features ── */}
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '3.5rem 2.5rem 3rem 3.5rem',
          overflowY: 'auto', position: 'relative',
        }}
      >
        {/* Decorative orb — subtle background accent on desktop */}
        <div style={{ position: 'absolute', top: '3%', right: '4%', opacity: 0.35, pointerEvents: 'none', zIndex: 0 }}>
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <FloatingOrb size={110} />
          </motion.div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)',
              animation: 'pulseOpacity 2s infinite', display: 'inline-block',
            }} />
            <span style={{
              fontSize: '0.68rem', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--accent)',
              fontFamily: '"Comfortaa", "Quicksand", "Outfit", sans-serif',
            }}>
              Enterprise RAG Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            style={{
              fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif',
              fontSize: 'clamp(1.7rem, 2.8vw, 2.7rem)',
              fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.2,
              color: 'var(--text)', maxWidth: 500, marginBottom: '0.9rem',
            }}
          >
            Grounded answers from{' '}
            <span style={{
              color: 'transparent',
              backgroundImage: 'linear-gradient(90deg, #00d2c8 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', fontWeight: 700,
            }}>
              every document
            </span>{' '}
            your organisation trusts.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
            style={{
              fontSize: '0.86rem', color: 'var(--muted)',
              lineHeight: 1.7, maxWidth: 420, marginBottom: '2.5rem',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          >
            Hybrid vector + keyword retrieval, delta-aware indexing, session-private
            uploads and RBAC — over one enterprise API.
          </motion.p>

          <ZigZagFeatures />
        </div>

        <div style={{
          marginTop: 'auto', paddingTop: '2rem',
          fontSize: '0.62rem', color: 'var(--muted)',
          opacity: 0.38, letterSpacing: '0.04em',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>
          LangChain chunking · pgvector on Neon · Groq LLaMA 3.3 70B · Supabase registries
        </div>
      </div>

      {/* ── RIGHT: Auth Glass Card ── */}
      <div style={{
        width: 480, minWidth: 360,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2.5rem 2rem',
        borderLeft: '1px solid rgba(0,210,200,0.10)',
        background: 'linear-gradient(180deg, rgba(4,14,22,0.5) 0%, rgba(2,10,18,0.3) 100%)',
        backdropFilter: 'blur(8px)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 250 }}
          style={{ width: '100%', maxWidth: 420 }}
        >
          <AuthCardContent tab={tab} setTab={setTab} />
          <p style={{
            textAlign: 'center', fontSize: '0.65rem',
            color: 'var(--muted)', marginTop: '1rem', opacity: 0.5,
          }}>
            Secured with JWT · RBAC · TLS in transit
          </p>
        </motion.div>
      </div>
    </div>
  );
}
