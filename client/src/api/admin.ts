import { apiFetch } from './client';
import type { OrgUser, OrgDocument, OrgSettingsResponse } from './types';

/* ── GET /api/v1/admin/users ── */
export async function getOrgUsers(): Promise<OrgUser[]> {
  const res = await apiFetch<{ users: OrgUser[] }>('/admin/users', { method: 'GET' });
  return res.users ?? [];
}

/* ── PATCH /api/v1/admin/users/:id/permissions ── */
export async function updateUserUploadPermission(
  userId: string,
  allow_global_upload: boolean
): Promise<{ message: string; allow_global_upload: boolean }> {
  return apiFetch<{ message: string; allow_global_upload: boolean }>(`/admin/users/${userId}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ allow_global_upload }),
    headers: { 'Content-Type': 'application/json' },
  });
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

/* ── GET /api/v1/admin/settings/global-upload ── */
export async function getGlobalUploadSetting(): Promise<OrgSettingsResponse> {
  return apiFetch<OrgSettingsResponse>('/admin/settings/global-upload', { method: 'GET' });
}

/* ── POST /api/v1/admin/settings/global-upload ── */
export async function updateGlobalUploadSetting(allow_user_global_upload: boolean): Promise<{ message: string; allow_user_global_upload: boolean }> {
  return apiFetch<{ message: string; allow_user_global_upload: boolean }>('/admin/settings/global-upload', {
    method: 'POST',
    body: JSON.stringify({ allow_user_global_upload }),
    headers: { 'Content-Type': 'application/json' },
  });
}
