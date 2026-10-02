import type {
  AnonCreateSiteResponse,
  FileMetadata,
  SyncResponse,
} from '@flowershow/api-contract';
import { gitBlobSha } from './git-sha';

/** Per-call limits: chat models send file contents in the tool call, so keep it to pages and small sites; bigger sites use the CLI. */
export const MAX_FILES = 50;
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

export type PublishFileInput = {
  path: string;
  content?: string;
  contentBase64?: string;
};

export type PublishInput = {
  files: PublishFileInput[];
  siteId?: string;
  claimToken?: string;
};

/** Who is publishing: anonymous (claim-token sites) or an account token. */
export type PublishMode = { kind: 'anon' } | { kind: 'user'; token: string };

type StatusResult = {
  status: 'pending' | 'complete' | 'error';
  blobs?: { path: string; status: string; error: string | null }[];
};

export interface PublishDeps {
  createAnonSite(): Promise<AnonCreateSiteResponse>;
  sync(
    siteId: string,
    files: FileMetadata[],
    bearer: string,
  ): Promise<SyncResponse>;
  upload(
    url: string,
    bytes: Uint8Array,
    contentType: string,
    publishId?: string,
  ): Promise<void>;
  status(siteId: string, bearer: string): Promise<StatusResult>;
  /** Public URL of an existing site (called only after sync succeeds). */
  siteUrl(siteId: string): Promise<string>;
  sleep(ms: number): Promise<void>;
}

export type PublishResult = {
  liveUrl: string;
  siteId: string;
  claimUrl?: string;
  claimToken?: string;
  expiresAt?: string;
  message: string;
};

/** A non-2xx response from the Flowershow API. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

/** An error to show the model/user as-is. */
export class PublishError extends Error {}

const CLI_HINT =
  'For bigger sites, use the Flowershow CLI (`fl`): https://flowershow.app/docs/reference/cli';

function decodeFiles(files: PublishFileInput[]) {
  if (files.length === 0) throw new PublishError('No files to publish.');
  if (files.length > MAX_FILES) {
    throw new PublishError(
      `Too many files (${files.length}); the limit is ${MAX_FILES} per call. ${CLI_HINT}`,
    );
  }
  const seen = new Set<string>();
  let total = 0;
  const decoded = files.map((f) => {
    const path = f.path.replace(/\\/g, '/');
    if (
      !path ||
      path.startsWith('/') ||
      path.includes('\0') ||
      path.split('/').some((seg) => seg === '..' || seg === '')
    ) {
      throw new PublishError(
        `Invalid path ${JSON.stringify(f.path)}: use a relative path like "index.html" or "img/logo.png".`,
      );
    }
    if (seen.has(path)) throw new PublishError(`Duplicate path: ${path}`);
    seen.add(path);
    if ((f.content === undefined) === (f.contentBase64 === undefined)) {
      throw new PublishError(
        `File ${path}: give exactly one of content (text) or contentBase64 (binary).`,
      );
    }
    const bytes =
      f.content !== undefined
        ? new TextEncoder().encode(f.content)
        : new Uint8Array(Buffer.from(f.contentBase64 as string, 'base64'));
    total += bytes.byteLength;
    if (total > MAX_TOTAL_BYTES) {
      throw new PublishError(
        `Files are larger than ${MAX_TOTAL_BYTES / 1024 / 1024} MB in total. ${CLI_HINT}`,
      );
    }
    return { path, bytes };
  });
  return decoded;
}

function explain(err: unknown): never {
  if (!(err instanceof ApiError)) throw err;
  switch (err.status) {
    case 403:
      throw new PublishError(
        'This claim token is not valid for this site. Publish without siteId to create a new site.',
      );
    case 409:
      throw new PublishError(
        'This site has been added to a Flowershow account, so it can no longer be updated anonymously. The owner can update it from their account.',
      );
    case 410:
      throw new PublishError(
        'This anonymous site has expired. Publish again without siteId to create a new one.',
      );
    case 429:
      throw new PublishError(
        'Too many anonymous sites have been published recently. Please try again later, or publish from a Flowershow account.',
      );
    default:
      throw new PublishError(err.message);
  }
}

