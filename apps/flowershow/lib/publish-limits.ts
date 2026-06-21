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

export function validatePublishFiles(
  files: FileMetadata[],
): NextResponse | null {
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      {
        error: 'payload_too_large',
        message: `Maximum ${MAX_FILES} files per request`,
      },
      { status: 413 },
    );
  }

  let totalSize = 0;
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
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'file_too_large',
          message: `File ${file.path} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 },
      );
    }
    totalSize += file.size;
  }

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
