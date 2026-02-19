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

export const GetSiteResponseSchema = z.object({
  site: SiteDetailSchema,
});
export type GetSiteResponse = z.infer<typeof GetSiteResponseSchema>;

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

// ---------------------------------------------------------------------------
// ErrorSchema
// ---------------------------------------------------------------------------
export const ErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
  message: z.string().optional(),
});
export type Error = z.infer<typeof ErrorSchema>;

// ---------------------------------------------------------------------------
// CLI Auth Schemas
// ---------------------------------------------------------------------------
export const DeviceAuthorizeResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  verification_uri_complete: z.string(),
  expires_in: z.number(),
  interval: z.number(),
});
export type DeviceAuthorizeResponse = z.infer<
  typeof DeviceAuthorizeResponseSchema
>;

export const DeviceTokenRequestSchema = z.object({
  device_code: z.string(),
  grant_type: z.string(),
});
export type DeviceTokenRequest = z.infer<typeof DeviceTokenRequestSchema>;

export const DeviceTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.null(),
});
export type DeviceTokenResponse = z.infer<typeof DeviceTokenResponseSchema>;

export const AuthorizeDeviceRequestSchema = z.object({
  user_code: z.string(),
});
export type AuthorizeDeviceRequest = z.infer<
  typeof AuthorizeDeviceRequestSchema
>;

// ---------------------------------------------------------------------------
// User Schemas
// ---------------------------------------------------------------------------
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
});
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

export const RevokeTokenRequestSchema = z.object({
  token_id: z.string(),
});
export type RevokeTokenRequest = z.infer<typeof RevokeTokenRequestSchema>;

// ---------------------------------------------------------------------------
// Sites Schemas
// ---------------------------------------------------------------------------
export const CreateSiteRequestSchema = z.object({
  projectName: z.string(),
  overwrite: z.boolean().optional(),
});
export type CreateSiteRequest = z.infer<typeof CreateSiteRequestSchema>;

export const CreateSiteResponseSchema = z.object({
  site: z.object({
    id: z.string(),
    projectName: z.string(),
    url: z.string(),
    userId: z.string(),
    createdAt: z.string(),
  }),
});
export type CreateSiteResponse = z.infer<typeof CreateSiteResponseSchema>;

export const DeleteSiteResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  deletedFiles: z.number(),
});
export type DeleteSiteResponse = z.infer<typeof DeleteSiteResponseSchema>;

export const SyncRequestSchema = z.object({
  files: z.array(FileMetadataSchema),
});
export type SyncRequest = z.infer<typeof SyncRequestSchema>;

export const SyncResponseSchema = z.object({
  toUpload: z.array(UploadTargetSchema),
  toUpdate: z.array(UploadTargetSchema),
  deleted: z.array(z.string()),
  unchanged: z.array(z.string()),
  summary: z.object({
    toUpload: z.number(),
    toUpdate: z.number(),
    deleted: z.number(),
    unchanged: z.number(),
  }),
  dryRun: z.boolean().optional(),
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export const PublishFilesRequestSchema = z.object({
  files: z.array(FileMetadataSchema).min(1),
});
export type PublishFilesRequest = z.infer<typeof PublishFilesRequestSchema>;

export const DeleteFilesRequestSchema = z.object({
  paths: z.array(z.string()).min(1),
});
export type DeleteFilesRequest = z.infer<typeof DeleteFilesRequestSchema>;

export const DeleteFilesResponseSchema = z.object({
  deleted: z.array(z.string()),
  notFound: z.array(z.string()),
});
export type DeleteFilesResponse = z.infer<typeof DeleteFilesResponseSchema>;

export const PublicStatusResponseSchema = z.object({
  status: z.enum(['pending', 'complete', 'error']),
  errors: z
    .array(
      z.object({
        path: z.string(),
        error: z.string(),
      }),
    )
    .optional(),
});
export type PublicStatusResponse = z.infer<typeof PublicStatusResponseSchema>;

// ---------------------------------------------------------------------------
// Anonymous Publishing Schemas
// ---------------------------------------------------------------------------
export const AnonPublishFileSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  sha: z.string(),
});
export type AnonPublishFile = z.infer<typeof AnonPublishFileSchema>;

export const AnonPublishRequestSchema = z.object({
  files: z.array(AnonPublishFileSchema).min(1).max(5),
  anonymousUserId: z.string().uuid(),
});
export type AnonPublishRequest = z.infer<typeof AnonPublishRequestSchema>;

export const AnonPublishResponseSchema = z.object({
  siteId: z.string(),
  projectName: z.string(),
  files: z.array(
    z.object({
      fileName: z.string(),
      uploadUrl: z.string(),
    }),
  ),
  liveUrl: z.string(),
  ownershipToken: z.string(),
});
export type AnonPublishResponse = z.infer<typeof AnonPublishResponseSchema>;

