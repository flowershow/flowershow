/**
 * Flowershow API client.
 *
 * Thin fetch wrapper that authenticates with a Personal Access Token (PAT)
 * and returns typed responses from the Flowershow REST API.
 */

import type {
  CreateSiteResponse,
  DeleteSiteResponse,
  GetSiteResponse,
  ListSitesResponse,
  PublishFilesResponse,
  SiteDetail,
  StatusResponse,
  User,
} from '@flowershow/api-contract';
import {
  CreateSiteResponseSchema,
  DeleteSiteResponseSchema,
  FileMetadata,
  GetSiteResponseSchema,
  ListSitesResponseSchema,
  PublishFilesResponseSchema,
  SiteDetailSchema,
  StatusResponseSchema,
  UserSchema,
} from '@flowershow/api-contract';

export type {
  CreateSiteResponse,
  DeleteSiteResponse,
  GetSiteResponse,
  ListSitesResponse,
  SiteDetail,
  User,
  FileMetadata,
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
    parseResponse?: (body: unknown) => T,
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

    const body = (await res.json()) as unknown;

    if (!parseResponse) {
      return body as T;
    }

    try {
      return parseResponse(body);
    } catch (error) {
      throw new ApiError(
        502,
        'Bad Gateway',
        `Invalid API response for ${method} ${path}: ${error instanceof Error ? error.message : 'Unknown parse error'}`,
      );
    }
  }

  async listSites(): Promise<ListSitesResponse> {
    return this.request<ListSitesResponse>('GET', '/sites', undefined, (body) =>
      ListSitesResponseSchema.parse(body),
    );
  }

  async getSite(siteId: string): Promise<GetSiteResponse> {
    return this.request<GetSiteResponse>(
      'GET',
      `/sites/id/${siteId}`,
      undefined,
      (body) => GetSiteResponseSchema.parse(body),
    );
  }

  async getUser(): Promise<User> {
    return this.request<User>('GET', '/user', undefined, (body) =>
      UserSchema.parse(body),
    );
  }

  async createSite(
    projectName: string,
    overwrite = false,
  ): Promise<CreateSiteResponse> {
    return this.request<CreateSiteResponse>(
      'POST',
      '/sites',
      { projectName, overwrite },
      (body) => CreateSiteResponseSchema.parse(body),
    );
  }

  async deleteSite(siteId: string): Promise<DeleteSiteResponse> {
    return this.request<DeleteSiteResponse>(
      'DELETE',
      `/sites/id/${siteId}`,
      undefined,
      (body) => DeleteSiteResponseSchema.parse(body),
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
      (body) => PublishFilesResponseSchema.parse(body),
    );
  }

  async getSiteStatus(siteId: string): Promise<StatusResponse> {
    return this.request<StatusResponse>(
      'GET',
      `/sites/id/${siteId}/status`,
      undefined,
      (body) => StatusResponseSchema.parse(body),
    );
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
