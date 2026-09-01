import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useContextHooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getOrgUsers, deleteOrgUser, getOrgDocuments, deleteOrgDocument, getGlobalUploadSetting, updateGlobalUploadSetting, updateUserUploadPermission } from '@/api/admin';
import { parseApiError, BASE_URL, tokenStore } from '@/api/client';
import type { OrgUser, OrgDocument } from '@/api/types';

/* ─── shared glass card style ─── */
const glassPanel = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(0,180,200,0.04) 50%, rgba(255,255,255,0.025) 100%)',
  backdropFilter: 'blur(32px) saturate(170%)',
  WebkitBackdropFilter: 'blur(32px) saturate(170%)',
  border: '1px solid rgba(0,210,200,0.14)',
  borderTopColor: 'rgba(255,255,255,0.20)',
  borderRadius: 20,
  boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.09) inset, 0 0 0 1px rgba(0,210,200,0.06)',
} as const;

/* ─── capability matrix ─── */
const BASE_ROLE_MATRIX = [
  { capability: 'Query global index',         user: true,  admin: true,  superAdmin: true  },
  { capability: 'Query local session index',  user: true,  admin: true,  superAdmin: true  },
  { capability: 'Upload to local session',    user: true,  admin: true,  superAdmin: true  },
  { capability: 'Upload to global org index', user: false, admin: true,  superAdmin: true, configurable: true },
  { capability: 'View admin panel',           user: false, admin: true,  superAdmin: true  },
  { capability: 'Manage all organisations',   user: false, admin: false, superAdmin: true  },
  { capability: 'Assign Super Admin role',    user: false, admin: false, superAdmin: true  },
];

/* ── helpers ── */
function Tick({ yes, note }: { yes: boolean; note?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
      <span style={{
        fontSize: yes ? '1.05rem' : '0.85rem',
        color: yes ? 'var(--success)' : 'var(--border)',
        fontWeight: yes ? 700 : 400,
        filter: yes ? 'drop-shadow(0 0 5px rgba(52,211,153,0.55))' : 'none',
      }}>
        {yes ? '✓' : '—'}
      </span>
      {note && (
        <span style={{ fontSize: '0.62rem', color: yes ? 'var(--accent)' : 'var(--muted)', opacity: 0.8 }}>
          {note}
        </span>
      )}
    </div>
  );
}

