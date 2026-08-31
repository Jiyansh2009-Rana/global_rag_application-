import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useContextHooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  getSuperAdminUsers,
  deleteSuperAdminUser,
  getSuperAdminDocuments,
  deleteSuperAdminDocument,
} from '@/api/super-admin';
import { parseApiError, BASE_URL, tokenStore } from '@/api/client';
import type { SuperAdminUser, SuperAdminDocument } from '@/api/types';

/* ─── shared glass card style ─── */
const glassPanel = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(168,85,247,0.04) 50%, rgba(0,210,200,0.025) 100%)',
  backdropFilter: 'blur(32px) saturate(170%)',
  WebkitBackdropFilter: 'blur(32px) saturate(170%)',
  border: '1px solid rgba(168,85,247,0.18)',
  borderTopColor: 'rgba(255,255,255,0.22)',
  borderRadius: 20,
  boxShadow: '0 8px 40px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.10) inset, 0 0 0 1px rgba(168,85,247,0.08)',
} as const;

/* ─── capability matrix ─── */
const GLOBAL_CAPABILITIES = [
  { capability: 'Query global index across own org',           user: true,  admin: true,  superAdmin: true  },
  { capability: 'Query local session index (Redis)',          user: true,  admin: true,  superAdmin: true  },
  { capability: 'Upload to local session (1h TTL)',           user: true,  admin: true,  superAdmin: true  },
  { capability: 'Upload to org global index (Neon)',          user: false, admin: true,  superAdmin: true  },
  { capability: 'View & manage own org users and documents',   user: false, admin: true,  superAdmin: true  },
  { capability: 'Access Global Super Admin Console',           user: false, admin: false, superAdmin: true  },
  { capability: 'View & delete cross-organisation users',     user: false, admin: false, superAdmin: true  },
  { capability: 'View & delete cross-organisation documents', user: false, admin: false, superAdmin: true  },
  { capability: 'Platform-wide audit logging & governance',   user: false, admin: false, superAdmin: true  },
];

