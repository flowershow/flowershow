import { createLogger, maskToken } from './logger';
import type {
  CreateSiteRequest,
  DeleteFilesResponse,
  FileMetadata,
  PublishFilesResponse,
  Site,
  SiteStatus,
  SyncManifestEntry,
  SyncResponse,
  User,
} from './types';

const log = createLogger('api-client');

// ── Error class ─────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Flowershow API error (${statusCode})`);
    this.name = 'ApiClientError';
  }
}

// ── API response wrapper types ──────────────────────────────
// The Flowershow API wraps some responses in an envelope object.

interface ListSitesResponse {
  sites: Site[];
  total: number;
}

interface SiteEnvelope {
  site: Site;
}

interface PublishFilesApiResponse {
  files: Array<{
    path: string;
    uploadUrl: string;
    blobId: string;
    contentType: string;
  }>;
}

interface SiteStatusApiResponse {
  siteId: string;
  status: 'pending' | 'complete' | 'error';
  files: {
    total: number;
    pending: number;
    success: number;
    failed: number;
  };
  blobs?: Array<{
    id: string;
    path: string;
    syncStatus: string;
    syncError: string | null;
    extension: string;
  }>;
}

// ── Client ──────────────────────────────────────────────────

export class FlowershowApiClient {
  constructor(private readonly baseUrl: string) {}

  // ── User ──────────────────────────────────────────────

  async getUser(token: string): Promise<User> {
    log.info('Fetching user profile');
    return this.get<User>('/api/user', token);
  }

  // ── Sites ─────────────────────────────────────────────

  async listSites(token: string): Promise<Site[]> {
    log.info('Listing sites');
    const response = await this.get<ListSitesResponse>('/api/sites', token);
    log.debug('listSites raw response keys', { keys: Object.keys(response) });

    if (!response.sites || !Array.isArray(response.sites)) {
      log.error('listSites: unexpected response shape', {
        type: typeof response,
        keys: Object.keys(response),
        isArray: Array.isArray(response),
      });
      throw new Error(
        `Unexpected response from /api/sites: expected { sites: [...] } but got ${JSON.stringify(Object.keys(response))}`,
      );
    }

    log.info('Listed sites', { count: response.sites.length });
    return response.sites;
  }

  async createSite(token: string, data: CreateSiteRequest): Promise<Site> {
    log.info('Creating site', {
      projectName: data.projectName,
      overwrite: data.overwrite,
    });
    const response = await this.post<SiteEnvelope>('/api/sites', data, token);
    log.debug('createSite raw response keys', { keys: Object.keys(response) });

    if (!response.site) {
      log.error('createSite: unexpected response shape', {
        keys: Object.keys(response),
      });
      throw new Error(
        `Unexpected response from POST /api/sites: expected { site: {...} } but got ${JSON.stringify(Object.keys(response))}`,
      );
    }

    log.info('Site created', {
      siteId: response.site.id,
      projectName: response.site.projectName,
    });
    return response.site;
  }

  async getSite(token: string, siteId: string): Promise<Site> {
    log.info('Fetching site', { siteId });
    const response = await this.get<SiteEnvelope>(
      `/api/sites/id/${siteId}`,
      token,
    );
    log.debug('getSite raw response keys', { keys: Object.keys(response) });

    if (!response.site) {
      log.error('getSite: unexpected response shape', {
        siteId,
        keys: Object.keys(response),
      });
      throw new Error(
        `Unexpected response from GET /api/sites/id/${siteId}: expected { site: {...} } but got ${JSON.stringify(Object.keys(response))}`,
      );
    }

    log.info('Fetched site', {
      siteId,
      projectName: response.site.projectName,
    });
    return response.site;
  }

  async deleteSite(token: string, siteId: string): Promise<void> {
    log.info('Deleting site', { siteId });
    await this.authedFetch(`/api/sites/id/${siteId}`, token, {
      method: 'DELETE',
    });
    log.info('Site deleted', { siteId });
  }

  // ── Files ─────────────────────────────────────────────

  async publishFiles(
    token: string,
    siteId: string,
    files: FileMetadata[],
  ): Promise<PublishFilesResponse> {
    log.info('Publishing files', { siteId, fileCount: files.length });
    const response = await this.post<PublishFilesApiResponse>(
      `/api/sites/id/${siteId}/files`,
      { files },
      token,
    );
    log.debug('publishFiles raw response keys', {
      keys: Object.keys(response),
    });

    // API returns { files: [...] } where each file has { path, uploadUrl, ... }
    // We need to transform to { uploads: [...], unchanged: [...] } for our internal type
    const uploads = (response.files ?? []).map((f) => ({
      path: f.path,
      uploadUrl: f.uploadUrl,
    }));

    // Files not in the uploads list are unchanged
    const uploadedPaths = new Set(uploads.map((u) => u.path));
    const unchanged = files
      .filter((f) => !uploadedPaths.has(f.path))
      .map((f) => f.path);

    log.info('Publish response', {
      siteId,
      toUpload: uploads.length,
      unchanged: unchanged.length,
    });
    return { uploads, unchanged };
  }

