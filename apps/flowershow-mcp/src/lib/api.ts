/**
 * Flowershow API client.
 *
 * Thin fetch wrapper that authenticates with a Personal Access Token (PAT)
 * and returns typed responses from the Flowershow REST API.
 */

export interface SiteSummary {
  id: string;
  projectName: string;
  url: string;
  fileCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface ListSitesResponse {
  sites: SiteSummary[];
  total: number;
}

export interface SiteDetail {
  id: string;
  projectName: string;
  ghRepository: string | null;
  ghBranch: string | null;
  customDomain: string | null;
  rootDir: string | null;
  autoSync: boolean;
  plan: 'FREE' | 'PREMIUM';
  privacyMode: 'PUBLIC' | 'PASSWORD';
  enableComments: boolean;
  enableSearch: boolean;
  syntaxMode: string;
  url: string;
  fileCount: number;
  totalSize: number;
  updatedAt: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  image: string | null;
  role: 'USER' | 'ADMIN';
}

export interface FileMetadata {
  path: string;
  size: number;
  sha: string;
}

export interface UploadTarget {
  path: string;
  uploadUrl: string;
  blobId: string;
  contentType: string;
}

export interface PublishFilesResponse {
  files: UploadTarget[];
}

export interface StatusResponse {
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
    syncStatus: 'UPLOADING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';
    syncError: string | null;
    extension: string | null;
  }>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
  ) {
    super(`Flowershow API error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export class FlowershowApi {
  private readonly baseUrl: string;
  private readonly pat: string;

  constructor(opts: { baseUrl: string; pat: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.pat = opts.pat;
  }

  private async request<T>(
    method: string,
    path: string,
    requestBody?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.pat}`,
        Accept: 'application/json',
        ...(requestBody !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      ...(requestBody !== undefined
        ? { body: JSON.stringify(requestBody) }
        : {}),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, res.statusText, text);
    }

    return (await res.json()) as T;
  }

  async listSites(): Promise<ListSitesResponse> {
    return this.request<ListSitesResponse>('GET', '/sites');
  }

  async getSite(siteId: string): Promise<{ site: SiteDetail }> {
    return this.request<{ site: SiteDetail }>('GET', `/sites/id/${siteId}`);
  }

  async getUser(): Promise<User> {
    return this.request<User>('GET', '/user');
  }

  async createSite(
    projectName: string,
    overwrite = false,
  ): Promise<{ site: { id: string; projectName: string; url: string } }> {
    return this.request<{
      site: { id: string; projectName: string; url: string };
    }>('POST', '/sites', { projectName, overwrite });
  }

  async deleteSite(siteId: string): Promise<{ success: boolean; deletedFiles: number }> {
    return this.request<{ success: boolean; deletedFiles: number }>(
      'DELETE',
      `/sites/id/${siteId}`,
    );
  }

  async publishFiles(
    siteId: string,
    files: FileMetadata[],
  ): Promise<PublishFilesResponse> {
    return this.request<PublishFilesResponse>(
      'POST',
      `/sites/id/${siteId}/files`,
      { files },
    );
  }

  async getSiteStatus(siteId: string): Promise<StatusResponse> {
    return this.request<StatusResponse>('GET', `/sites/id/${siteId}/status`);
  }

  async uploadToPresignedUrl(url: string, content: string, contentType = 'text/markdown'): Promise<void> {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: content,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, res.statusText, text);
    }
  }
}
