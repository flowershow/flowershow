/**
 * FlowershowClient - API client for direct publishing to Flowershow
 * Supports publishing from Obsidian plugin using Flowershow PAT tokens
 */

export interface Site {
  id: string;
  projectName: string;
  url: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  fileCount?: number;
  totalSize?: number;
}

export interface FileMetadata {
  path: string;
  size: number;
  sha: string;
}

export interface UploadUrl {
  path: string;
  uploadUrl: string;
  blobId: string;
  contentType: string;
}

export interface SyncFilesResponse {
  toUpload: UploadUrl[];
  toUpdate: UploadUrl[];
  deleted: string[];
  unchanged: string[];
  summary: {
    toUpload: number;
    toUpdate: number;
    deleted: number;
    unchanged: number;
  };
  dryRun?: boolean;
}

export interface BlobStatus {
  path: string;
  syncStatus: "PENDING" | "SUCCESS" | "ERROR";
  syncError?: string;
}

export interface SiteStatusResponse {
  siteId: string;
  status: string;
  files: {
    total: number;
    pending: number;
    success: number;
    failed: number;
  };
  blobs: BlobStatus[];
}

export interface PublishFilesResponse {
  files: UploadUrl[];
}

export interface DeleteFilesResponse {
  deleted: string[];
  notFound: string[];
}

export interface UserInfo {
  username?: string;
  email?: string;
  id?: string;
}

export class FlowershowClient {
  private apiUrl: string;
  private token: string;

  constructor(apiUrl: string, token: string) {
    this.apiUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
    this.token = token;
  }

  /**
   * Make an authenticated API request
   */
  private async apiRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.token}`,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Get user info (to validate token)
   */
  async getUserInfo(): Promise<UserInfo> {
    const response = await this.apiRequest("/api/user");

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Failed to get user info: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Create a new site or get existing site by name
   */
  async createSite(
    projectName: string,
    overwrite: boolean = false,
  ): Promise<{ site: Site }> {
    const response = await this.apiRequest("/api/sites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectName, overwrite }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Failed to create site: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Get a site by name
   */
  async getSiteByName(
    username: string,
    siteName: string,
  ): Promise<{ site: Site } | null> {
    const response = await this.apiRequest(
      `/api/sites/${username}/${siteName}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }

      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Failed to fetch site: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Sync files with the server
   * Compares local files with existing files and returns upload URLs for changed files
   * @param dryRun If true, only returns what would happen without making changes
   */
  async syncFiles(
    siteId: string,
    files: FileMetadata[],
    dryRun: boolean = false,
  ): Promise<SyncFilesResponse> {
    const url = `/api/sites/id/${siteId}/sync${dryRun ? "?dryRun=true" : ""}`;
    const response = await this.apiRequest(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Failed to sync files: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Upload a file directly to R2 using presigned URL
   */
  async uploadToR2(
    uploadUrl: string,
    content: ArrayBuffer | Uint8Array,
    contentType: string,
  ): Promise<boolean> {
    // Convert Uint8Array to ArrayBuffer if needed
    const buffer: ArrayBuffer = (
      content instanceof Uint8Array
        ? content.buffer.slice(
            content.byteOffset,
            content.byteOffset + content.byteLength,
          )
        : content
    ) as ArrayBuffer;

    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: buffer,
      headers: {
        "Content-Type": contentType,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    return true;
  }

  /**
   * Get site processing status
   */
  async getSiteStatus(siteId: string): Promise<SiteStatusResponse> {
    const response = await this.apiRequest(`/api/sites/id/${siteId}/status`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Failed to get site status: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Get all sites for the user
   */
  async getSites(): Promise<{ sites: Site[]; total: number }> {
    const response = await this.apiRequest("/api/sites");

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Failed to fetch sites: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Publish specific files without affecting other files
   * Use this when you want to publish only selected files
   * @param siteId - Site ID
   * @param files - Array of file metadata to publish
   * @returns Upload URLs for the specified files
   */
  async publishFiles(
    siteId: string,
    files: FileMetadata[],
  ): Promise<PublishFilesResponse> {
    const response = await this.apiRequest(`/api/sites/id/${siteId}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Failed to publish files: ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Delete/unpublish specific files from the site
   * @param siteId - Site ID
   * @param paths - Array of file paths to delete
   * @returns List of deleted and not found files
   */
  async deleteFiles(
    siteId: string,
    paths: string[],
  ): Promise<DeleteFilesResponse> {
    const response = await this.apiRequest(`/api/sites/id/${siteId}/files`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Failed to delete files: ${response.statusText}`,
      );
    }

    return await response.json();
  }
}
