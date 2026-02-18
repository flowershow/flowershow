import { describe, expectTypeOf, it } from 'vitest';
import type {
  BlobStatus,
  FileMetadata,
  ListSitesResponse,
  PublishFilesResponse,
  SiteDetail,
  SiteSummary,
  StatusResponse,
  UploadTarget,
  User,
} from './schemas.js';

describe('Inferred types', () => {
  it('SiteSummary has expected shape', () => {
    expectTypeOf<SiteSummary>().toHaveProperty('id');
    expectTypeOf<SiteSummary>().toHaveProperty('projectName');
    expectTypeOf<SiteSummary>().toHaveProperty('url');
    expectTypeOf<SiteSummary>().toHaveProperty('fileCount');
    expectTypeOf<SiteSummary>().toHaveProperty('updatedAt');
    expectTypeOf<SiteSummary>().toHaveProperty('createdAt');
  });

  it('SiteDetail.plan is a union of FREE | PREMIUM', () => {
    expectTypeOf<SiteDetail['plan']>().toEqualTypeOf<'FREE' | 'PREMIUM'>();
  });

  it('SiteDetail nullable fields accept null', () => {
    expectTypeOf<SiteDetail['ghRepository']>().toEqualTypeOf<string | null>();
    expectTypeOf<SiteDetail['ghBranch']>().toEqualTypeOf<string | null>();
    expectTypeOf<SiteDetail['customDomain']>().toEqualTypeOf<string | null>();
    expectTypeOf<SiteDetail['rootDir']>().toEqualTypeOf<string | null>();
  });

  it('User.role is a union of USER | ADMIN', () => {
    expectTypeOf<User['role']>().toEqualTypeOf<'USER' | 'ADMIN'>();
  });

  it('StatusResponse.blobs is optional', () => {
    expectTypeOf<StatusResponse>().toMatchTypeOf<{ blobs?: unknown }>();
  });

  it('BlobStatus.syncStatus is the correct enum', () => {
    expectTypeOf<BlobStatus['syncStatus']>().toEqualTypeOf<
      'UPLOADING' | 'PROCESSING' | 'SUCCESS' | 'ERROR'
    >();
  });
});
