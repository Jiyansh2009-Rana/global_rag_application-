import { apiFetch } from './client';
import type { SuperAdminUser, SuperAdminDocument } from './types';

/* ── GET /api/v1/super-admin/users ── */
export async function getSuperAdminUsers(): Promise<SuperAdminUser[]> {
  const res = await apiFetch<{ users: SuperAdminUser[] }>('/super-admin/users', { method: 'GET' });
  return res.users ?? [];
}

/* ── DELETE /api/v1/super-admin/users/:id ── */
export async function deleteSuperAdminUser(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/super-admin/users/${userId}`, { method: 'DELETE' });
}

/* ── GET /api/v1/super-admin/documents ── */
export async function getSuperAdminDocuments(): Promise<SuperAdminDocument[]> {
  const res = await apiFetch<{ documents: SuperAdminDocument[] }>('/super-admin/documents', { method: 'GET' });
  return res.documents ?? [];
}

/* ── DELETE /api/v1/super-admin/documents/:id ── */
export async function deleteSuperAdminDocument(docId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/super-admin/documents/${docId}`, { method: 'DELETE' });
}