function Tick({ yes }: { yes: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <span style={{
        fontSize: yes ? '1.05rem' : '0.85rem',
        color: yes ? 'var(--success)' : 'var(--border)',
        fontWeight: yes ? 700 : 400,
        filter: yes ? 'drop-shadow(0 0 5px rgba(52,211,153,0.55))' : 'none',
      }}>
        {yes ? '✓' : '—'}
      </span>
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
      <div style={{ marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(168,85,247,0.12)' }}>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)', marginBottom: subtitle ? 4 : 0 }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

/* ── Inline status ── */
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
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...glassPanel,
          padding: '1.75rem 1.75rem',
          maxWidth: 460, width: '100%',
          borderColor: 'rgba(248,113,113,0.30)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(248,113,113,0.15)',
        }}
      >
        <div style={{ fontSize: '1.6rem', marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
          Super Admin Global Action
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
            Confirm Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 1 — GLOBAL OVERVIEW
════════════════════════════════════════════════════════════════════════ */
function GlobalOverviewTab({
  users,
  documents,
  loading,
}: {
  users: SuperAdminUser[];
  documents: SuperAdminDocument[];
  loading: boolean;
}) {
  const { user } = useAuth();

  const uniqueOrgs = useMemo(() => {
    const orgs = new Set<string>();
    users.forEach(u => { if (u.org_id) orgs.add(u.org_id); });
    documents.forEach(d => { if (d.org_id) orgs.add(d.org_id); });
    return Array.from(orgs);
  }, [users, documents]);

  const totalPages = useMemo(() => {
    return documents.reduce((acc, d) => acc + (d.total_pages || 0), 0);
  }, [documents]);

  const adminCount = useMemo(() => {
    return users.filter(u => u.role === 'Admin' || u.role === 'Super Admin').length;
  }, [users]);

  const statCards = [
    { label: 'Global Users', value: loading ? '—' : String(users.length), sub: `${adminCount} Admins / Super Admins`, icon: '◈', color: '#00d2c8' },
    { label: 'Active Organisations', value: loading ? '—' : String(uniqueOrgs.length), sub: 'Isolated tenant boundaries', icon: '⊞', color: '#a855f7' },
    { label: 'Global Documents', value: loading ? '—' : String(documents.length), sub: 'Permanently indexed on Neon', icon: '◆', color: '#38bdf8' },
    { label: 'Total Pages Indexed', value: loading ? '—' : String(totalPages), sub: 'Chunked & vector embedded', icon: '⬡', color: '#34d399' },
  ];

  const infrastructureInfo = [
    { label: 'Global Vector Store',   value: 'pgvector on Neon PostgreSQL — multi-tenant isolation with global RLS policies', icon: '◆' },
    { label: 'Session Indexing',      value: 'Redis Cluster — 3600s TTL per-session ephemeral vector cache', icon: '◷' },
    { label: 'Auth & Audit Engine',   value: 'Supabase Registry + JWT HS256 with cross-tenant Super Admin escalation', icon: '⊠' },
    { label: 'Embedding & LLM Model', value: 'Jina Clip v2 (1024-dim) + Groq LLaMA 3.3 70B Versatile with page citations', icon: '◈' },
    { label: 'Super Admin Identity',  value: `${user?.email ?? '—'} (ID: ${user?.user_id ?? '—'})`, icon: '⚡' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Platform Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            style={{
              ...glassPanel,
              padding: '1.1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--muted)', fontWeight: 600 }}>
                {stat.label}
              </span>
              <span style={{ fontSize: '0.9rem', color: stat.color }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.85 }}>
              {stat.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Global Capability Matrix */}
      <SectionCard title="Global Permission & Governance Hierarchy" subtitle="Multi-tier access structure across organisations" delay={0.1}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
          <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(168,85,247,0.18)' }}>
                <th style={{ textAlign: 'left', padding: '0 0 12px 0', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--muted)', fontWeight: 500, width: '48%' }}>Permission</th>
                {['User', 'Admin', 'Super Admin'].map(r => (
                  <th key={r} style={{ padding: '0 8px 12px', textAlign: 'center', minWidth: 85 }}>
                    <Badge role={r}>{r}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GLOBAL_CAPABILITIES.map((row, i) => (
                <tr key={row.capability}
                  style={{ borderBottom: i < GLOBAL_CAPABILITIES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent' }}
                >
                  <td style={{ padding: '11px 0', fontSize: '0.80rem', color: 'var(--text-secondary)' }}>{row.capability}</td>
                  <td style={{ padding: '11px 8px' }}><Tick yes={row.user} /></td>
                  <td style={{ padding: '11px 8px' }}><Tick yes={row.admin} /></td>
                  <td style={{ padding: '11px 8px' }}><Tick yes={row.superAdmin} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Infrastructure Specs */}
      <SectionCard title="Platform Architecture & Infrastructure" subtitle="Active core services, cloud databases, and AI models" delay={0.15}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {infrastructureInfo.map(({ label, value, icon }, i) => (
            <div key={label}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '11px 0', borderBottom: i < infrastructureInfo.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', flexWrap: 'wrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 150, flexShrink: 0 }}>
                <span style={{ color: '#c084fc', fontSize: '0.74rem' }}>{icon}</span>
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
   TAB 2 — ALL USERS & ADMINS
════════════════════════════════════════════════════════════════════════ */
function AllUsersTab({
  users,
  loading,
  onRefresh,
  onDelete,
}: {
  users: SuperAdminUser[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [orgFilter, setOrgFilter] = useState<string>('ALL');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const orgs = useMemo(() => {
    const s = new Set<string>();
    users.forEach(u => { if (u.org_id) s.add(u.org_id); });
    return Array.from(s);
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.id.toLowerCase().includes(search.toLowerCase()) ||
        (u.org_id && u.org_id.toLowerCase().includes(search.toLowerCase()));
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchOrg  = orgFilter === 'ALL'  || u.org_id === orgFilter;
      return matchSearch && matchRole && matchOrg;
    });
  }, [users, search, roleFilter, orgFilter]);

  const confirmUser = users.find(u => u.id === confirmId);

  const handleConfirmDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await onDelete(confirmId);
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {confirmId && (
          <ConfirmDialog
            message={`Permanently delete user "${confirmUser?.email}" (${confirmUser?.role} · Org: ${confirmUser?.org_id ?? 'None'}) platform-wide? This cannot be undone.`}
            onConfirm={() => void handleConfirmDelete()}
            onCancel={() => setConfirmId(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
        style={{ ...glassPanel, padding: '1.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(168,85,247,0.12)', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
              Platform Users & Admins
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {loading ? 'Loading…' : `${filteredUsers.length} of ${users.length} cross-org accounts found`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </Button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <input
            type="text"
            placeholder="Search email, user ID, or org..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.20)',
              color: 'var(--text)', fontSize: '0.78rem', outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(20,20,30,0.85)', border: '1px solid rgba(168,85,247,0.20)',
              color: 'var(--text)', fontSize: '0.78rem', outline: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>

          <select
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(20,20,30,0.85)', border: '1px solid rgba(168,85,247,0.20)',
              color: 'var(--text)', fontSize: '0.78rem', outline: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <option value="ALL">All Organisations</option>
            {orgs.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filteredUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            No users match the search filters.
          </div>
        )}

        {/* Table Rows */}
        {!loading && filteredUsers.length > 0 && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            <div style={{ minWidth: 520, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 110px 110px 100px 80px', gap: 12, padding: '0 14px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 2 }}>
                <span>User</span>
                <span>Role</span>
                <span>Organisation</span>
                <span>Joined</span>
                <span style={{ textAlign: 'right' }}>Action</span>
              </div>

              {filteredUsers.map((u, i) => {
                const isSelf = u.id === me?.user_id;
                const isSuper = u.role === 'Super Admin';
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 110px 110px 100px 80px',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: 13,
                      background: isSelf ? 'rgba(168,85,247,0.09)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelf ? 'rgba(168,85,247,0.30)' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'background 0.18s',
                    }}
                  >
                    {/* Email & ID */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                        background: isSuper
                          ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                          : 'linear-gradient(135deg, rgba(0,210,200,0.35), rgba(168,85,247,0.25))',
                        border: `1px solid ${isSuper ? '#ec4899' : 'rgba(0,210,200,0.3)'}`,
                      }}>
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.email}
                          {isSelf && <span style={{ marginLeft: 6, fontSize: '0.62rem', color: '#a855f7', fontWeight: 600 }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{u.id.slice(0, 14)}…</div>
                      </div>
                    </div>

                    {/* Role */}
                    <div><Badge role={u.role}>{u.role}</Badge></div>

                    {/* Org */}
                    <div style={{ fontSize: '0.75rem', color: u.org_id ? 'var(--text-secondary)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.org_id ? (
                        <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(0,210,200,0.08)', border: '1px solid rgba(0,210,200,0.18)', color: 'var(--accent)', fontSize: '0.70rem' }}>
                          {u.org_id}
                        </span>
                      ) : '—'}
                    </div>

                    {/* Joined */}
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>

                    {/* Delete Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        disabled={isSelf}
                        onClick={() => setConfirmId(u.id)}
                        title={isSelf ? 'Cannot delete your own account' : 'Globally delete user'}
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
   TAB 3 — ALL GLOBAL DOCUMENTS
════════════════════════════════════════════════════════════════════════ */
function AllDocumentsTab({
  documents,
  loading,
  onRefresh,
  onDelete,
}: {
  documents: SuperAdminDocument[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('ALL');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [docStatusMsg, setDocStatusMsg] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const orgs = useMemo(() => {
    const s = new Set<string>();
    documents.forEach(d => { if (d.org_id) s.add(d.org_id); });
    return Array.from(s);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchSearch =
        d.file_name.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        (d.org_id && d.org_id.toLowerCase().includes(search.toLowerCase())) ||
        (d.uploaded_by && d.uploaded_by.toLowerCase().includes(search.toLowerCase()));
      const matchOrg = orgFilter === 'ALL' || d.org_id === orgFilter;
      return matchSearch && matchOrg;
    });
  }, [documents, search, orgFilter]);

  const confirmDoc = documents.find(d => d.id === confirmId);

  const fileExt = (name: string) => name.split('.').pop()?.toUpperCase() ?? 'FILE';
  const extColor: Record<string, string> = {
    PDF: '#00d2c8', DOCX: '#a855f7', PPTX: '#f97316', XLSX: '#22c55e', TXT: '#94a3b8', PNG: '#ec4899', JPG: '#ec4899', JPEG: '#ec4899', HTML: '#eab308'
  };

  const handleConfirmDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await onDelete(confirmId);
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  const handleViewDocument = async (docId: string, filename: string) => {
    const isBrowserViewable = /\.(pdf|txt|png|jpe?g|webp|html)$/i.test(filename);
    const isOfficeDoc = /\.(docx?|xlsx?|pptx?|csv)$/i.test(filename);

    if (isOfficeDoc) {
      setDocStatusMsg({
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
      setDocStatusMsg({
        msg: `Could not view/download "${filename}": ${String(err instanceof Error ? err.message : err)}`,
        type: 'error',
      });
    } finally {
      setViewingId(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {confirmId && (
          <ConfirmDialog
            message={`Permanently purge "${confirmDoc?.file_name}" (Org: ${confirmDoc?.org_id ?? 'None'}) from the platform? All Neon vector chunks, Supabase page registries and document indices will be deleted globally.`}
            onConfirm={() => void handleConfirmDelete()}
            onCancel={() => setConfirmId(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
        style={{ ...glassPanel, padding: '1.5rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(168,85,247,0.12)', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif', fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
              Global Platform Documents
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {loading ? 'Loading…' : `${filteredDocs.length} of ${documents.length} cross-org documents indexed`}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </Button>
        </div>

        {/* Doc Status Msg */}
        <AnimatePresence>
          {docStatusMsg && (
            <div style={{ marginBottom: 12 }}>
              <StatusMsg {...docStatusMsg} />
            </div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <input
            type="text"
            placeholder="Search document name, doc ID, uploader, or org..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.20)',
              color: 'var(--text)', fontSize: '0.78rem', outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          <select
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(20,20,30,0.85)', border: '1px solid rgba(168,85,247,0.20)',
              color: 'var(--text)', fontSize: '0.78rem', outline: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <option value="ALL">All Organisations</option>
            {orgs.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filteredDocs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            No documents match the search filters.
          </div>
        )}

        {/* Table Rows */}
        {!loading && filteredDocs.length > 0 && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            <div style={{ minWidth: 600, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Column header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 100px 70px 100px 90px 130px', gap: 12, padding: '0 14px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: 2 }}>
                <span>Document</span>
                <span>Organisation</span>
                <span>Pages</span>
                <span>Uploaded By</span>
                <span>Date</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>

              {filteredDocs.map((doc, i) => {
                const ext = fileExt(doc.file_name);
                const col = extColor[ext] ?? '#94a3b8';
                const isViewable = /\.(pdf|txt|png|jpe?g|webp|html)$/i.test(doc.file_name);
                const isCurrentViewing = viewingId === doc.id;

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 100px 70px 100px 90px 130px',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: 13,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'background 0.18s',
                    }}
                  >
                    {/* File badge & Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        flexShrink: 0, width: 34, height: 34, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.05em',
                        color: col, background: `${col}18`, border: `1px solid ${col}30`,
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

                    {/* Org */}
                    <div>
                      {doc.org_id ? (
                        <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc', fontSize: '0.70rem', fontWeight: 500 }}>
                          {doc.org_id}
                        </span>
                      ) : '—'}
                    </div>

                    {/* Pages */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {doc.total_pages ?? '—'}
                    </div>

                    {/* Uploaded By */}
                    <div style={{ fontSize: '0.70rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.uploaded_by ?? '—'}
                    </div>

                    {/* Date */}
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        disabled={isCurrentViewing}
                        onClick={() => void handleViewDocument(doc.id, doc.file_name)}
                        title={isViewable ? 'Open document in new tab' : 'Download document to your computer'}
                        style={{
                          padding: '5px 9px',
                          borderRadius: 8,
                          border: '1px solid rgba(168,85,247,0.30)',
                          background: 'rgba(168,85,247,0.10)',
                          color: '#c084fc',
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
                        title="Globally delete document and all vector chunks"
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
   SUPER ADMIN PAGE — ROOT COMPONENT
════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview',   label: 'Global Overview', icon: '⊞' },
  { id: 'users',      label: 'All Users & Admins', icon: '◈' },
  { id: 'documents',  label: 'All Documents',  icon: '◆' },
] as const;
type TabId = typeof TABS[number]['id'];

export function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [documents, setDocuments] = useState<SuperAdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([
        getSuperAdminUsers(),
        getSuperAdminDocuments(),
      ]);
      setUsers(u);
      setDocuments(d);
    } catch (err) {
      setStatusMsg({ msg: parseApiError(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteSuperAdminUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setStatusMsg({ msg: 'User globally removed from platform.', type: 'success' });
    } catch (err) {
      setStatusMsg({ msg: parseApiError(err), type: 'error' });
    } finally {
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteSuperAdminDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setStatusMsg({ msg: 'Document and all chunks deleted globally.', type: 'success' });
    } catch (err) {
      setStatusMsg({ msg: parseApiError(err), type: 'error' });
    } finally {
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

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
      <div style={{ width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.30), rgba(236,72,153,0.22))',
                border: '1px solid rgba(168,85,247,0.35)',
                boxShadow: '0 4px 20px rgba(168,85,247,0.25)',
              }}>
                ⚡
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: '"Comfortaa", "Outfit", "Plus Jakarta Sans", sans-serif', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.15 }}>
                    Super Admin Console
                  </h1>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: '0.60rem', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: 'rgba(236,72,153,0.14)', color: '#f472b6',
                    border: '1px solid rgba(236,72,153,0.30)',
                  }}>
                    Global Root
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>
                  Cross-organisation administration, tenant governance, and global data control.
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => void loadAllData()} disabled={loading}>
              {loading ? 'Refreshing…' : '↻ Refresh All'}
            </Button>
          </div>
        </motion.div>

        {/* Global Status Banner */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <StatusMsg {...statusMsg} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{
            display: 'flex', gap: 6, padding: 5, borderRadius: 16,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.18)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.35) inset', width: 'fit-content', flexWrap: 'wrap',
          }}
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
                  ? 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(0,210,200,0.14))'
                  : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                outline: activeTab === tab.id ? '1px solid rgba(168,85,247,0.35)' : 'none',
                boxShadow: activeTab === tab.id
                  ? '0 2px 10px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.08) inset'
                  : 'none',
              }}
            >
              <span style={{ fontSize: '0.82rem', color: activeTab === tab.id ? '#c084fc' : 'var(--muted)' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'overview'  && (
              <GlobalOverviewTab
                users={users}
                documents={documents}
                loading={loading}
              />
            )}
            {activeTab === 'users'     && (
              <AllUsersTab
                users={users}
                loading={loading}
                onRefresh={() => void loadAllData()}
                onDelete={handleDeleteUser}
              />
            )}
            {activeTab === 'documents' && (
              <AllDocumentsTab
                documents={documents}
                loading={loading}
                onRefresh={() => void loadAllData()}
                onDelete={handleDeleteDocument}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.38, letterSpacing: '0.04em' }}
        >
          Super Admin Console · Cross-Tenant Global Access · Strict Audit Governance
        </motion.p>
      </div>
    </div>
  );
}
