import { useState, useEffect, useRef, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   API LAYER — all backend calls go through here
───────────────────────────────────────────────────────────────────────────── */
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api/v1';

const api = {
  async post(path, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
    return data;
  },
  async postForm(path, formData, token) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
    return data;
  },
  async get(path, token, params = {}) {
    const url = new URL(`${BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
    return data;
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   ERROR MESSAGE MAPPER
───────────────────────────────────────────────────────────────────────────── */
function friendlyError(raw) {
  if (!raw) return 'An unexpected error occurred.';
  const s = String(raw);
  if (s.includes('unique_admin_per_org'))
    return 'This organisation already has an admin — please contact your admin.';
  if (s.includes('unique_super_admin_global'))
    return 'A Super Admin already exists — your role cannot be Super Admin.';
  if (s.includes('Email already registered'))
    return 'This email is already registered. Please sign in.';
  if (s.includes('Invalid credentials'))
    return 'Invalid email or password.';
  return s;
}

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES  (injected once via <style> tag)
───────────────────────────────────────────────────────────────────────────── */
const CSS = /* css */`
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #07100f;
  --bg2: #0a1714;
  --text: #f0fdf9;
  --muted: #7eada6;
  --accent: #2dd4bf;
  --accent2: #14b8a6;
  --danger: #f87171;
  --success: #34d399;
  --warning: #fbbf24;
  --radius: 14px;
  --radius-sm: 8px;
  --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --ease: cubic-bezier(0.4,0,0.2,1);
}

html, body { height: 100%; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ── ANIMATED MESH GRADIENT BACKGROUND ── */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%,  rgba(45,212,191,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 80% 80%,  rgba(79,172,254,0.06) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 60% 30%,  rgba(20,184,166,0.05) 0%, transparent 50%),
    radial-gradient(ellipse 40% 35% at 10% 70%,  rgba(16,185,129,0.04) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
  animation: meshShift 18s ease-in-out infinite alternate;
}
@keyframes meshShift {
  0%   { opacity: 1;    transform: scale(1)    rotate(0deg); }
  50%  { opacity: 0.85; transform: scale(1.05) rotate(1deg); }
  100% { opacity: 1;    transform: scale(1)    rotate(0deg); }
}

/* ── NOISE GRAIN OVERLAY ── */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
  opacity: 0.45;
  pointer-events: none;
  z-index: 0;
}

/* ── AMBIENT ORB ACCENTS ── */
.glow-tl {
  position: fixed; top: -280px; left: -280px;
  width: 800px; height: 800px; border-radius: 50%;
  background: radial-gradient(circle, rgba(45,212,191,0.11) 0%, transparent 65%);
  pointer-events: none; z-index: 0;
  animation: orbFloat 10s ease-in-out infinite alternate;
}
.glow-br {
  position: fixed; bottom: -200px; right: -200px;
  width: 650px; height: 650px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,172,254,0.08) 0%, transparent 65%);
  pointer-events: none; z-index: 0;
  animation: orbFloat 14s ease-in-out infinite alternate-reverse;
}
@keyframes orbFloat {
  0%   { transform: translate(0, 0)     scale(1); }
  50%  { transform: translate(30px,20px) scale(1.04); }
  100% { transform: translate(0, 0)     scale(1); }
}

/* ── LAYOUT ── */
#root { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; }

/* ─────────────────────────────────────────────────────────────────────────────
   GLASS SYSTEM  (every frosted surface uses these tokens)
───────────────────────────────────────────────────────────────────────────── */

/* Base glass — used on all cards */
.glass {
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.07) 0%,
    rgba(255,255,255,0.03) 100%
  );
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255,255,255,0.12);
  border-top-color: rgba(255,255,255,0.18);
  border-left-color: rgba(255,255,255,0.14);
  border-radius: var(--radius);
  box-shadow:
    0 8px 32px rgba(0,0,0,0.35),
    0 1px 0   rgba(255,255,255,0.06) inset,
    0 -1px 0  rgba(0,0,0,0.2) inset;
}

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(45,212,191,0.2);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(45,212,191,0.35); }

