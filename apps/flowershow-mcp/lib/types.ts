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
