import { z } from 'zod';

/* ── User ── */
export const UserMeSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  role: z.enum(['User', 'Admin', 'Super Admin']),
  org_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
export type UserMe = z.infer<typeof UserMeSchema>;

/* ── Auth ── */
export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  role: z.string(),
  org_id: z.string().nullable().optional(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/* ── Consent ── */
export const ConsentResponseSchema = z.object({
  title: z.string(),
  message: z.string(),
  confirm_label: z.string(),
  warning_label: z.string().optional(),
});
export type ConsentResponse = z.infer<typeof ConsentResponseSchema>;

/* ── Upload Report ── */
export const UploadReportSchema = z.object({
  doc_id: z.string(),
  file_name: z.string(),
  doc_type: z.string(),
  upload_mode: z.string(),
  status: z.string(),
  total_pages: z.number(),
  pages_newly_indexed: z.number(),
  pages_skipped: z.number(),
  chunks_created: z.number(),
});
export type UploadReport = z.infer<typeof UploadReportSchema>;

/* ── Query Source ── */
export const SourceSchema = z.object({
  chunk_id: z.string(),
  document_id: z.string().optional(),
  document_name: z.string(),
  page_number: z.number(),
  chunk_index: z.number().optional(),
  similarity_score: z.number(),
  text_preview: z.string(),
  source_type: z.string().optional(),
  org_id: z.string().optional(),
  upload_mode: z.string().optional(),
  document_url: z.string().optional(),
  image_data: z.string().nullable().optional(),
  is_image: z.boolean().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

/* ── Query Response ── */
export const QueryResponseSchema = z.object({
  answer: z.string(),
  query_mode: z.string(),
  total_sources_found: z.number(),
  language: z.string(),
  generated_by: z.string().optional(),
  session_id: z.string().optional(),
  sources: z.array(SourceSchema),
});
export type QueryResponse = z.infer<typeof QueryResponseSchema>;

/* ── Query Request ── */
export const QueryRequestSchema = z.object({
  query: z.string().min(1),
  upload_mode: z.enum(['global', 'local', 'both']),
  top_k: z.number().min(1).max(20).default(5),
  vector_weight: z.number().min(0).max(1).default(0.7),
  keyword_weight: z.number().min(0).max(1).default(0.3),
  language: z.string().default('English'),
  system_prompt: z.string().optional(),
  session_id: z.string().optional(),
});
export type QueryRequest = z.infer<typeof QueryRequestSchema>;

/* ── Signup ── */
export const SignupPayloadSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  Role: z.enum(['User', 'Admin', 'Super Admin']).default('User'),
  org_id: z.string().min(1, 'Organisation ID is required'),
  tenant_id: z.string().optional(),
});
export type SignupPayload = z.infer<typeof SignupPayloadSchema>;

/* ── Org Settings ── */
export const OrgSettingsResponseSchema = z.object({
  org_id: z.string(),
  allow_user_global_upload: z.boolean(),
});
export type OrgSettingsResponse = z.infer<typeof OrgSettingsResponseSchema>;

export const OrgSettingsUpdateSchema = z.object({
  allow_user_global_upload: z.boolean(),
});
export type OrgSettingsUpdate = z.infer<typeof OrgSettingsUpdateSchema>;

/* ── Login ── */
export const LoginPayloadSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginPayload = z.infer<typeof LoginPayloadSchema>;

/* ── Admin — Org User ── */
export const OrgUserSchema = z.object({
  id:         z.string(),
  email:      z.string(),
  role:       z.string(),
  created_at: z.string(),
});
export type OrgUser = z.infer<typeof OrgUserSchema>;

/* ── Admin — Org Document ── */
export const OrgDocumentSchema = z.object({
  id:           z.string(),
  file_name:    z.string(),
  file_hash:    z.string().optional(),
  total_pages:  z.number().optional(),
  status:       z.string().optional(),
  uploaded_by:  z.string().optional(),
  uploaded_at:  z.string().optional(),
  org_id:       z.string().optional(),
});
export type OrgDocument = z.infer<typeof OrgDocumentSchema>;

/* ── Super Admin — Global User ── */
export const SuperAdminUserSchema = z.object({
  id:         z.string(),
  email:      z.string(),
  role:       z.string(),
  org_id:     z.string().nullable().optional(),
  created_at: z.string(),
});
export type SuperAdminUser = z.infer<typeof SuperAdminUserSchema>;

/* ── Super Admin — Global Document ── */
export const SuperAdminDocumentSchema = z.object({
  id:           z.string(),
  file_name:    z.string(),
  file_hash:    z.string().optional(),
  total_pages:  z.number().optional(),
  status:       z.string().optional(),
  uploaded_by:  z.string().optional(),
  uploaded_at:  z.string().optional(),
  org_id:       z.string().nullable().optional(),
});
export type SuperAdminDocument = z.infer<typeof SuperAdminDocumentSchema>;

/* ── Chat History ── */
export const ChatHistoryItemSchema = z.object({
  id:         z.string().optional(),
  user_id:    z.string().optional(),
  session_id: z.string().optional(),
  org_id:     z.string().optional(),
  query:      z.string(),
  answer:     z.string(),
  query_mode: z.string().optional(),
  created_at: z.string().optional(),
});
export type ChatHistoryItem = z.infer<typeof ChatHistoryItemSchema>;

/* ── Platform Guide ── */
export interface GuideStep {
  step: number;
  title: string;
  description: string;
  details?: Record<string, string>;
}

export interface PlatformGuide {
  title: string;
  introduction: string;
  how_to_use_steps: GuideStep[];
  tips_for_best_results: string[];
  support: string;
  contact: string;
}

/* ── Upload SSE Event Types ── */
export type UploadSSEEvent =
  | { status: 'extracting_text' }
  | { status: 'extraction_complete'; total_pages: number }
  | { status: 'processing_set'; set_id: string; pages: number[] }
  | { status: 'set_complete'; report: { chunks_created: number } }
  | { status: 'alias_detected'; message?: string }
  | { status: 'upload_complete'; doc_id: string };

/* ── Query SSE Event Types ── */
export type QuerySSEEvent =
  | { event: 'sources'; data: Source[] }
  | { event: 'token'; data: string }
  | { event: 'done'; session_id: string };

/* ── Per-file Upload Progress State (used in UploadPage) ── */
export interface FileUploadState {
  file: File;
  phase: 'pending' | 'uploading' | 'ocr' | 'processing' | 'done' | 'error';
  totalPages: number;
  processedPages: number;
  chunksCreated: number;
  progress: number;           // 0–100
  docId: string | null;
  aliasDetected: boolean;
  aliasMessage: string | null;
  error: string | null;
}