/* ─────────────────────────────────────────────────────────────────────────────
   NAVBAR  — frosted glass bar
───────────────────────────────────────────────────────────────────────────── */
.navbar {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2.5rem; height: 64px;
  background: linear-gradient(
    180deg,
    rgba(15,30,27,0.75) 0%,
    rgba(10,22,20,0.65) 100%
  );
  backdrop-filter: blur(32px) saturate(170%);
  -webkit-backdrop-filter: blur(32px) saturate(170%);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 4px 24px rgba(0,0,0,0.3);
}
.nav-logo { display: flex; align-items: center; gap: 0.625rem; }
.nav-logo-badge {
  width: 30px; height: 30px; border-radius: 8px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem; font-weight: 800; color: #042220; letter-spacing: 0.05em;
  box-shadow: 0 0 12px rgba(45,212,191,0.4);
}
.nav-logo-text { font-size: 0.95rem; font-weight: 600; letter-spacing: -0.02em; }
.nav-logo-text span { color: var(--accent); }
.nav-right { display: flex; align-items: center; gap: 0.75rem; }
.nav-pill {
  padding: 0.375rem 0.875rem; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(10px);
  color: var(--muted); font-size: 0.78rem; font-family: var(--font);
  cursor: pointer; transition: all 0.2s var(--ease);
}
.nav-pill:hover {
  color: var(--text);
  border-color: rgba(45,212,191,0.3);
  background: rgba(45,212,191,0.07);
  box-shadow: 0 0 12px rgba(45,212,191,0.1);
}
.profile-avatar {
  width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; color: #042220;
  border: 2px solid rgba(255,255,255,0.15);
  transition: all 0.25s var(--ease);
  position: relative;
  box-shadow: 0 0 0 0 rgba(45,212,191,0);
}
.profile-avatar:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(45,212,191,0.2), 0 0 20px rgba(45,212,191,0.3);
  transform: scale(1.08);
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROFILE DROPDOWN  — deep glass panel
───────────────────────────────────────────────────────────────────────────── */
.profile-dropdown {
  position: absolute; top: calc(100% + 12px); right: 0;
  width: 290px; z-index: 200;
  padding: 1.25rem;
  background: linear-gradient(145deg, rgba(18,38,34,0.88) 0%, rgba(10,22,20,0.94) 100%);
  backdrop-filter: blur(48px) saturate(200%);
  -webkit-backdrop-filter: blur(48px) saturate(200%);
  border: 1px solid rgba(255,255,255,0.13);
  border-top-color: rgba(255,255,255,0.22);
  border-radius: var(--radius);
  box-shadow:
    0 24px 64px rgba(0,0,0,0.55),
    0 1px 0  rgba(255,255,255,0.1) inset,
    0 0 0 1px rgba(45,212,191,0.08);
  animation: dropIn 0.2s var(--ease);
}
@keyframes dropIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)     scale(1); }
}
.profile-dropdown-header {
  display: flex; align-items: center; gap: 0.875rem; margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.profile-avatar-lg {
  width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 700; color: #042220;
  box-shadow: 0 0 16px rgba(45,212,191,0.35);
}
.profile-name { font-size: 0.875rem; font-weight: 600; line-height: 1.3; }
.profile-role {
  font-size: 0.7rem; margin-top: 3px; padding: 0.18rem 0.55rem;
  border-radius: 999px;
  background: rgba(45,212,191,0.14);
  border: 1px solid rgba(45,212,191,0.25);
  color: var(--accent); display: inline-block; font-weight: 600;
  letter-spacing: 0.04em;
}
.profile-info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.55rem 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 0.8rem;
}
.profile-info-row:last-of-type { border-bottom: none; }
.profile-info-label { color: var(--muted); }
.profile-info-value { font-weight: 500; font-size: 0.78rem; }
.profile-logout-btn {
  width: 100%; margin-top: 1rem; padding: 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(248,113,113,0.25);
  background: rgba(248,113,113,0.07);
  backdrop-filter: blur(10px);
  color: var(--danger); font-size: 0.82rem; font-family: var(--font);
  cursor: pointer; transition: all 0.2s var(--ease);
  font-weight: 500;
}
.profile-logout-btn:hover {
  background: rgba(248,113,113,0.15);
  border-color: rgba(248,113,113,0.5);
  box-shadow: 0 0 16px rgba(248,113,113,0.12);
}

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH  LAYOUT
───────────────────────────────────────────────────────────────────────────── */
.auth-layout {
  flex: 1; display: grid;
  grid-template-columns: 1fr 480px;
  gap: 0; min-height: calc(100vh - 64px);
}
.hero-side {
  display: flex; flex-direction: column; justify-content: center;
  padding: 4rem 3rem 4rem 4rem;
}
.hero-tag {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--accent); margin-bottom: 2rem;
}
.hero-tag-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent); animation: pulse 2s infinite;
  box-shadow: 0 0 8px var(--accent);
}
@keyframes pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.8); }
}
.hero-title {
  font-size: clamp(2.2rem, 4vw, 3.5rem);
  font-weight: 600; line-height: 1.1;
  letter-spacing: -0.04em; margin-bottom: 1.5rem;
  max-width: 560px;
}
.hero-title em { font-style: normal; color: var(--accent); }
.hero-sub {
  color: var(--muted); font-size: 1rem; line-height: 1.65;
  max-width: 480px; margin-bottom: 2.5rem;
}
.hero-features { list-style: none; display: flex; flex-direction: column; gap: 0.875rem; }
.hero-features li {
  display: flex; align-items: center; gap: 0.875rem;
  font-size: 0.875rem; color: var(--muted);
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  backdrop-filter: blur(8px);
  transition: all 0.2s var(--ease);
}
.hero-features li:hover {
  background: rgba(45,212,191,0.05);
  border-color: rgba(45,212,191,0.15);
  color: var(--text);
}
.feat-dot {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
  background: var(--accent); box-shadow: 0 0 6px rgba(45,212,191,0.6);
}
.hero-footer {
  margin-top: auto; padding-top: 3rem;
  font-size: 0.72rem; color: rgba(126,173,166,0.45);
  letter-spacing: 0.03em;
}
.hero-footer span { margin: 0 0.5rem; }

