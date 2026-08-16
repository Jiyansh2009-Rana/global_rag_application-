import { tokenStore, apiFetch, BASE_URL } from './client';
import type { ConsentResponse, UploadReport } from './types';

export const getConsent = (upload_mode: 'global' | 'local') =>
  apiFetch<ConsentResponse>(`/upload/consent?upload_mode=${upload_mode}`, { method: 'GET' });

// XHR-based upload with real progress
export function uploadDocumentXHR(
  file: File,
  upload_mode: 'global' | 'local',
  token: string | null,
  onProgress: (pct: number) => void,
): Promise<UploadReport> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_mode', upload_mode);
    fd.append('confirmed', 'true');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/upload/document`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as unknown;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as UploadReport);
        } else {
          const detail =
            data && typeof data === 'object' && 'detail' in data
              ? String((data as Record<string, unknown>)['detail'])
              : `HTTP ${xhr.status}`;
          reject(new Error(detail));
        }
      } catch {
        reject(new Error('Failed to parse server response.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(fd);
  });
}

// Simpler fetch-based upload without progress (fallback)
export const uploadDocumentFetch = (file: File, upload_mode: 'global' | 'local') => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_mode', upload_mode);
  fd.append('confirmed', 'true');
  const token = tokenStore.get();
  return apiFetch<UploadReport>('/upload/document', {
    method: 'POST',
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};
