// ── Device Auth ──────────────────────────────────────────────

export interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
}

export interface AuthPendingResponse {
  error: 'authorization_pending';
}

// ── User ────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  image: string | null;
  role: string;
}

// ── Site ────────────────────────────────────────────────────

export interface Site {
  id: string;
  projectName: string;
  url: string;
  customDomain: string | null;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
  totalSize?: number;
}

export interface CreateSiteRequest {
  projectName: string;
  overwrite?: boolean;
}

// ── Files ───────────────────────────────────────────────────

export interface FileMetadata {
  path: string;
  sha: string;
  size: number;
  contentType?: string;
}

export interface UploadUrl {
  path: string;
  uploadUrl: string;
}

export interface PublishFilesResponse {
  uploads: UploadUrl[];
  unchanged: string[];
}

export interface DeleteFilesResponse {
  deleted: string[];
  notFound: string[];
}

// ── Sync ────────────────────────────────────────────────────

export interface SyncManifestEntry {
  path: string;
  sha: string;
  size: number;
  contentType?: string;
}

export interface SyncResponse {
  toUpload: UploadUrl[];
  toUpdate: UploadUrl[];
  unchanged: string[];
  deleted: string[];
}

// ── Site Status ─────────────────────────────────────────────

export interface SiteStatus {
  status: 'pending' | 'complete' | 'error';
  pending: number;
  success: number;
  error: number;
  total: number;
}

// ── API Error ───────────────────────────────────────────────

export interface ApiErrorBody {
  error: string;
  message?: string;
  statusCode?: number;
}