/* ── AUTH CARD SIDE ── */
.auth-side {
  display: flex; align-items: center; justify-content: center;
  padding: 2rem;
  background: linear-gradient(
    180deg,
    rgba(12,28,24,0.35) 0%,
    rgba(7,16,15,0.15) 100%
  );
  border-left: 1px solid rgba(255,255,255,0.07);
}
.auth-card {
  width: 100%; max-width: 420px;
  padding: 2.25rem 2rem 2rem;
  background: linear-gradient(
    145deg,
    rgba(255,255,255,0.08) 0%,
    rgba(255,255,255,0.03) 60%,
    rgba(45,212,191,0.03) 100%
  );
  backdrop-filter: blur(36px) saturate(175%);
  -webkit-backdrop-filter: blur(36px) saturate(175%);
  border: 1px solid rgba(255,255,255,0.13);
  border-top-color: rgba(255,255,255,0.2);
  border-radius: 20px;
  box-shadow:
    0 24px 64px rgba(0,0,0,0.5),
    0 1px 0 rgba(255,255,255,0.1) inset,
    0 0 0 1px rgba(45,212,191,0.06);
}

/* ── AUTH TABS ── */
.auth-tabs {
  display: flex;
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px);
  border-radius: 12px; padding: 3px; margin-bottom: 2rem;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2) inset;
}
.auth-tab {
  flex: 1; padding: 0.625rem; border-radius: 10px; border: none;
  background: transparent; color: var(--muted);
  font-size: 0.82rem; font-family: var(--font); font-weight: 500;
  cursor: pointer; transition: all 0.22s var(--ease);
}
.auth-tab.active {
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
  color: var(--text);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.08) inset;
  border: 1px solid rgba(255,255,255,0.1);
}

/* ── FORM ── */
.auth-heading { font-size: 1.35rem; font-weight: 600; margin-bottom: 0.375rem; letter-spacing: -0.025em; }
.auth-subheading { font-size: 0.82rem; color: var(--muted); line-height: 1.5; margin-bottom: 1.75rem; }

.form-group { margin-bottom: 1.1rem; }
.form-label { display: block; font-size: 0.77rem; color: var(--muted); margin-bottom: 0.45rem; font-weight: 500; }
.form-input {
  width: 100%; padding: 0.72rem 0.95rem;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: var(--radius-sm);
  color: var(--text); font-size: 0.88rem; font-family: var(--font);
  outline: none; transition: all 0.22s var(--ease);
  appearance: none;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15) inset;
}
.form-input:focus {
  border-color: rgba(45,212,191,0.45);
  background: rgba(45,212,191,0.04);
  box-shadow: 0 0 0 3px rgba(45,212,191,0.12), 0 2px 6px rgba(0,0,0,0.15) inset;
}
.form-input::placeholder { color: rgba(126,173,166,0.35); }
.form-input option { background: #0d201d; color: var(--text); }

/* ── PRIMARY BUTTON ── */
.btn-primary {
  width: 100%; padding: 0.78rem; margin-top: 0.5rem;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
  color: #031f1c; font-size: 0.88rem; font-weight: 700;
  font-family: var(--font); border: none; border-radius: var(--radius-sm);
  cursor: pointer; transition: all 0.22s var(--ease);
  letter-spacing: 0.01em;
  box-shadow: 0 4px 16px rgba(45,212,191,0.25), 0 1px 0 rgba(255,255,255,0.15) inset;
  position: relative; overflow: hidden;
}
.btn-primary::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.btn-primary:hover {
  filter: brightness(1.12);
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(45,212,191,0.38), 0 1px 0 rgba(255,255,255,0.15) inset;
}
.btn-primary:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(45,212,191,0.2); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; filter: none; box-shadow: none; }

/* ── ALERTS ── */
.alert {
  padding: 0.8rem 1rem; border-radius: var(--radius-sm);
  font-size: 0.82rem; line-height: 1.55; margin-bottom: 1.25rem;
  border: 1px solid;
  backdrop-filter: blur(12px);
}
.alert-error   { background: rgba(248,113,113,0.09); border-color: rgba(248,113,113,0.22); color: var(--danger);  box-shadow: 0 0 20px rgba(248,113,113,0.06); }
.alert-success { background: rgba(52,211,153,0.09);  border-color: rgba(52,211,153,0.22);  color: var(--success); box-shadow: 0 0 20px rgba(52,211,153,0.06); }
.alert-warning { background: rgba(251,191,36,0.08);  border-color: rgba(251,191,36,0.22);  color: var(--warning); box-shadow: 0 0 20px rgba(251,191,36,0.06); }

/* ── LOADING SPINNER ── */
.spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(4,34,32,0.25);
  border-top-color: rgba(4,34,32,0.85);
  animation: spin 0.6s linear infinite;
  display: inline-block; vertical-align: middle; margin-right: 0.5rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────────────────────────────────────── */
.dashboard { flex: 1; display: flex; flex-direction: column; }
.dashboard-body { flex: 1; display: flex; }

