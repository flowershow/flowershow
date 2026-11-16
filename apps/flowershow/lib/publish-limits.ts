import { PublishSource } from '@prisma/client';
import { NextResponse } from 'next/server';

export const MAX_FILE_SIZE = 100 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 500 * 1024 * 1024;
export const MAX_FILES = 1000;
export const PRESIGNED_URL_TTL = 3600;

export interface FileMetadata {
  path: string;
  size: number;
  sha: string;
}

export function clientTypeToPublishSource(
  clientType: 'cli' | 'obsidian-plugin' | 'unknown',
): PublishSource {
  if (clientType === 'cli') return PublishSource.cli;
  if (clientType === 'obsidian-plugin') return PublishSource.obsidian_plugin;
  return PublishSource.dashboard_upload;
}

/**
 * Per-file checks: shape, a finite non-negative size, and the per-file size
 * cap. Safe on a full sync manifest, where most files are unchanged.
 */
export function validateFileMetadata(
  files: FileMetadata[],
): NextResponse | null {
  for (const file of files) {
    if (!file.path || typeof file.size !== 'number' || !file.sha) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          message: 'Each file must have path, size, and sha',
        },
        { status: 400 },
      );
    }
    // Declared sizes are the only total-size check: reject negative /
    // non-finite values so they can't offset the total.
    if (!Number.isFinite(file.size) || file.size < 0) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          message: `File ${file.path} has an invalid size (must be a non-negative number)`,
        },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'file_too_large',
          message: `File ${file.path} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 },
      );
    }
  }
  return null;
}

/**
 * Per-request caps on what one request hands out upload URLs for. Apply to
 * the files actually being uploaded, never to unchanged files in a manifest:
 * that would cap the size of a site rather than the size of a publish.
 */
export function validateUploadLimits(
  files: FileMetadata[],
): NextResponse | null {
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      {
        error: 'payload_too_large',
        message: `Maximum ${MAX_FILES} files to upload per request`,
      },
      { status: 413 },
    );
  }
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return NextResponse.json(
      {
        error: 'payload_too_large',
        message: `Total upload size exceeds maximum of ${MAX_TOTAL_SIZE / 1024 / 1024}MB`,
      },
      { status: 413 },
    );
  }
  return null;
}

/** Every file in the request is uploaded (e.g. POST /files). */
export function validatePublishFiles(
  files: FileMetadata[],
): NextResponse | null {
  return validateFileMetadata(files) ?? validateUploadLimits(files);
}

export const ANON_MAX_FILES = 200;
export const ANON_MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

/** Tighter limits for anonymous (claim-token) publishes, on top of the normal checks. */
export function validateAnonPublishFiles(
  files: FileMetadata[],
): NextResponse | null {
  if (files.length > ANON_MAX_FILES) {
    return NextResponse.json(
      {
        error: 'payload_too_large',
        message: `Anonymous sites are limited to ${ANON_MAX_FILES} files. Run \`fl login\` to publish more.`,
      },
      { status: 413 },
    );
  }
  // Per-file checks first (shape, finite non-negative sizes), so the anonymous
  // total below can't be undercut by negative or non-finite sizes.
  const baseError = validatePublishFiles(files);
  if (baseError) return baseError;
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > ANON_MAX_TOTAL_SIZE) {
    return NextResponse.json(
      {
        error: 'payload_too_large',
        message:
          'Anonymous sites are limited to 50 MB in total. Run `fl login` to publish more.',
      },
      { status: 413 },
    );
  }
  return null;
}
