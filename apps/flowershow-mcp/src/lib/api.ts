/**
 * Flowershow API client.
 *
 * Thin fetch wrapper that authenticates with a Personal Access Token (PAT)
 * and returns typed responses from the Flowershow REST API.
 */

import type {
  FileMetadata,
  ListSitesResponse,
  PublishFilesResponse,
  SiteDetail,
  SiteSummary,
  StatusResponse,
  UploadTarget,
  User,
} from '@flowershow/api-contract';

export type {
  SiteSummary,
  ListSitesResponse,
  SiteDetail,
  User,
  FileMetadata,
  UploadTarget,
  PublishFilesResponse,
  StatusResponse,
};

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

  async deleteSite(
    siteId: string,
  ): Promise<{ success: boolean; deletedFiles: number }> {
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

  async uploadToPresignedUrl(
    url: string,
    content: string,
    contentType = 'text/markdown',
  ): Promise<void> {
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