function SectionCard({ children, title, subtitle, delay = 0 }: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38 }}
      style={{ ...glassPanel, padding: '1.5rem 1.5rem' }}
    >
      <div style={{ marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(0,210,200,0.10)' }}>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)', marginBottom: subtitle ? 4 : 0 }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

/* ── Global Upload Permission Card ── */
function GlobalUploadSettingsCard({
  allowed,
  onSettingChange,
}: {
  allowed: boolean;
  onSettingChange: (newVal: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const handleToggle = async () => {
    const nextVal = !allowed;
    setSaving(true);
    setStatusMsg(null);
    try {
      await updateGlobalUploadSetting(nextVal);
      onSettingChange(nextVal);
      setStatusMsg({
        msg: nextVal
          ? 'Global upload enabled for standard users.'
          : 'Global upload disabled for standard users (Admins only).',
        type: 'success',
      });
    } catch (err) {
      setStatusMsg({ msg: parseApiError(err), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Global Upload Policy"
      subtitle="Configure whether standard users in your organisation can upload documents to the permanent Global Index"
      delay={0.07}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AnimatePresence>
          {statusMsg && <StatusMsg msg={statusMsg.msg} type={statusMsg.type} />}
        </AnimatePresence>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.1rem 1.25rem',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.038)',
          border: '1px solid rgba(0,210,200,0.12)',
          borderTopColor: 'rgba(255,255,255,0.12)',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1rem', color: 'var(--accent)' }}>🌐</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
                Allow Standard Users Global Upload
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: allowed ? 'var(--success-dim)' : 'var(--danger-dim)',
                color: allowed ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${allowed ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
              }}>
                {allowed ? 'Enabled' : 'Disabled (Admin Only)'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
              {allowed
                ? 'Standard users can index documents globally into Neon DB. All organisation members can search and query these documents.'
                : 'Only Admins and Super Admins can upload to the Global Org Index. Standard users can only upload to private 1-hour session index (Redis).'}
            </p>
          </div>

          <Button
            variant={allowed ? 'ghost' : 'primary'}
            size="sm"
            loading={saving}
            onClick={handleToggle}
            style={{
              flexShrink: 0,
              minWidth: 140,
              ...(allowed ? { color: 'var(--danger)', borderColor: 'rgba(248,113,113,0.35)' } : {}),
            }}
          >
            {allowed ? 'Disable for Users' : 'Enable for Users'}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

/* ── Inline status for async operations ── */
function StatusMsg({ msg, type }: { msg: string; type: 'error' | 'success' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        padding: '10px 14px', borderRadius: 12, fontSize: '0.78rem',
        background: type === 'error' ? 'var(--danger-dim)' : 'var(--success-dim)',
        border: `1px solid ${type === 'error' ? 'rgba(248,113,113,0.22)' : 'rgba(52,211,153,0.22)'}`,
        color: type === 'error' ? 'var(--danger)' : 'var(--success)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}
    >
      <span>{type === 'error' ? '⚠' : '✓'}</span>
      {msg}
    </motion.div>
  );
}

/* ── Confirm-delete dialog ── */
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)',
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...glassPanel,
          padding: '1.75rem 1.75rem',
          maxWidth: 440, width: '100%',
          borderColor: 'rgba(248,113,113,0.25)',
        }}
      >
        <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
          Confirm Delete
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="md" onClick={onCancel} style={{ flex: 1, minWidth: 100 }}>
            Cancel
          </Button>
          <Button
            variant="primary" size="md"
            loading={loading}
            onClick={onConfirm}
            style={{ flex: 1, minWidth: 100, background: 'var(--danger)', borderColor: 'var(--danger)' }}
          >
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 1 — OVERVIEW
════════════════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const { user, role } = useAuth();
  const [globalUploadAllowed, setGlobalUploadAllowed] = useState(false);

  useEffect(() => {
    getGlobalUploadSetting()
      .then(res => setGlobalUploadAllowed(res.allow_user_global_upload))
      .catch(() => {});
  }, []);

  const orgCards = [
    { label: 'Organisation', value: user?.org_id ?? '—', icon: '⊞' },
    { label: 'Your Role',    value: <Badge role={role ?? undefined}>{role ?? '—'}</Badge>, icon: '◈' },
    { label: 'Email',        value: user?.email ?? '—', icon: '✉' },
    { label: 'User ID',
      value: <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--muted)', wordBreak: 'break-all' }}>{user?.user_id ?? '—'}</span>,
      icon: '⌖',
    },
  ];

  const roleMatrix = BASE_ROLE_MATRIX.map(row => {
    if (row.configurable) {
      return {
        ...row,
        user: globalUploadAllowed,
        userNote: globalUploadAllowed ? '(Enabled)' : '(Disabled)',
      };
    }
    return { ...row, userNote: undefined };
  });

  const systemInfo = [
    { label: 'Vector Store',     value: 'pgvector on Neon (global) · Redis (session)',              icon: '◆' },
    { label: 'Retrieval Engine', value: 'Hybrid — vector + BM25 keyword',                           icon: '⬡' },
    { label: 'Chunking',         value: 'LangChain — recursive / doc-aware / slide-aware',           icon: '◈' },
    { label: 'LLM',              value: 'Groq LLaMA 3.3 70B — page-level citations',                icon: '⌖' },
    { label: 'Session TTL',      value: '3600 seconds (1 hour)',                                     icon: '◷' },
    { label: 'Auth',             value: 'JWT HS256 · 30-minute token expiry',                        icon: '⊠' },
    { label: 'Access Control',   value: 'RBAC: Super Admin → Admin → User · Tenant isolation',       icon: '⊞' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Org context */}
      <SectionCard title="Organisation Context" subtitle="Your active session identity and role" delay={0.04}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
          {orgCards.map(({ label, value, icon }) => (
            <div key={label}
              style={{ padding: '1rem 1.1rem', borderRadius: 14, background: 'rgba(255,255,255,0.038)', border: '1px solid rgba(0,210,200,0.12)', borderTopColor: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', transition: 'all 0.2s ease' }}
            >
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--accent)' }}>{icon}</span>{label}
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>{value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Global Upload Policy Config */}
      <GlobalUploadSettingsCard
        allowed={globalUploadAllowed}
        onSettingChange={setGlobalUploadAllowed}
      />

      {/* Role matrix */}
      <SectionCard title="Role Capability Matrix" subtitle="What each role is permitted to do" delay={0.09}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
          <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,210,200,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '0 0 12px 0', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--muted)', fontWeight: 500, width: '48%' }}>Capability</th>
                {['User', 'Admin', 'Super Admin'].map(r => (
                  <th key={r} style={{ padding: '0 8px 12px', textAlign: 'center', minWidth: 85 }}>
                    <Badge role={r}>{r}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roleMatrix.map((row, i) => (
                <tr key={row.capability}
                  style={{ borderBottom: i < roleMatrix.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent' }}
                >
                  <td style={{ padding: '11px 0', fontSize: '0.80rem', color: 'var(--text-secondary)' }}>{row.capability}</td>
                  <td style={{ padding: '11px 8px' }}><Tick yes={row.user} note={row.userNote} /></td>
                  <td style={{ padding: '11px 8px' }}><Tick yes={row.admin} /></td>
                  <td style={{ padding: '11px 8px' }}><Tick yes={row.superAdmin} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* System info */}
      <SectionCard title="System Configuration" subtitle="Active infrastructure, models, and runtime parameters" delay={0.14}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {systemInfo.map(({ label, value, icon }, i) => (
            <div key={label}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '11px 0', borderBottom: i < systemInfo.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', flexWrap: 'wrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 140, flexShrink: 0 }}>
                <span style={{ color: 'var(--accent)', fontSize: '0.72rem' }}>{icon}</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
              </div>
              <span style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1, minWidth: 200 }}>{value}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 2 — USERS
════════════════════════════════════════════════════════════════════════ */
function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers]       = useState<OrgUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setUsers(await getOrgUsers()); }
    catch (err) { setError(parseApiError(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteOrgUser(confirmId);
      setUsers(u => u.filter(x => x.id !== confirmId));
      setStatusMsg({ msg: 'User removed successfully.', type: 'success' });
    } catch (err) {
      setStatusMsg({ msg: parseApiError(err), type: 'error' });
    } finally {
      setDeleting(false); setConfirmId(null);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleTogglePermission = async (userId: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    try {
      await updateUserUploadPermission(userId, nextVal);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, allow_global_upload: nextVal } : u));
      setStatusMsg({ msg: `Global upload permission ${nextVal ? 'granted' : 'revoked'} for user.`, type: 'success' });
    } catch (err) {
      setStatusMsg({ msg: parseApiError(err), type: 'error' });
    }
  };

  const confirmUser = users.find(u => u.id === confirmId);

  return (
    <>
      <AnimatePresence>
        {confirmId && (
          <ConfirmDialog
            message={`Remove ${confirmUser?.username || confirmUser?.email || 'this user'} (${confirmUser?.role}) from your organisation? This action cannot be undone.`}
            onConfirm={() => void handleDelete()}
            onCancel={() => setConfirmId(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
        style={{ ...glassPanel, padding: '1.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(0,210,200,0.10)', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
              Organisation Users
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {loading ? 'Loading…' : `${users.length} member${users.length !== 1 ? 's' : ''} in your org`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </Button>
        </div>

        {/* Status */}
        <AnimatePresence>
          {statusMsg && <div style={{ marginBottom: 14 }}><StatusMsg {...statusMsg} /></div>}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.22)', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>
            ⚠ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* User rows */}
        {!loading && users.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            No users found in your organisation.
          </div>
        )}

        {!loading && users.length > 0 && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            <div style={{ minWidth: 540, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 100px 90px 120px 70px', gap: 12, padding: '0 14px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 2 }}>
                <span>User</span>
                <span>Role</span>
                <span>Joined</span>
                <span>Global Upload</span>
                <span style={{ textAlign: 'right' }}>Action</span>
              </div>

              {users.map((u, i) => {
                const isSelf = u.id === me?.user_id;
                const displayName = u.username || u.email.split('@')[0];
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 100px 90px 120px 70px',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: 13,
                      background: isSelf ? 'rgba(0,210,200,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelf ? 'rgba(0,210,200,0.20)' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'background 0.18s',
                    }}
                  >
                    {/* User info (Name + Email) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-fg)', background: 'linear-gradient(135deg, rgba(0,210,200,0.28), rgba(168,85,247,0.22))', border: '1px solid rgba(0,210,200,0.22)' }}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                          {isSelf && <span style={{ marginLeft: 6, fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 500 }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                      </div>
                    </div>

                    {/* Role badge */}
                    <div><Badge role={u.role}>{u.role}</Badge></div>

                    {/* Joined */}
                    <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>

                    {/* Global Upload Permission Toggle */}
                    <div>
                      {u.role === 'User' ? (
                        <button
                          type="button"
                          onClick={() => void handleTogglePermission(u.id, !!u.allow_global_upload)}
                          title={u.allow_global_upload ? 'Revoke global upload permission' : 'Grant global upload permission'}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 8,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: u.allow_global_upload ? 'var(--success-dim)' : 'rgba(255,255,255,0.06)',
                            color: u.allow_global_upload ? 'var(--success)' : 'var(--muted)',
                            border: `1px solid ${u.allow_global_upload ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            transition: 'all 0.18s',
                            fontFamily: 'inherit',
                          }}
                        >
                          {u.allow_global_upload ? '✓ Allowed' : '✕ Disabled'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 500 }}>Always Allowed</span>
                      )}
                    </div>

                    {/* Delete */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        disabled={isSelf}
                        onClick={() => setConfirmId(u.id)}
                        title={isSelf ? 'Cannot remove your own account' : 'Remove user'}
                        style={{
                          padding: '5px 9px',
                          borderRadius: 8,
                          border: '1px solid rgba(248,113,113,0.22)',
                          background: 'var(--danger-dim)',
                          color: 'var(--danger)',
                          fontSize: '0.70rem',
                          fontWeight: 600,
                          cursor: isSelf ? 'not-allowed' : 'pointer',
                          opacity: isSelf ? 0.35 : 1,
                          transition: 'all 0.18s',
                          fontFamily: 'inherit',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 3 — DOCUMENTS
════════════════════════════════════════════════════════════════════════ */
function DocumentsTab() {
  const [docs, setDocs]               = useState<OrgDocument[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [statusMsg, setStatusMsg]     = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [confirmId, setConfirmId]     = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [viewingId, setViewingId]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setDocs(await getOrgDocuments()); }
    catch (err) { setError(parseApiError(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteOrgDocument(confirmId);
      setDocs(d => d.filter(x => x.id !== confirmId));
      setStatusMsg({ msg: 'Document and all its chunks deleted successfully.', type: 'success' });
    } catch (err) {
      setStatusMsg({ msg: parseApiError(err), type: 'error' });
    } finally {
      setDeleting(false); setConfirmId(null);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleViewDocument = async (docId: string, filename: string) => {
    const isBrowserViewable = /\.(pdf|txt|png|jpe?g|webp|html)$/i.test(filename);
    const isOfficeDoc = /\.(docx?|xlsx?|pptx?|csv)$/i.test(filename);

    if (isOfficeDoc) {
      setStatusMsg({
        msg: `Office file "${filename}" cannot be previewed in a browser tab. Downloading directly to your device...`,
        type: 'success',
      });
    }

    setViewingId(docId);
    try {
      const token = tokenStore.get();
      const res = await fetch(`${BASE_URL}/documents/global/${docId}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        let errDetail = 'Failed to load document';
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errDetail;
        } catch {
          errDetail = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errDetail);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      if (isBrowserViewable) {
        window.open(blobUrl, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
      }
    } catch (err) {
      setStatusMsg({
        msg: `Could not view/download "${filename}": ${String(err instanceof Error ? err.message : err)}`,
        type: 'error',
      });
    } finally {
      setViewingId(null);
    }
  };

  const confirmDoc = docs.find(d => d.id === confirmId);

  const fileExt = (name: string) => name.split('.').pop()?.toUpperCase() ?? 'FILE';
  const extColor: Record<string, string> = { PDF: '#00d2c8', DOCX: '#a855f7', PPTX: '#f97316', XLSX: '#22c55e', TXT: '#94a3b8', PNG: '#ec4899', JPG: '#ec4899', JPEG: '#ec4899' };

  return (
    <>
      <AnimatePresence>
        {confirmId && (
          <ConfirmDialog
            message={`Permanently delete "${confirmDoc?.file_name}"? This will remove all associated chunks from the vector store and cannot be undone.`}
            onConfirm={() => void handleDelete()}
            onCancel={() => setConfirmId(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
        style={{ ...glassPanel, padding: '1.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(0,210,200,0.10)', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
              Organisation Documents
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {loading ? 'Loading…' : `${docs.length} global document${docs.length !== 1 ? 's' : ''} indexed`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </Button>
        </div>

        {/* Status */}
        <AnimatePresence>
          {statusMsg && <div style={{ marginBottom: 14 }}><StatusMsg {...statusMsg} /></div>}
        </AnimatePresence>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.22)', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>
            ⚠ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && docs.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            No global documents indexed yet.
          </div>
        )}

        {/* Doc rows */}
        {!loading && docs.length > 0 && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            <div style={{ minWidth: 540, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Column header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 70px 110px 110px 140px', gap: 12, padding: '0 14px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 2 }}>
                <span>Document</span>
                <span>Pages</span>
                <span>Uploaded by</span>
                <span>Date</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>

              {docs.map((doc, i) => {
                const ext = fileExt(doc.file_name);
                const col = extColor[ext] ?? '#94a3b8';
                const isViewable = /\.(pdf|txt|png|jpe?g|webp|html)$/i.test(doc.file_name);
                const isCurrentViewing = viewingId === doc.id;

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 70px 110px 110px 140px',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: 13,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'background 0.18s',
                    }}
                  >
                    {/* File name + ext badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        flexShrink: 0, width: 34, height: 34, borderRadius: 9,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.05em',
                        color: col,
                        background: `${col}18`,
                        border: `1px solid ${col}30`,
                      }}>
                        {ext}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.file_name}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{doc.id}</div>
                      </div>
                    </div>

                    {/* Pages */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {doc.total_pages ?? '—'}
                    </div>

                    {/* Uploaded by */}
                    <div style={{ fontSize: '0.70rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.uploaded_by ?? '—'}
                    </div>

                    {/* Date */}
                    <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </div>

                    {/* Actions (View + Delete) */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        disabled={isCurrentViewing}
                        onClick={() => void handleViewDocument(doc.id, doc.file_name)}
                        title={isViewable ? 'Open document in new tab' : 'Download document to your computer'}
                        style={{
                          padding: '5px 9px',
                          borderRadius: 8,
                          border: '1px solid rgba(0,210,200,0.22)',
                          background: 'rgba(0,210,200,0.08)',
                          color: 'var(--accent)',
                          fontSize: '0.70rem',
                          fontWeight: 600,
                          cursor: isCurrentViewing ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.18s',
                          fontFamily: 'inherit',
                          opacity: isCurrentViewing ? 0.6 : 1,
                        }}
                      >
                        {isCurrentViewing ? '⏳…' : isViewable ? 'View ↗' : 'Download ↓'}
                      </button>

                      <button
                        onClick={() => setConfirmId(doc.id)}
                        title="Delete document and all chunks"
                        style={{
                          padding: '5px 9px',
                          borderRadius: 8,
                          border: '1px solid rgba(248,113,113,0.22)',
                          background: 'var(--danger-dim)',
                          color: 'var(--danger)',
                          fontSize: '0.70rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.18s',
                          fontFamily: 'inherit',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN PAGE — TABBED LAYOUT
════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview',   label: 'Overview',   icon: '⊞' },
  { id: 'users',      label: 'Users',      icon: '◈' },
  { id: 'documents',  label: 'Documents',  icon: '◆' },
] as const;
type TabId = typeof TABS[number]['id'];

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2rem 1rem calc(4rem + var(--bottom-tab-h, 0px))',
        overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── PAGE HEADER ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', background: 'linear-gradient(135deg, rgba(0,210,200,0.18), rgba(168,85,247,0.14))', border: '1px solid rgba(0,210,200,0.22)', boxShadow: '0 4px 16px rgba(0,210,200,0.14)' }}>⊞</div>
            <div>
              <h1 style={{ fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.15 }}>Admin Panel</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>Manage users, documents, roles and system configuration.</p>
            </div>
          </div>
        </motion.div>

        {/* ── TABS ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,210,200,0.10)', boxShadow: '0 2px 10px rgba(0,0,0,0.35) inset', width: 'fit-content', flexWrap: 'wrap' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 12,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '0.80rem', fontWeight: 500, transition: 'all 0.2s ease',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, rgba(0,210,200,0.16), rgba(168,85,247,0.12))'
                  : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                outline: activeTab === tab.id ? '1px solid rgba(0,210,200,0.24)' : 'none',
                boxShadow: activeTab === tab.id
                  ? '0 2px 10px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.08) inset'
                  : 'none',
              }}
            >
              <span style={{ fontSize: '0.82rem', color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* ── TAB CONTENT ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'overview'  && <OverviewTab />}
            {activeTab === 'users'     && <UsersTab />}
            {activeTab === 'documents' && <DocumentsTab />}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.38, letterSpacing: '0.04em' }}
        >
          Admin Panel · GlobalRAG Enterprise · Role-Based Access Control
        </motion.p>
      </div>
    </div>
  );
}