/**
 * Publish files to a Flowershow site: a new anonymous site (with a claim
 * link), an existing anonymous site (siteId + claimToken), or, with an
 * account token, an existing site of that account (siteId). The files replace
 * the site's content: files not included are removed.
 */
export async function publish(
  input: PublishInput,
  mode: PublishMode,
  deps: PublishDeps,
  opts: { pollIntervalMs?: number; maxPollAttempts?: number } = {},
): Promise<PublishResult> {
  const { pollIntervalMs = 2000, maxPollAttempts = 15 } = opts;
  const files = decodeFiles(input.files);

  let target: Omit<PublishResult, 'message'>;
  let bearer: string;
  try {
    if (mode.kind === 'user') {
      if (!input.siteId) {
        throw new PublishError(
          'Give the siteId of the site to publish to (use list-sites to find it).',
        );
      }
      bearer = mode.token;
      target = { siteId: input.siteId, liveUrl: '' };
    } else if (input.siteId) {
      if (!input.claimToken) {
        throw new PublishError(
          'To update an anonymous site, pass the claimToken returned when it was first published.',
        );
      }
      bearer = input.claimToken;
      target = {
        siteId: input.siteId,
        claimToken: input.claimToken,
        liveUrl: '',
      };
    } else {
      const created = await deps.createAnonSite();
      bearer = created.claimToken;
      target = {
        siteId: created.siteId,
        liveUrl: created.liveUrl,
        claimUrl: created.claimUrl,
        claimToken: created.claimToken,
        expiresAt: created.expiresAt,
      };
    }

    const plan = await deps.sync(
      target.siteId,
      files.map((f) => ({
        path: f.path,
        size: f.bytes.byteLength,
        sha: gitBlobSha(f.bytes),
      })),
      bearer,
    );
    // Only look the URL up once sync has authorised the caller for this site.
    if (!target.liveUrl) target.liveUrl = await deps.siteUrl(target.siteId);
    const byPath = new Map(files.map((f) => [f.path, f.bytes]));
    for (const u of [...plan.toUpload, ...plan.toUpdate]) {
      const bytes = byPath.get(u.path);
      if (bytes)
        await deps.upload(u.uploadUrl, bytes, u.contentType, plan.publishId);
    }

    let last: StatusResult | null = null;
    for (let i = 0; i < maxPollAttempts; i++) {
      last = await deps.status(target.siteId, bearer);
      if (last.status !== 'pending') break;
      if (i < maxPollAttempts - 1) await deps.sleep(pollIntervalMs);
    }
    return { ...target, message: summarise(target, last, mode) };
  } catch (err) {
    if (err instanceof PublishError) throw err;
    explain(err);
  }
}

function summarise(
  target: Omit<PublishResult, 'message'>,
  last: StatusResult | null,
  mode: PublishMode,
): string {
  const parts = [`Published: ${target.liveUrl}`];
  if (!last || last.status === 'pending') {
    parts.push(
      'Some files are still processing, so the first load may take a few seconds.',
    );
  } else if (last.status === 'error') {
    const failed = (last.blobs ?? [])
      .filter((b) => b.status === 'error')
      .map((b) => `${b.path}: ${b.error ?? 'unknown error'}`);
    parts.push(
      `Some files failed to process${failed.length ? `:\n${failed.join('\n')}` : '.'}`,
    );
  }
  if (target.claimUrl) {
    parts.push(
      `Show the user this claim link, exactly as is, so they can keep the site (it expires in 7 days unless claimed): ${target.claimUrl}`,
    );
  }
  if (mode.kind === 'anon') {
    parts.push(
      'To change the site later in this conversation, call publish again with siteId and claimToken and the complete set of files (files left out are removed).',
    );
  }
  return parts.join('\n\n');
}