/* ── SIDEBAR  — glass panel ── */
.sidebar {
  width: 224px; flex-shrink: 0; padding: 1.5rem 0.875rem;
  background: linear-gradient(
    180deg,
    rgba(14,30,27,0.55) 0%,
    rgba(10,22,20,0.45) 100%
  );
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border-right: 1px solid rgba(255,255,255,0.07);
  box-shadow: 1px 0 0 rgba(255,255,255,0.04) inset;
  display: flex; flex-direction: column; gap: 0.2rem;
}
.sidebar-label {
  font-size: 0.63rem; text-transform: uppercase; letter-spacing: 0.12em;
  color: rgba(126,173,166,0.5); padding: 0.375rem 0.875rem;
  margin-bottom: 0.25rem; margin-top: 0.5rem;
}
.sidebar-btn {
  width: 100%; text-align: left; padding: 0.625rem 0.875rem;
  border-radius: 10px; border: none; background: transparent;
  color: var(--muted); font-size: 0.82rem; font-family: var(--font);
  cursor: pointer; transition: all 0.18s var(--ease);
  display: flex; align-items: center; gap: 0.65rem;
  position: relative; overflow: hidden;
}
.sidebar-btn::before {
  content: '';
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 0; height: 60%; border-radius: 0 3px 3px 0;
  background: var(--accent);
  transition: width 0.18s var(--ease);
}
.sidebar-btn:hover {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(10px);
  color: var(--text);
}
.sidebar-btn.active {
  background: linear-gradient(90deg, rgba(45,212,191,0.12) 0%, rgba(45,212,191,0.04) 100%);
  border: 1px solid rgba(45,212,191,0.15);
  color: var(--text); font-weight: 500;
}
.sidebar-btn.active::before { width: 3px; }
.sidebar-btn .sb-icon { font-size: 1rem; }

/* ── MAIN CONTENT AREA ── */
.main-content { flex: 1; padding: 2rem 2.5rem; overflow-y: auto; }

.page-header { margin-bottom: 2rem; }
.page-title { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.025em; }
.page-sub { color: var(--muted); font-size: 0.85rem; margin-top: 0.3rem; }

/* ── STAT CARDS  — glass tiles ── */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.stat-card {
  padding: 1.4rem 1.5rem;
  background: linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(255,255,255,0.1);
  border-top-color: rgba(255,255,255,0.16);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset;
  transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease);
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 32px rgba(0,0,0,0.38), 0 0 20px rgba(45,212,191,0.08);
}
.stat-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); margin-bottom: 0.6rem; }
.stat-value { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.03em; }
.stat-accent { color: var(--accent); text-shadow: 0 0 20px rgba(45,212,191,0.3); }

/* ── RAG QUERY BOX  — glass panel ── */
.query-box {
  padding: 1.75rem; margin-bottom: 1.5rem;
  background: linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255,255,255,0.1);
  border-top-color: rgba(255,255,255,0.16);
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset;
}
.query-controls { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.query-select {
  padding: 0.5rem 0.9rem;
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: var(--radius-sm);
  color: var(--text); font-size: 0.82rem; font-family: var(--font);
  outline: none; cursor: pointer; transition: all 0.2s var(--ease);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15) inset;
}
.query-select:focus {
  border-color: rgba(45,212,191,0.4);
  box-shadow: 0 0 0 3px rgba(45,212,191,0.1);
}
.query-select option { background: #0d201d; }

.query-row { display: flex; gap: 0.75rem; align-items: flex-start; }
.query-textarea {
  flex: 1; min-height: 88px; padding: 0.8rem 1rem;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: var(--radius-sm); color: var(--text); font-size: 0.88rem;
  font-family: var(--font); resize: vertical; outline: none;
  transition: all 0.22s var(--ease); line-height: 1.65;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15) inset;
}
.query-textarea:focus {
  border-color: rgba(45,212,191,0.4);
  background: rgba(45,212,191,0.03);
  box-shadow: 0 0 0 3px rgba(45,212,191,0.1), 0 2px 6px rgba(0,0,0,0.15) inset;
}
.query-textarea::placeholder { color: rgba(126,173,166,0.3); }
.btn-query {
  padding: 0.78rem 1.5rem;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #031f1c; font-weight: 700; font-family: var(--font); font-size: 0.85rem;
  border: none; border-radius: var(--radius-sm); cursor: pointer;
  transition: all 0.2s var(--ease); white-space: nowrap;
  box-shadow: 0 4px 16px rgba(45,212,191,0.25), 0 1px 0 rgba(255,255,255,0.15) inset;
  position: relative; overflow: hidden;
}
.btn-query::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 55%);
  pointer-events: none;
}
.btn-query:hover { filter: brightness(1.1); box-shadow: 0 6px 24px rgba(45,212,191,0.35); }
.btn-query:disabled { opacity: 0.5; cursor: not-allowed; filter: none; box-shadow: none; }

/* ── ANSWER CARD ── */
.answer-card {
  padding: 1.75rem; margin-bottom: 1.5rem;
  background: linear-gradient(145deg, rgba(255,255,255,0.065) 0%, rgba(45,212,191,0.025) 100%);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(45,212,191,0.15);
  border-top-color: rgba(45,212,191,0.22);
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(45,212,191,0.06);
}
.answer-meta {
  display: flex; gap: 0.625rem; flex-wrap: wrap; margin-bottom: 1rem;
  font-size: 0.72rem; color: var(--muted);
}
.answer-meta span {
  padding: 0.22rem 0.65rem; border-radius: 999px;
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.08);
}
.answer-text { font-size: 0.92rem; line-height: 1.78; color: var(--text); white-space: pre-wrap; }