export const ClaimSiteRequestSchema = z.object({
  siteId: z.string(),
  ownershipToken: z.string(),
});
export type ClaimSiteRequest = z.infer<typeof ClaimSiteRequestSchema>;

export const ClaimSiteResponseSchema = z.object({
  success: z.literal(true),
  site: z.object({
    id: z.string(),
    projectName: z.string(),
    userId: z.string(),
  }),
});
export type ClaimSiteResponse = z.infer<typeof ClaimSiteResponseSchema>;

// ---------------------------------------------------------------------------
// GitHub App Schemas
// ---------------------------------------------------------------------------
export const GitHubRepositorySchema = z.object({
  id: z.string(),
  repositoryId: z.string(),
  name: z.string(),
  fullName: z.string(),
  isPrivate: z.boolean(),
});
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;

export const GitHubInstallationSchema = z.object({
  id: z.string(),
  installationId: z.string(),
  accountLogin: z.string(),
  accountType: z.enum(['User', 'Organization']),
  repositories: z.array(GitHubRepositorySchema),
  suspendedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GitHubInstallation = z.infer<typeof GitHubInstallationSchema>;

export const GitHubInstallationsResponseSchema = z.object({
  installations: z.array(GitHubInstallationSchema),
});
export type GitHubInstallationsResponse = z.infer<
  typeof GitHubInstallationsResponseSchema
>;

export const DeleteInstallationResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});
export type DeleteInstallationResponse = z.infer<
  typeof DeleteInstallationResponseSchema
>;

export const InstallationUrlRequestSchema = z.object({
  suggestedTargetId: z.string().optional(),
});
export type InstallationUrlRequest = z.infer<
  typeof InstallationUrlRequestSchema
>;

export const InstallationUrlResponseSchema = z.object({
  url: z.string(),
  state: z.string(),
});
export type InstallationUrlResponse = z.infer<
  typeof InstallationUrlResponseSchema
>;

export const SyncRepositoriesRequestSchema = z.object({
  installationId: z.string(),
});
export type SyncRepositoriesRequest = z.infer<
  typeof SyncRepositoriesRequestSchema
>;

export const SyncRepositoriesResponseSchema = z.object({
  success: z.literal(true),
  repositoriesCount: z.number(),
});
export type SyncRepositoriesResponse = z.infer<
  typeof SyncRepositoriesResponseSchema
>;

export const GitHubAppCallbackQuerySchema = z.object({
  installation_id: z.string(),
  state: z.string(),
  setup_action: z.enum(['install', 'update']).optional(),
});
export type GitHubAppCallbackQuery = z.infer<
  typeof GitHubAppCallbackQuerySchema
>;

export const GitHubAppCallbackSuccessQuerySchema = z.object({
  setup_action: z.enum(['install', 'update']).optional(),
});
export type GitHubAppCallbackSuccessQuery = z.infer<
  typeof GitHubAppCallbackSuccessQuerySchema
>;

// ---------------------------------------------------------------------------
// Domain Schemas
// ---------------------------------------------------------------------------
export const DomainVerificationSchema = z.object({
  status: z.enum([
    'Valid Configuration',
    'Invalid Configuration',
    'Pending Verification',
    'Domain Not Found',
    'Unknown Error',
  ]),
  domainJson: z.object({
    name: z.string(),
    apexName: z.string(),
    projectId: z.string(),
    redirect: z.string().nullable().optional(),
    redirectStatusCode: z
      .union([
        z.literal(301),
        z.literal(302),
        z.literal(307),
        z.literal(308),
        z.null(),
      ])
      .optional(),
    gitBranch: z.string().nullable().optional(),
    updatedAt: z.number().optional(),
    createdAt: z.number().optional(),
    verified: z.boolean(),
    verification: z.array(
      z.object({
        type: z.string(),
        domain: z.string(),
        value: z.string(),
        reason: z.string(),
      }),
    ),
    error: z
      .object({
        code: z.string().optional(),
        message: z.string().optional(),
      })
      .optional(),
  }),
});
export type DomainVerification = z.infer<typeof DomainVerificationSchema>;

export const StripeWebhookReceivedResponseSchema = z.object({
  received: z.literal(true),
});
export type StripeWebhookReceivedResponse = z.infer<
  typeof StripeWebhookReceivedResponseSchema
>;

export const SitemapParamsSchema = z.object({
  user: z.string(),
  project: z.string(),
});
export type SitemapParams = z.infer<typeof SitemapParamsSchema>;

export const RobotsParamsSchema = z.object({
  hostname: z.string(),
});
export type RobotsParams = z.infer<typeof RobotsParamsSchema>;

// ---------------------------------------------------------------------------
// Upgrade Required Response
// ---------------------------------------------------------------------------
export const UpgradeRequiredResponseSchema = z.object({
  error: z.literal('client_outdated'),
  message: z.string(),
  currentVersion: z.string(),
  minimumVersion: z.string(),
});
export type UpgradeRequiredResponse = z.infer<
  typeof UpgradeRequiredResponseSchema
>;