  async deleteFiles(
    token: string,
    siteId: string,
    paths: string[],
  ): Promise<DeleteFilesResponse> {
    log.info('Deleting files', { siteId, pathCount: paths.length });
    const res = await this.authedFetch(`/api/sites/id/${siteId}/files`, token, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
    const result = (await res.json()) as DeleteFilesResponse;
    log.info('Files deleted', {
      siteId,
      deleted: result.deleted?.length ?? 0,
      notFound: result.notFound?.length ?? 0,
    });
    return result;
  }

  // ── Sync ──────────────────────────────────────────────

  async syncSite(
    token: string,
    siteId: string,
    manifest: SyncManifestEntry[],
    dryRun = false,
  ): Promise<SyncResponse> {
    log.info('Syncing site', { siteId, manifestSize: manifest.length, dryRun });
    const qs = dryRun ? '?dryRun=true' : '';
    const result = await this.post<SyncResponse>(
      `/api/sites/id/${siteId}/sync${qs}`,
      { files: manifest },
      token,
    );
    log.info('Sync complete', {
      siteId,
      toUpload: result.toUpload?.length ?? 0,
      toUpdate: result.toUpdate?.length ?? 0,
      deleted: result.deleted?.length ?? 0,
      unchanged: result.unchanged?.length ?? 0,
    });
    return result;
  }

  // ── Status ────────────────────────────────────────────

  async getSiteStatus(token: string, siteId: string): Promise<SiteStatus> {
    log.info('Fetching site status', { siteId });
    const response = await this.get<SiteStatusApiResponse>(
      `/api/sites/id/${siteId}/status`,
      token,
    );
    log.debug('getSiteStatus raw response keys', {
      keys: Object.keys(response),
    });

    // Transform the API's nested { status, files: { total, pending, success, failed } }
    // to our flat SiteStatus type
    const status: SiteStatus = {
      status: response.status,
      pending: response.files?.pending ?? 0,
      success: response.files?.success ?? 0,
      error: response.files?.failed ?? 0,
      total: response.files?.total ?? 0,
    };

    log.info('Site status fetched', {
      siteId,
      status: status.status,
      total: status.total,
    });
    return status;
  }

  // ── Upload helper ─────────────────────────────────────

  async uploadToPresignedUrl(
    uploadUrl: string,
    content: Blob | string,
    contentType: string,
  ): Promise<void> {
    log.debug('Uploading to presigned URL', {
      contentType,
      contentLength: typeof content === 'string' ? content.length : 'blob',
    });
    const body =
      typeof content === 'string'
        ? content
        : new Blob([content], { type: contentType });
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body,
    });
    if (!res.ok) {
      const errText = await res.text();
      log.error('Upload to presigned URL failed', {
        status: res.status,
        contentType,
        error: errText.slice(0, 500),
      });
      throw new ApiClientError(
        res.status,
        errText,
        `Upload failed (${res.status})`,
      );
    }
    log.debug('Upload to presigned URL succeeded');
  }

  // ── Internal helpers ──────────────────────────────────

  private async rawFetch(path: string, init: RequestInit): Promise<Response> {
    log.debug('HTTP request', {
      method: init.method ?? 'GET',
      url: `${this.baseUrl}${path}`,
    });
    return fetch(`${this.baseUrl}${path}`, init);
  }

  private async authedFetch(
    path: string,
    token: string,
    init: RequestInit = {},
  ): Promise<Response> {
    log.debug('Authenticated HTTP request', {
      method: init.method ?? 'GET',
      path,
      token: maskToken(token),
    });
    const res = await this.rawFetch(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      log.error('API returned error', {
        method: init.method ?? 'GET',
        path,
        status: res.status,
        body,
      });
      throw new ApiClientError(res.status, body);
    }

    log.debug('API response OK', {
      method: init.method ?? 'GET',
      path,
      status: res.status,
    });
    return res;
  }

  private async get<T>(path: string, token: string): Promise<T> {
    const res = await this.authedFetch(path, token);
    return res.json() as Promise<T>;
  }

  private async post<T>(
    path: string,
    body: unknown,
    token?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    log.debug('HTTP POST', { path, hasToken: !!token });
    const res = await this.rawFetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      log.error('POST API returned error', {
        path,
        status: res.status,
        body: errBody,
      });
      throw new ApiClientError(res.status, errBody);
    }
    return res.json() as Promise<T>;
  }
}