/* ── SOURCE CHIPS ── */
.sources-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 1.25rem 0 0.75rem; }
.source-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.source-chip {
  padding: 0.3rem 0.8rem; border-radius: 999px;
  background: rgba(45,212,191,0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(45,212,191,0.25);
  color: var(--accent); font-size: 0.75rem; cursor: pointer;
  transition: all 0.18s var(--ease);
}
.source-chip:hover {
  background: rgba(45,212,191,0.2);
  box-shadow: 0 0 14px rgba(45,212,191,0.2);
  transform: translateY(-1px);
}

/* ─────────────────────────────────────────────────────────────────────────────
   SOURCE MODAL — deep glass
───────────────────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(12px) saturate(140%);
  display: flex; align-items: center; justify-content: center; padding: 2rem;
  animation: fadeIn 0.18s var(--ease);
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-card {
  width: 100%; max-width: 620px; max-height: 80vh; overflow-y: auto;
  padding: 2rem;
  background: linear-gradient(145deg, rgba(18,40,36,0.9) 0%, rgba(10,24,21,0.95) 100%);
  backdrop-filter: blur(48px) saturate(200%);
  -webkit-backdrop-filter: blur(48px) saturate(200%);
  border: 1px solid rgba(255,255,255,0.14);
  border-top-color: rgba(255,255,255,0.22);
  border-radius: 18px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.08) inset;
  animation: modalPop 0.22s var(--ease);
}
@keyframes modalPop {
  from { opacity: 0; transform: scale(0.96) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}
.modal-close {
  float: right; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; width: 28px; height: 28px; display: inline-flex;
  align-items: center; justify-content: center;
  color: var(--muted); font-size: 0.9rem; cursor: pointer; line-height: 1;
  transition: all 0.2s; backdrop-filter: blur(8px);
}
.modal-close:hover { color: var(--text); background: rgba(255,255,255,0.1); }

/* ─────────────────────────────────────────────────────────────────────────────
   UPLOAD PAGE
───────────────────────────────────────────────────────────────────────────── */
.upload-area {
  border: 2px dashed rgba(255,255,255,0.1);
  border-radius: var(--radius);
  padding: 3rem 2rem; text-align: center; cursor: pointer;
  background: rgba(255,255,255,0.02);
  backdrop-filter: blur(18px);
  transition: all 0.25s var(--ease); position: relative;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2) inset;
}
.upload-area:hover {
  border-color: rgba(45,212,191,0.4);
  background: rgba(45,212,191,0.04);
  box-shadow: 0 0 30px rgba(45,212,191,0.08), 0 4px 20px rgba(0,0,0,0.2) inset;
}
.upload-area.drag-over {
  border-color: rgba(45,212,191,0.6);
  background: rgba(45,212,191,0.07);
  box-shadow: 0 0 40px rgba(45,212,191,0.15);
}
.upload-area input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.upload-icon { font-size: 2.5rem; margin-bottom: 0.75rem; filter: drop-shadow(0 0 10px rgba(45,212,191,0.3)); }
.upload-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.375rem; }
.upload-hint { font-size: 0.8rem; color: var(--muted); }

.upload-form { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

/* ── MODE CARDS ── */
.mode-selector { display: flex; gap: 0.75rem; }
.mode-card {
  flex: 1; padding: 1.1rem; border-radius: var(--radius-sm); cursor: pointer;
  border: 1.5px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px);
  transition: all 0.22s var(--ease); text-align: center;
  box-shadow: 0 4px 14px rgba(0,0,0,0.2);
}
.mode-card:hover {
  border-color: rgba(45,212,191,0.3);
  background: rgba(45,212,191,0.05);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 0 14px rgba(45,212,191,0.08);
}
.mode-card.selected {
  border-color: rgba(45,212,191,0.5);
  background: linear-gradient(145deg, rgba(45,212,191,0.12) 0%, rgba(45,212,191,0.04) 100%);
  box-shadow: 0 6px 24px rgba(0,0,0,0.25), 0 0 20px rgba(45,212,191,0.12);
}
.mode-card-title { font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem; }
.mode-card-desc { font-size: 0.72rem; color: var(--muted); }

.consent-banner {
  padding: 1rem 1.25rem; border-radius: var(--radius-sm);
  border: 1px solid var(--border-accent); background: var(--accent-glow);
  font-size: 0.82rem; line-height: 1.6; color: var(--text);
}
.consent-banner strong { display: block; margin-bottom: 0.375rem; font-size: 0.88rem; }

/* ── UPLOAD REPORT ── */
.report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem; }
.report-item { padding: 0.875rem 1rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.03); border: 1px solid var(--border); }
.report-item-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); margin-bottom: 0.3rem; }
.report-item-value { font-size: 1rem; font-weight: 600; }

