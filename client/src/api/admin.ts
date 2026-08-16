import { apiFetch } from './client';
import type { OrgUser, OrgDocument } from './types';

/* ── GET /api/v1/admin/users ── */
export async function getOrgUsers(): Promise<OrgUser[]> {
  const res = await apiFetch<{ users: OrgUser[] }>('/admin/users', { method: 'GET' });
  return res.users ?? [];
}

/* ── DELETE /api/v1/admin/users/:id ── */
export async function deleteOrgUser(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' });
}

/* ── GET /api/v1/admin/documents ── */
export async function getOrgDocuments(): Promise<OrgDocument[]> {
  const res = await apiFetch<{ documents: OrgDocument[] }>('/admin/documents', { method: 'GET' });
  return res.documents ?? [];
}

/* ── DELETE /api/v1/admin/documents/:id ── */
export async function deleteOrgDocument(docId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/documents/${docId}`, { method: 'DELETE' });
}
