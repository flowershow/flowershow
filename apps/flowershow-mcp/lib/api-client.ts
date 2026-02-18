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

// ── Client ──────────────────────────────────────────────────

export class FlowershowApiClient {
  constructor(private readonly baseUrl: string) {}

  // ── User ──────────────────────────────────────────────

  async getUser(token: string): Promise<User> {
    return this.get<User>('/api/user', token);
  }

  // ── Sites ─────────────────────────────────────────────

  async listSites(token: string): Promise<Site[]> {
    return this.get<Site[]>('/api/sites', token);
  }

  async createSite(token: string, data: CreateSiteRequest): Promise<Site> {
    return this.post<Site>('/api/sites', data, token);
  }

  async getSite(token: string, siteId: string): Promise<Site> {
    return this.get<Site>(`/api/sites/id/${siteId}`, token);
  }

  async deleteSite(token: string, siteId: string): Promise<void> {
    await this.authedFetch(`/api/sites/id/${siteId}`, token, {
      method: 'DELETE',
    });
  }

  // ── Files ─────────────────────────────────────────────

  async publishFiles(
    token: string,
    siteId: string,
    files: FileMetadata[],
  ): Promise<PublishFilesResponse> {
    return this.post<PublishFilesResponse>(
      `/api/sites/id/${siteId}/files`,
      { files },
      token,
    );
  }

  async deleteFiles(
    token: string,
    siteId: string,
    paths: string[],
  ): Promise<DeleteFilesResponse> {
    const res = await this.authedFetch(`/api/sites/id/${siteId}/files`, token, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
    return res.json() as Promise<DeleteFilesResponse>;
  }

  // ── Sync ──────────────────────────────────────────────

  async syncSite(
    token: string,
    siteId: string,
    manifest: SyncManifestEntry[],
    dryRun = false,
  ): Promise<SyncResponse> {
    const qs = dryRun ? '?dryRun=true' : '';
    return this.post<SyncResponse>(
      `/api/sites/id/${siteId}/sync${qs}`,
      { files: manifest },
      token,
    );
  }

  // ── Status ────────────────────────────────────────────

  async getSiteStatus(token: string, siteId: string): Promise<SiteStatus> {
    return this.get<SiteStatus>(`/api/sites/id/${siteId}/status`, token);
  }

  // ── Upload helper ─────────────────────────────────────

  async uploadToPresignedUrl(
    uploadUrl: string,
    content: Blob | string,
    contentType: string,
  ): Promise<void> {
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
      throw new ApiClientError(
        res.status,
        await res.text(),
        `Upload failed (${res.status})`,
      );
    }
  }

  // ── Internal helpers ──────────────────────────────────

  private async rawFetch(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, init);
  }

  private async authedFetch(
    path: string,
    token: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const res = await this.rawFetch(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiClientError(res.status, body);
    }
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
    const res = await this.rawFetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new ApiClientError(res.status, errBody);
    }
    return res.json() as Promise<T>;
  }
}