/* ── RESPONSIVE ── */
@media (max-width: 900px) {
  .auth-layout { grid-template-columns: 1fr; }
  .hero-side { padding: 2.5rem 2rem; }
  .auth-side { border-left: none; border-top: 1px solid var(--border); }
  .sidebar { display: none; }
  .main-content { padding: 1.5rem; }
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   TINY ICON COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const icons = {
  query: '◆',
  upload: '↑',
  overview: '⊞',
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

function Alert({ type = 'error', message }) {
  if (!message) return null;
  return <div className={`alert alert-${type}`}>{message}</div>;
}

function Spinner() {
  return <span className="spinner" />;
}

/* ── PROFILE DROPDOWN ── */
function ProfileDropdown({ userInfo, onClose, onLogout, loading }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="glass profile-dropdown">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner /> Loading profile…</div>
      ) : userInfo ? (
        <>
          <div className="profile-dropdown-header">
            <div className="profile-avatar-lg">
              {userInfo.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="profile-name">{userInfo.email}</div>
              <span className="profile-role">{userInfo.role}</span>
            </div>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-label">User ID</span>
            <span className="profile-info-value" style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{userInfo.user_id}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-label">Organisation</span>
            <span className="profile-info-value">{userInfo.org_id || '—'}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-label">Member since</span>
            <span className="profile-info-value">
              {userInfo.created_at ? new Date(userInfo.created_at).toLocaleDateString() : '—'}
            </span>
          </div>
          <button className="profile-logout-btn" onClick={onLogout}>Sign out</button>
        </>
      ) : (
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Could not load profile.</div>
      )}
    </div>
  );
}

/* ── SOURCE MODAL ── */
function SourceModal({ source, onClose }) {
  if (!source) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{source.document_name}</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
          Page {source.page_number} · Chunk #{source.chunk_index} · Score {source.similarity_score}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '1rem',
          fontSize: '0.85rem', lineHeight: '1.7', color: 'var(--text)',
        }}>
          {source.text_preview}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE: QUERY
