import { describe, expect, test } from 'vitest';
import {
  FileMetadataSchema,
  ListSitesResponseSchema,
  PublishFilesResponseSchema,
  SiteDetailSchema,
  SiteSummarySchema,
  StatusResponseSchema,
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
