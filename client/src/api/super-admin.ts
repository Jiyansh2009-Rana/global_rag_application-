import { apiFetch } from './client';
import type { SuperAdminUser, SuperAdminDocument, SuperAdminOrg } from './types';

/* ── GET /api/v1/super-admin/users ── */
export async function getSuperAdminUsers(page = 1, limit = 30) {
  return apiFetch<{
    users: SuperAdminUser[];
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  }>(`/super-admin/users?page=${page}&limit=${limit}`, { method: 'GET' });
}

/* ── DELETE /api/v1/super-admin/users/:id ── */
export async function deleteSuperAdminUser(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/super-admin/users/${userId}`, { method: 'DELETE' });
}

/* ── GET /api/v1/super-admin/documents ── */
export async function getSuperAdminDocuments(page = 1, limit = 30) {
  return apiFetch<{
    documents: SuperAdminDocument[];
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  }>(`/super-admin/documents?page=${page}&limit=${limit}`, { method: 'GET' });
}

/* ── DELETE /api/v1/super-admin/documents/:id ── */
export async function deleteSuperAdminDocument(docId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/super-admin/documents/${docId}`, { method: 'DELETE' });
}

/* ── GET /api/v1/super-admin/organizations ── */
export async function getSuperAdminOrgs(page = 1, limit = 30) {
  return apiFetch<{
    organizations: SuperAdminOrg[];
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  }>(`/super-admin/organizations?page=${page}&limit=${limit}`, { method: 'GET' });
}

/* ── POST /api/v1/super-admin/organizations/:org_id/toggle-status ── */
export async function toggleOrgStatus(
  org_id: string,
  is_disabled: boolean,
  reason?: string
): Promise<{ message: string; org_id: string; is_disabled: boolean }> {
  return apiFetch<{ message: string; org_id: string; is_disabled: boolean }>(`/super-admin/organizations/${org_id}/toggle-status`, {
    method: 'POST',
    body: JSON.stringify({ is_disabled, reason }),
    headers: { 'Content-Type': 'application/json' },
  });
}