───────────────────────────────────────────────────────────────────────────── */
function QueryPage({ token, orgId }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('global');
  const [language, setLanguage] = useState('English');
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.post('/api/v1/query', {
        query,
        upload_mode: mode,
        top_k: topK,
        language,
      }, token);
      setResult(data);
    } catch (e) {
      setError(friendlyError(e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Query Documents</div>
        <div className="page-sub">Ask questions grounded in your organisation&apos;s indexed documents.</div>
      </div>

      <div className="glass query-box">
        <div className="query-controls">
          <select className="query-select" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="global">🌐 Global Index (Neon)</option>
            <option value="local">💾 Session Index (Redis)</option>
            <option value="both">🔀 Both</option>
          </select>
          <select className="query-select" value={language} onChange={e => setLanguage(e.target.value)}>
            {['English','Hindi','French','German','Spanish','Arabic','Chinese','Japanese'].map(l =>
              <option key={l} value={l}>{l}</option>
            )}
          </select>
          <select className="query-select" value={topK} onChange={e => setTopK(+e.target.value)}>
            {[3, 5, 8, 10].map(k => <option key={k} value={k}>Top {k}</option>)}
          </select>
        </div>
        <div className="query-row">
          <textarea
            className="query-textarea"
            placeholder="Ask anything about your documents…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleQuery(); }}
          />
          <button className="btn-query" onClick={handleQuery} disabled={loading || !query.trim()}>
            {loading ? <Spinner /> : null}
            {loading ? 'Searching…' : 'Ask →'}
          </button>
        </div>
      </div>

      <Alert type="error" message={error} />

      {result && (
        <div className="glass answer-card">
          <div className="answer-meta">
            <span>Mode: {result.query_mode}</span>
            <span>Sources: {result.total_sources_found}</span>
            <span>Lang: {result.language}</span>
            <span>Model: {result.generated_by}</span>
          </div>
          <div className="answer-text">{result.answer}</div>
          {result.sources?.length > 0 && (
            <>
              <div className="sources-title">Source Citations</div>
              <div className="source-chips">
                {result.sources.map((s, i) => (
                  <span key={s.chunk_id} className="source-chip" onClick={() => setSelectedSource(s)}>
                    [{i + 1}] {s.document_name} p.{s.page_number}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedSource && <SourceModal source={selectedSource} onClose={() => setSelectedSource(null)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE: UPLOAD
───────────────────────────────────────────────────────────────────────────── */
function UploadPage({ token, userInfo }) {
  const [file, setFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('local');
  const [consent, setConsent] = useState(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [drag, setDrag] = useState(false);
  const role = userInfo?.role;

  const canGlobal = role === 'Admin' || role === 'Super Admin';

  const fetchConsent = useCallback(async (mode) => {
    setConsentLoading(true);
    setConsent(null);
    setConfirmed(false);
    try {
      const data = await api.get('/api/v1/upload/consent', token, { upload_mode: mode });
      setConsent(data);
    } catch (e) {
      setError(friendlyError(e.message));
    } finally {
      setConsentLoading(false);
    }
  }, [token]);

  const handleModeChange = (m) => {
    setUploadMode(m);
    setReport(null);
    setError(null);
    fetchConsent(m);
  };

  useEffect(() => { fetchConsent(uploadMode); }, []); // eslint-disable-line

  const handleUpload = async () => {
    if (!file || !confirmed) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_mode', uploadMode);
      fd.append('confirmed', 'true');
      const data = await api.postForm('/api/v1/upload/document', fd, token);
      setReport(data);
    } catch (e) {
      setError(friendlyError(e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Upload Document</div>
        <div className="page-sub">Index documents globally (permanent) or locally (session-private, 1-hour TTL).</div>
      </div>

      {/* Drop Zone */}
      <div
        className={`upload-area ${drag ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files[0]); setReport(null); }}
      >
        <input type="file" onChange={e => { setFile(e.target.files[0]); setReport(null); }} />
        <div className="upload-icon">📄</div>
        <div className="upload-title">{file ? file.name : 'Drop a file or click to browse'}</div>
        <div className="upload-hint">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB — ${file.type || 'unknown type'}`
            : 'PDF, DOCX, XLSX, PPTX, TXT, HTML, PNG, JPG supported'}
        </div>
      </div>

      {/* Upload Form */}
      <div className="upload-form">
        {/* Mode selector */}
        <div className="mode-selector">
          <div className={`mode-card ${uploadMode === 'local' ? 'selected' : ''}`} onClick={() => handleModeChange('local')}>
            <div className="mode-card-title">💾 Local Session</div>
            <div className="mode-card-desc">Private to you · 1-hour TTL · Redis</div>
          </div>
          <div
            className={`mode-card ${uploadMode === 'global' ? 'selected' : ''} ${!canGlobal ? 'glass' : ''}`}
            onClick={() => canGlobal && handleModeChange('global')}
            style={{ opacity: canGlobal ? 1 : 0.45, cursor: canGlobal ? 'pointer' : 'not-allowed' }}
          >
            <div className="mode-card-title">🌐 Global Org</div>
            <div className="mode-card-desc">Shared with org · Permanent · Neon DB</div>
          </div>
        </div>

        {/* Consent Banner */}
        {consentLoading && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}><Spinner /> Loading consent info…</div>}
        {consent && (
          <div className="consent-banner">
            <strong>{consent.title}</strong>
            {consent.message}
            {consent.warning_label && (
              <div style={{ marginTop: '0.5rem', color: 'var(--warning)', fontWeight: 500 }}>{consent.warning_label}</div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.875rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }} />
              I understand — proceed with {consent.confirm_label}
            </label>
          </div>
        )}

        <Alert type="error" message={error} />

        <button
          className="btn-primary"
          onClick={handleUpload}
          disabled={loading || !file || !confirmed}
          style={{ maxWidth: '200px' }}
        >
          {loading ? <><Spinner />Indexing…</> : 'Upload & Index'}
        </button>

        {/* Report */}
        {report && (
          <div>
            <Alert type="success" message={`✓ Document indexed successfully — ${report.status}`} />
            <div className="report-grid">
              {[
                ['Document ID', report.doc_id],
                ['File', report.file_name],
                ['Type', report.doc_type],
                ['Mode', report.upload_mode],
                ['Total Pages', report.total_pages],
                ['New Pages Indexed', report.pages_newly_indexed],
                ['Pages Skipped (Delta)', report.pages_skipped],
                ['Chunks Created', report.chunks_created],
              ].map(([label, value]) => (
                <div key={label} className="report-item">
                  <div className="report-item-label">{label}</div>
                  <div className="report-item-value">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE: OVERVIEW
───────────────────────────────────────────────────────────────────────────── */
function OverviewPage({ userInfo }) {
  const stats = [
    { label: 'Organisation', value: userInfo?.org_id || '—' },
    { label: 'Role', value: userInfo?.role || '—', accent: true },
    { label: 'Index', value: 'Neon + Redis', accent: false },
    { label: 'LLM', value: 'LLaMA 3.3 70B', accent: false },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Overview</div>
        <div className="page-sub">Enterprise RAG platform status and your organisation context.</div>
      </div>
      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className="glass stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.accent ? 'stat-accent' : ''}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="glass" style={{ padding: '1.75rem' }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '1rem' }}>System Capabilities</div>
        {[
          ['Retrieval Engine', 'Hybrid vector + keyword with configurable weights'],
          ['Chunking', 'LangChain recursive / doc-aware / slide-aware / row-aware'],
          ['Indexing', 'Delta-aware Supabase registry — skip unchanged pages'],
          ['Vector Store', 'pgvector on Neon (global) · Redis in-memory (local session)'],
          ['LLM', 'Groq LLaMA 3.3 70B — page-level citations on every answer'],
          ['Access Control', 'RBAC: Super Admin → Admin → User · tenant isolation'],
        ].map(([k, v]) => (
          <div key={k} style={{
            display: 'flex', gap: '1rem', padding: '0.625rem 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.82rem',
          }}>
            <span style={{ color: 'var(--muted)', minWidth: '140px', flexShrink: 0 }}>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD SHELL
───────────────────────────────────────────────────────────────────────────── */
function Dashboard({ token, onLogout }) {
  const [page, setPage] = useState('overview');
  const [userInfo, setUserInfo] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchMe = useCallback(async () => {
    if (userInfo) { setProfileOpen(p => !p); return; }
    setProfileOpen(true);
    setProfileLoading(true);
    try {
      const data = await api.get('/api/v1/auth/me', token);
      setUserInfo(data);
    } catch {
      setUserInfo(null);
    } finally {
      setProfileLoading(false);
    }
  }, [token, userInfo]);

  const handleLogout = async () => {
    try { await api.post('/api/v1/auth/logout', {}, token); } catch { /* ignore */ }
    onLogout();
  };

  const navItems = [
    { key: 'overview', label: 'Overview',   icon: '⊞' },
    { key: 'query',    label: 'Query',      icon: '◆' },
    { key: 'upload',   label: 'Upload',     icon: '↑' },
  ];

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-badge">GR</div>
          <span className="nav-logo-text">Global<span>RAG</span></span>
        </div>
        <div className="nav-right">
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginRight: '0.5rem' }}>
            {userInfo?.org_id && `org: ${userInfo.org_id}`}
          </span>
          <div style={{ position: 'relative' }}>
            <div className="profile-avatar" onClick={fetchMe}>
              {userInfo?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            {profileOpen && (
              <ProfileDropdown
                userInfo={userInfo}
                loading={profileLoading}
                onClose={() => setProfileOpen(false)}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </nav>

      <div className="dashboard-body">
        <aside className="sidebar">
          <div className="sidebar-label">Navigation</div>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`sidebar-btn ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="sb-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        <main className="main-content">
          {page === 'overview' && <OverviewPage userInfo={userInfo} />}
          {page === 'query'    && <QueryPage token={token} orgId={userInfo?.org_id} />}
          {page === 'upload'   && <UploadPage token={token} userInfo={userInfo} />}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH PAGE
───────────────────────────────────────────────────────────────────────────── */
function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', org_id: '', Role: 'User' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (isLogin) {
        const data = await api.post('/api/v1/auth/login', { email: form.email, password: form.password });
        onLogin(data.access_token, data.role, data.org_id);
      } else {
        const payload = { email: form.email, password: form.password, Role: form.Role };
        if (form.org_id.trim()) payload.org_id = form.org_id.trim();
        await api.post('/api/v1/auth/signup', payload);
        setSuccess('Account created successfully! You can now sign in.');
        setIsLogin(true);
      }
    } catch (e) {
      setError(friendlyError(e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* HERO */}
      <div className="hero-side">
        <div className="hero-tag">
          <span className="hero-tag-dot" />
          Enterprise RAG Platform
        </div>
        <h1 className="hero-title">
          Grounded answers from <em>every document</em> your organisation trusts.
        </h1>
        <p className="hero-sub">
          Hybrid vector and keyword retrieval, delta-aware indexing, session-private
          uploads and role-based access control — over one enterprise API.
        </p>
        <ul className="hero-features">
          {[
            'Global org index on Neon, session index on Redis',
            'OCR fallback for scanned PDFs and images',
            'LangChain-powered chunk strategies per doc type',
            'Page-level citations on every generated answer',
            'RBAC: Super Admin → Admin → User with tenant isolation',
          ].map(f => <li key={f}><span className="feat-dot" />{f}</li>)}
        </ul>
        <div className="hero-footer">
          Enterprise RAG backend <span>·</span> LangChain chunking <span>·</span> Supabase delta registries
        </div>
      </div>

      {/* AUTH CARD */}
      <div className="auth-side">
        <div className="glass auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}>
              Sign in
            </button>
            <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}>
              Create account
            </button>
          </div>

          <div className="auth-heading">{isLogin ? 'Welcome back' : 'Create an account'}</div>
          <div className="auth-subheading">
            {isLogin
              ? 'Use your organisation credentials to reach the retrieval console.'
              : 'Sign up to gain access to enterprise document retrieval.'}
          </div>

          <Alert type="error"   message={error}   />
          <Alert type="success" message={success}  />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Work email</label>
              <input
                className="form-input" type="email" placeholder="you@company.com"
                value={form.email} onChange={e => update('email', e.target.value)} required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input" type="password" placeholder="At least 8 characters"
                value={form.password} onChange={e => update('password', e.target.value)}
                required minLength={8}
              />
            </div>
            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">Organisation ID <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
                  <input
                    className="form-input" type="text" placeholder="e.g. acme-corp"
                    value={form.org_id} onChange={e => update('org_id', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={form.Role} onChange={e => update('Role', e.target.value)}>
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
              </>
            )}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <><Spinner />Please wait…</> : (isLogin ? 'Sign in' : 'Create account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('rag_token'));
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('rag_token'));

  // Inject CSS once
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'rag-styles';
    el.textContent = CSS;
    if (!document.getElementById('rag-styles')) document.head.appendChild(el);
    return () => { /* keep styles alive */ };
  }, []);

  const handleLogin = (tok) => {
    sessionStorage.setItem('rag_token', tok);
    setToken(tok);
    setAuthed(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('rag_token');
    setToken(null);
    setAuthed(false);
  };

  return (
    <>
      <div className="glow-tl" />
      <div className="glow-br" />
      {authed
        ? <Dashboard token={token} onLogout={handleLogout} />
        : (
          <>
            <nav className="navbar">
              <div className="nav-logo">
                <div className="nav-logo-badge">GR</div>
                <span className="nav-logo-text">Global<span>RAG</span></span>
              </div>
              
            </nav>
            <AuthPage onLogin={handleLogin} />
          </>
        )
      }
    </>
  );
}
