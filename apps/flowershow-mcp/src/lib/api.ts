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

  private async request<T>(method: string, path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.pat}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(res.status, res.statusText, body);
    }

    return (await res.json()) as T;
  }

  async listSites(): Promise<ListSitesResponse> {
    return this.request<ListSitesResponse>('GET', '/api/sites');
  }
}
