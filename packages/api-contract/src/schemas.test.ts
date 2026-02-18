import { describe, expect, test } from 'vitest';
import {
  AnonPublishRequestSchema,
  AnonPublishResponseSchema,
  AuthorizeDeviceRequestSchema,
  ClaimSiteRequestSchema,
  ClaimSiteResponseSchema,
  CreateSiteRequestSchema,
  CreateSiteResponseSchema,
  DeleteFilesRequestSchema,
  DeleteFilesResponseSchema,
  DeleteSiteResponseSchema,
  DeviceAuthorizeResponseSchema,
  DeviceTokenRequestSchema,
  DeviceTokenResponseSchema,
  DomainVerificationSchema,
  ErrorSchema,
  FileMetadataSchema,
  GitHubInstallationSchema,
  ListSitesResponseSchema,
  PublicStatusResponseSchema,
  PublishFilesRequestSchema,
  PublishFilesResponseSchema,
  RevokeTokenRequestSchema,
  SiteDetailSchema,
  SiteSummarySchema,
  StatusResponseSchema,
  SuccessResponseSchema,
  SyncRequestSchema,
  SyncResponseSchema,
  UpgradeRequiredResponseSchema,
  UploadTargetSchema,
  UserSchema,
} from './schemas.js';

// ---------------------------------------------------------------------------
// SiteSummarySchema
// ---------------------------------------------------------------------------
describe('SiteSummarySchema', () => {
  const valid = {
    id: 'site-1',
    projectName: 'my-garden',
    url: 'https://my-garden.flowershow.app',
    fileCount: 42,
    updatedAt: '2025-06-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
  };

  test('accepts valid data', () => {
    expect(SiteSummarySchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing required fields', () => {
    const { id, ...rest } = valid;
    expect(() => SiteSummarySchema.parse(rest)).toThrow();
  });

  test('rejects missing projectName', () => {
    const { projectName, ...rest } = valid;
    expect(() => SiteSummarySchema.parse(rest)).toThrow();
  });

  test('rejects wrong type for fileCount', () => {
    expect(() =>
      SiteSummarySchema.parse({ ...valid, fileCount: 'not-a-number' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ListSitesResponseSchema
// ---------------------------------------------------------------------------
describe('ListSitesResponseSchema', () => {
  const validSite = {
    id: 'site-1',
    projectName: 'my-garden',
    url: 'https://my-garden.flowershow.app',
    fileCount: 42,
    updatedAt: '2025-06-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
  };

  test('accepts valid data', () => {
    const data = { sites: [validSite], total: 1 };
    expect(ListSitesResponseSchema.parse(data)).toEqual(data);
  });

  test('accepts empty sites array', () => {
    const data = { sites: [], total: 0 };
    expect(ListSitesResponseSchema.parse(data)).toEqual(data);
  });

  test('rejects missing total', () => {
    expect(() => ListSitesResponseSchema.parse({ sites: [] })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SiteDetailSchema
// ---------------------------------------------------------------------------
describe('SiteDetailSchema', () => {
  const valid = {
    id: 'site-1',
    projectName: 'my-garden',
    ghRepository: 'user/repo',
    ghBranch: 'main',
    customDomain: 'garden.example.com',
    rootDir: '/docs',
    autoSync: true,
    plan: 'FREE' as const,
    privacyMode: 'PUBLIC' as const,
    enableComments: false,
    enableSearch: true,
    syntaxMode: 'markdown',
    url: 'https://my-garden.flowershow.app',
    fileCount: 42,
    totalSize: 1024000,
    updatedAt: '2025-06-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
  };

  test('accepts valid data', () => {
    expect(SiteDetailSchema.parse(valid)).toEqual(valid);
  });

  test('nullable fields accept null', () => {
    const withNulls = {
      ...valid,
      ghRepository: null,
      ghBranch: null,
      customDomain: null,
      rootDir: null,
    };
    expect(SiteDetailSchema.parse(withNulls)).toEqual(withNulls);
  });

  test('rejects invalid plan value', () => {
    expect(() =>
      SiteDetailSchema.parse({ ...valid, plan: 'ENTERPRISE' }),
    ).toThrow();
  });

  test('accepts PREMIUM plan', () => {
    const data = { ...valid, plan: 'PREMIUM' };
    expect(SiteDetailSchema.parse(data)).toEqual(data);
  });

  test('rejects invalid privacyMode value', () => {
    expect(() =>
      SiteDetailSchema.parse({ ...valid, privacyMode: 'PRIVATE' }),
    ).toThrow();
  });

  test('accepts PASSWORD privacyMode', () => {
    const data = { ...valid, privacyMode: 'PASSWORD' };
    expect(SiteDetailSchema.parse(data)).toEqual(data);
  });

  test('rejects missing required fields', () => {
    const { id, ...rest } = valid;
    expect(() => SiteDetailSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// UserSchema
// ---------------------------------------------------------------------------
describe('UserSchema', () => {
  const valid = {
    id: 'user-1',
    name: 'Alice',
    username: 'alice',
    email: 'alice@example.com',
    image: 'https://example.com/avatar.png',
    role: 'USER' as const,
  };

  test('accepts valid data', () => {
    expect(UserSchema.parse(valid)).toEqual(valid);
  });

  test('nullable fields accept null', () => {
    const withNulls = { ...valid, name: null, email: null, image: null };
    expect(UserSchema.parse(withNulls)).toEqual(withNulls);
  });

  test('rejects invalid role value', () => {
    expect(() => UserSchema.parse({ ...valid, role: 'SUPERADMIN' })).toThrow();
  });

  test('accepts ADMIN role', () => {
    const data = { ...valid, role: 'ADMIN' };
    expect(UserSchema.parse(data)).toEqual(data);
  });

  test('rejects missing username', () => {
    const { username, ...rest } = valid;
    expect(() => UserSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// FileMetadataSchema
// ---------------------------------------------------------------------------
describe('FileMetadataSchema', () => {
  const valid = { path: 'docs/index.md', size: 2048, sha: 'abc123def456' };

  test('accepts valid data', () => {
    expect(FileMetadataSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing path', () => {
    const { path, ...rest } = valid;
    expect(() => FileMetadataSchema.parse(rest)).toThrow();
  });

  test('rejects wrong type for size', () => {
    expect(() => FileMetadataSchema.parse({ ...valid, size: 'big' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// UploadTargetSchema
// ---------------------------------------------------------------------------
describe('UploadTargetSchema', () => {
  const valid = {
    path: 'docs/index.md',
    uploadUrl: 'https://storage.example.com/upload/abc',
    blobId: 'blob-123',
    contentType: 'text/markdown',
  };

  test('accepts valid data', () => {
    expect(UploadTargetSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing uploadUrl', () => {
    const { uploadUrl, ...rest } = valid;
    expect(() => UploadTargetSchema.parse(rest)).toThrow();
  });

  test('rejects missing blobId', () => {
    const { blobId, ...rest } = valid;
    expect(() => UploadTargetSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PublishFilesResponseSchema
// ---------------------------------------------------------------------------
describe('PublishFilesResponseSchema', () => {
  const validFile = {
    path: 'docs/index.md',
    uploadUrl: 'https://storage.example.com/upload/abc',
    blobId: 'blob-123',
    contentType: 'text/markdown',
  };

  test('accepts valid data', () => {
    const data = { files: [validFile] };
    expect(PublishFilesResponseSchema.parse(data)).toEqual(data);
  });

  test('accepts empty files array', () => {
    const data = { files: [] };
    expect(PublishFilesResponseSchema.parse(data)).toEqual(data);
  });

  test('rejects missing files', () => {
    expect(() => PublishFilesResponseSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// StatusResponseSchema
// ---------------------------------------------------------------------------
describe('StatusResponseSchema', () => {
  const valid = {
    siteId: 'site-1',
    status: 'pending' as const,
    files: { total: 10, pending: 5, success: 3, failed: 2 },
  };

  test('accepts valid data without blobs', () => {
    expect(StatusResponseSchema.parse(valid)).toEqual(valid);
  });

  test('blobs is optional', () => {
    // Should parse without blobs field present
    const result = StatusResponseSchema.parse(valid);
    expect(result.blobs).toBeUndefined();
  });

  test('accepts data with blobs array', () => {
    const data = {
      ...valid,
      blobs: [
        {
          id: 'blob-1',
          path: 'docs/index.md',
          syncStatus: 'SUCCESS' as const,
          syncError: null,
          extension: '.md',
        },
      ],
    };
    expect(StatusResponseSchema.parse(data)).toEqual(data);
  });

  test('accepts all status values', () => {
    for (const status of ['pending', 'complete', 'error'] as const) {
      expect(StatusResponseSchema.parse({ ...valid, status })).toEqual({
        ...valid,
        status,
      });
    }
  });

  test('rejects invalid status value', () => {
    expect(() =>
      StatusResponseSchema.parse({ ...valid, status: 'running' }),
    ).toThrow();
  });

  test('accepts all syncStatus values', () => {
    for (const syncStatus of [
      'UPLOADING',
      'PROCESSING',
      'SUCCESS',
      'ERROR',
    ] as const) {
      const data = {
        ...valid,
        blobs: [
          {
            id: 'b1',
            path: 'f.md',
            syncStatus,
            syncError: null,
            extension: null,
          },
        ],
      };
      expect(StatusResponseSchema.parse(data)).toEqual(data);
    }
  });

  test('rejects invalid syncStatus value', () => {
    const data = {
      ...valid,
      blobs: [
        {
          id: 'b1',
          path: 'f.md',
          syncStatus: 'QUEUED',
          syncError: null,
          extension: null,
        },
      ],
    };
    expect(() => StatusResponseSchema.parse(data)).toThrow();
  });

  test('blob nullable fields accept null', () => {
    const data = {
      ...valid,
      blobs: [
        {
          id: 'b1',
          path: 'f.md',
          syncStatus: 'UPLOADING',
          syncError: null,
          extension: null,
        },
      ],
    };
    const result = StatusResponseSchema.parse(data);
    expect(result.blobs![0].syncError).toBeNull();
    expect(result.blobs![0].extension).toBeNull();
  });

  test('rejects missing siteId', () => {
    const { siteId, ...rest } = valid;
    expect(() => StatusResponseSchema.parse(rest)).toThrow();
  });

  test('rejects missing files object', () => {
    const { files, ...rest } = valid;
    expect(() => StatusResponseSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ErrorSchema
// ---------------------------------------------------------------------------
describe('ErrorSchema', () => {
  test('accepts valid data with required fields only', () => {
    const data = { error: 'unauthorized' };
    expect(ErrorSchema.parse(data)).toEqual(data);
  });

  test('accepts valid data with all fields', () => {
    const data = {
      error: 'invalid_request',
      error_description: 'The request was malformed',
      message: 'Please check your request',
    };
    expect(ErrorSchema.parse(data)).toEqual(data);
  });

  test('rejects missing error field', () => {
    expect(() =>
      ErrorSchema.parse({ message: 'Something went wrong' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DeviceAuthorizeResponseSchema
// ---------------------------------------------------------------------------
describe('DeviceAuthorizeResponseSchema', () => {
  const valid = {
    device_code: 'device-code-abc123',
    user_code: 'ABCD-1234',
    verification_uri: 'https://flowershow.app/cli/verify',
    verification_uri_complete:
      'https://flowershow.app/cli/verify?code=ABCD-1234',
    expires_in: 900,
    interval: 5,
  };

  test('accepts valid data', () => {
    expect(DeviceAuthorizeResponseSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing device_code', () => {
    const { device_code, ...rest } = valid;
    expect(() => DeviceAuthorizeResponseSchema.parse(rest)).toThrow();
  });

  test('rejects missing user_code', () => {
    const { user_code, ...rest } = valid;
    expect(() => DeviceAuthorizeResponseSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DeviceTokenRequestSchema
// ---------------------------------------------------------------------------
describe('DeviceTokenRequestSchema', () => {
  const valid = {
    device_code: 'device-code-abc123',
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  };

  test('accepts valid data', () => {
    expect(DeviceTokenRequestSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing device_code', () => {
    const { device_code, ...rest } = valid;
    expect(() => DeviceTokenRequestSchema.parse(rest)).toThrow();
  });

  test('rejects missing grant_type', () => {
    const { grant_type, ...rest } = valid;
    expect(() => DeviceTokenRequestSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DeviceTokenResponseSchema
// ---------------------------------------------------------------------------
describe('DeviceTokenResponseSchema', () => {
  const valid = {
    access_token: 'fs_cli_abc123',
    token_type: 'Bearer',
    expires_in: null,
  };

  test('accepts valid data', () => {
    expect(DeviceTokenResponseSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing access_token', () => {
    const { access_token, ...rest } = valid;
    expect(() => DeviceTokenResponseSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// AuthorizeDeviceRequestSchema
// ---------------------------------------------------------------------------
describe('AuthorizeDeviceRequestSchema', () => {
  const valid = { user_code: 'ABCD-1234' };

  test('accepts valid data', () => {
    expect(AuthorizeDeviceRequestSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing user_code', () => {
    expect(() => AuthorizeDeviceRequestSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SuccessResponseSchema
// ---------------------------------------------------------------------------
describe('SuccessResponseSchema', () => {
  test('accepts valid data', () => {
    const data = { success: true };
    expect(SuccessResponseSchema.parse(data)).toEqual(data);
  });

  test('rejects false value', () => {
    expect(() => SuccessResponseSchema.parse({ success: false })).toThrow();
  });

  test('rejects missing success', () => {
    expect(() => SuccessResponseSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// RevokeTokenRequestSchema
// ---------------------------------------------------------------------------
describe('RevokeTokenRequestSchema', () => {
  const valid = { token_id: 'token-123' };

  test('accepts valid data', () => {
    expect(RevokeTokenRequestSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing token_id', () => {
    expect(() => RevokeTokenRequestSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// CreateSiteRequestSchema
// ---------------------------------------------------------------------------
describe('CreateSiteRequestSchema', () => {
  const valid = { projectName: 'my-garden' };

  test('accepts valid data with required fields only', () => {
    expect(CreateSiteRequestSchema.parse(valid)).toEqual(valid);
  });

  test('accepts valid data with overwrite', () => {
    const data = { projectName: 'my-garden', overwrite: true };
    expect(CreateSiteRequestSchema.parse(data)).toEqual(data);
  });

  test('rejects missing projectName', () => {
    expect(() => CreateSiteRequestSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// CreateSiteResponseSchema
// ---------------------------------------------------------------------------
describe('CreateSiteResponseSchema', () => {
  const valid = {
    site: {
      id: 'site-1',
      projectName: 'my-garden',
      url: 'https://my-garden.flowershow.app',
      userId: 'user-1',
      createdAt: '2025-01-01T00:00:00Z',
    },
  };

  test('accepts valid data', () => {
    expect(CreateSiteResponseSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing site', () => {
    expect(() => CreateSiteResponseSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DeleteSiteResponseSchema
// ---------------------------------------------------------------------------
describe('DeleteSiteResponseSchema', () => {
  const valid = {
    success: true,
    message: 'Site deleted successfully',
    deletedFiles: 42,
  };

  test('accepts valid data', () => {
    expect(DeleteSiteResponseSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing deletedFiles', () => {
    const { deletedFiles, ...rest } = valid;
    expect(() => DeleteSiteResponseSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SyncRequestSchema
// ---------------------------------------------------------------------------
describe('SyncRequestSchema', () => {
  const valid = {
    files: [{ path: 'docs/index.md', size: 2048, sha: 'abc123' }],
  };

  test('accepts valid data', () => {
    expect(SyncRequestSchema.parse(valid)).toEqual(valid);
  });

  test('accepts empty files array', () => {
    const data = { files: [] };
    expect(SyncRequestSchema.parse(data)).toEqual(data);
  });

  test('rejects missing files', () => {
    expect(() => SyncRequestSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SyncResponseSchema
// ---------------------------------------------------------------------------
describe('SyncResponseSchema', () => {
  const uploadTarget = {
    path: 'docs/index.md',
    uploadUrl: 'https://storage.example.com/upload/abc',
    blobId: 'blob-123',
    contentType: 'text/markdown',
  };

  const valid = {
    toUpload: [uploadTarget],
    toUpdate: [],
    deleted: ['old-file.md'],
    unchanged: ['unchanged.md'],
    summary: { toUpload: 1, toUpdate: 0, deleted: 1, unchanged: 1 },
  };

  test('accepts valid data without dryRun', () => {
    expect(SyncResponseSchema.parse(valid)).toEqual(valid);
  });

  test('accepts valid data with dryRun', () => {
    const data = { ...valid, dryRun: true };
    expect(SyncResponseSchema.parse(data)).toEqual(data);
  });

  test('rejects missing summary', () => {
    const { summary, ...rest } = valid;
    expect(() => SyncResponseSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PublishFilesRequestSchema
// ---------------------------------------------------------------------------
describe('PublishFilesRequestSchema', () => {
  const valid = {
    files: [{ path: 'docs/index.md', size: 2048, sha: 'abc123' }],
  };

  test('accepts valid data', () => {
    expect(PublishFilesRequestSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing files', () => {
    expect(() => PublishFilesRequestSchema.parse({})).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DeleteFilesRequestSchema
// ---------------------------------------------------------------------------
describe('DeleteFilesRequestSchema', () => {
  const valid = { paths: ['docs/old.md', 'images/old.png'] };

  test('accepts valid data', () => {
    expect(DeleteFilesRequestSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing paths', () => {
    expect(() => DeleteFilesRequestSchema.parse({})).toThrow();
  });

  test('rejects empty paths array', () => {
    expect(() => DeleteFilesRequestSchema.parse({ paths: [] })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DeleteFilesResponseSchema
// ---------------------------------------------------------------------------
describe('DeleteFilesResponseSchema', () => {
  const valid = {
    deleted: ['docs/old.md'],
    notFound: ['docs/missing.md'],
  };

  test('accepts valid data', () => {
    expect(DeleteFilesResponseSchema.parse(valid)).toEqual(valid);
  });

  test('accepts empty arrays', () => {
    const data = { deleted: [], notFound: [] };
    expect(DeleteFilesResponseSchema.parse(data)).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// PublicStatusResponseSchema
// ---------------------------------------------------------------------------
describe('PublicStatusResponseSchema', () => {
  test('accepts valid data without errors', () => {
    const data = { status: 'complete' as const };
    expect(PublicStatusResponseSchema.parse(data)).toEqual(data);
  });

  test('accepts valid data with errors', () => {
    const data = {
      status: 'error' as const,
      errors: [{ path: 'docs/index.md', error: 'Failed to process' }],
    };
    expect(PublicStatusResponseSchema.parse(data)).toEqual(data);
  });

  test('accepts all status values', () => {
    for (const status of ['pending', 'complete', 'error'] as const) {
      expect(PublicStatusResponseSchema.parse({ status })).toEqual({ status });
    }
  });
});

// ---------------------------------------------------------------------------
// AnonPublishRequestSchema
// ---------------------------------------------------------------------------
describe('AnonPublishRequestSchema', () => {
  const valid = {
    files: [{ fileName: 'index.md', fileSize: 2048, sha: 'abc123' }],
    anonymousUserId: '550e8400-e29b-41d4-a716-446655440000',
  };

  test('accepts valid data', () => {
    expect(AnonPublishRequestSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing anonymousUserId', () => {
    const { anonymousUserId, ...rest } = valid;
    expect(() => AnonPublishRequestSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// AnonPublishResponseSchema
// ---------------------------------------------------------------------------
describe('AnonPublishResponseSchema', () => {
  const valid = {
    siteId: 'site-1',
    projectName: 'my-anon-site',
    files: [
      {
        fileName: 'index.md',
        uploadUrl: 'https://storage.example.com/upload/abc',
      },
    ],
    liveUrl: '/@anon/my-anon-site',
    ownershipToken: 'jwt-token-here',
  };

  test('accepts valid data', () => {
    expect(AnonPublishResponseSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing ownershipToken', () => {
    const { ownershipToken, ...rest } = valid;
    expect(() => AnonPublishResponseSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ClaimSiteRequestSchema
// ---------------------------------------------------------------------------
describe('ClaimSiteRequestSchema', () => {
  const valid = {
    siteId: 'site-1',
    ownershipToken: 'jwt-token-here',
  };

  test('accepts valid data', () => {
    expect(ClaimSiteRequestSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing siteId', () => {
    const { siteId, ...rest } = valid;
    expect(() => ClaimSiteRequestSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ClaimSiteResponseSchema
// ---------------------------------------------------------------------------
describe('ClaimSiteResponseSchema', () => {
  const valid = {
    success: true,
    site: {
      id: 'site-1',
      projectName: 'my-site',
      userId: 'user-1',
    },
  };

  test('accepts valid data', () => {
    expect(ClaimSiteResponseSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing site', () => {
    const { site, ...rest } = valid;
    expect(() => ClaimSiteResponseSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// GitHubInstallationSchema
// ---------------------------------------------------------------------------
describe('GitHubInstallationSchema', () => {
  const valid = {
    id: 'install-1',
    installationId: '12345',
    accountLogin: 'alice',
    accountType: 'User' as const,
    repositories: [
      {
        id: 'repo-1',
        repositoryId: '100',
        name: 'my-repo',
        fullName: 'alice/my-repo',
        isPrivate: false,
      },
    ],
    suspendedAt: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  };

  test('accepts valid data', () => {
    expect(GitHubInstallationSchema.parse(valid)).toEqual(valid);
  });

  test('accepts Organization accountType', () => {
    const data = { ...valid, accountType: 'Organization' as const };
    expect(GitHubInstallationSchema.parse(data)).toEqual(data);
  });

  test('rejects invalid accountType', () => {
    expect(() =>
      GitHubInstallationSchema.parse({ ...valid, accountType: 'Team' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DomainVerificationSchema
// ---------------------------------------------------------------------------
describe('DomainVerificationSchema', () => {
  const valid = {
    status: 'Valid Configuration' as const,
    domainJson: {
      name: 'example.com',
      apexName: 'example.com',
      projectId: 'proj-1',
      verified: true,
      verification: [
        {
          type: 'CNAME',
          domain: 'example.com',
          value: 'cname.vercel.app',
          reason: 'Required for verification',
        },
      ],
    },
  };

  test('accepts valid data', () => {
    expect(DomainVerificationSchema.parse(valid)).toEqual(valid);
  });

  test('accepts all status values', () => {
    const statuses = [
      'Valid Configuration',
      'Invalid Configuration',
      'Pending Verification',
      'Domain Not Found',
      'Unknown Error',
    ] as const;
    for (const status of statuses) {
      expect(DomainVerificationSchema.parse({ ...valid, status })).toEqual({
        ...valid,
        status,
      });
    }
  });

  test('rejects invalid status', () => {
    expect(() =>
      DomainVerificationSchema.parse({ ...valid, status: 'Invalid' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// UpgradeRequiredResponseSchema
// ---------------------------------------------------------------------------
describe('UpgradeRequiredResponseSchema', () => {
  const valid = {
    error: 'client_outdated',
    message: 'Please upgrade your CLI',
    currentVersion: '1.0.0',
    minimumVersion: '2.0.0',
  };

  test('accepts valid data', () => {
    expect(UpgradeRequiredResponseSchema.parse(valid)).toEqual(valid);
  });

  test('rejects missing minimumVersion', () => {
    const { minimumVersion, ...rest } = valid;
    expect(() => UpgradeRequiredResponseSchema.parse(rest)).toThrow();
  });
});
