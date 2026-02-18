import { z } from 'zod';

// ---------------------------------------------------------------------------
// SiteSummary
// ---------------------------------------------------------------------------
export const SiteSummarySchema = z.object({
  id: z.string(),
  projectName: z.string(),
  url: z.string(),
  fileCount: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
});
export type SiteSummary = z.infer<typeof SiteSummarySchema>;

// ---------------------------------------------------------------------------
// ListSitesResponse
// ---------------------------------------------------------------------------
export const ListSitesResponseSchema = z.object({
  sites: z.array(SiteSummarySchema),
  total: z.number(),
});
export type ListSitesResponse = z.infer<typeof ListSitesResponseSchema>;

// ---------------------------------------------------------------------------
// SiteDetail
// ---------------------------------------------------------------------------
export const SiteDetailSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  ghRepository: z.string().nullable(),
  ghBranch: z.string().nullable(),
  customDomain: z.string().nullable(),
  rootDir: z.string().nullable(),
  autoSync: z.boolean(),
  plan: z.enum(['FREE', 'PREMIUM']),
  privacyMode: z.enum(['PUBLIC', 'PASSWORD']),
  enableComments: z.boolean(),
  enableSearch: z.boolean(),
  syntaxMode: z.string(),
  url: z.string(),
  fileCount: z.number(),
  totalSize: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
});
export type SiteDetail = z.infer<typeof SiteDetailSchema>;

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
});
export type User = z.infer<typeof UserSchema>;

// ---------------------------------------------------------------------------
// FileMetadata
// ---------------------------------------------------------------------------
export const FileMetadataSchema = z.object({
  path: z.string(),
  size: z.number(),
  sha: z.string(),
});
export type FileMetadata = z.infer<typeof FileMetadataSchema>;

// ---------------------------------------------------------------------------
// UploadTarget
// ---------------------------------------------------------------------------
export const UploadTargetSchema = z.object({
  path: z.string(),
  uploadUrl: z.string(),
  blobId: z.string(),
  contentType: z.string(),
});
export type UploadTarget = z.infer<typeof UploadTargetSchema>;

// ---------------------------------------------------------------------------
// PublishFilesResponse
// ---------------------------------------------------------------------------
export const PublishFilesResponseSchema = z.object({
  files: z.array(UploadTargetSchema),
});
export type PublishFilesResponse = z.infer<typeof PublishFilesResponseSchema>;

// ---------------------------------------------------------------------------
// StatusResponse
// ---------------------------------------------------------------------------
export const BlobStatusSchema = z.object({
  id: z.string(),
  path: z.string(),
  syncStatus: z.enum(['UPLOADING', 'PROCESSING', 'SUCCESS', 'ERROR']),
  syncError: z.string().nullable(),
  extension: z.string().nullable(),
});
export type BlobStatus = z.infer<typeof BlobStatusSchema>;

export const StatusResponseSchema = z.object({
  siteId: z.string(),
  status: z.enum(['pending', 'complete', 'error']),
  files: z.object({
    total: z.number(),
    pending: z.number(),
    success: z.number(),
    failed: z.number(),
  }),
  blobs: z.array(BlobStatusSchema).optional(),
});
export type StatusResponse = z.infer<typeof StatusResponseSchema>;
