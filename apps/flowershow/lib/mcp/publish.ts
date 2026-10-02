import type {
  AnonCreateSiteResponse,
  FileMetadata,
  SyncResponse,
} from '@flowershow/api-contract';
import { gitBlobSha } from './git-sha';

/**
 * Per-call limits. Chat models send file contents in the tool call, so keep
 * it to pages and small sites; bigger sites use the CLI. The decoded limit
 * keeps the JSON request (base64 adds a third) under the transport's body
 * cap (MAX_REQUEST_BYTES) and Vercel's 4.5 MB request limit.
 */
export const MAX_FILES = 50;
export const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_PATH_BYTES = 1024;
const UPLOAD_CONCURRENCY = 6;

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

export type PublishOptions = {
  pollIntervalMs?: number;
  /** Stop waiting for processing after this long (keeps the call well inside the function timeout). */
  pollDeadlineMs?: number;
  now?: () => number;
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

function invalidPath(path: string): string | null {
  if (!path) return 'it is empty';
  if (path.startsWith('/')) return 'it is absolute';
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters
  if (/[\u0000-\u001f\u007f]/.test(path))
    return 'it contains control characters';
  if (new TextEncoder().encode(path).byteLength > MAX_PATH_BYTES) {
    return 'it is too long';
  }
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.' || seg === '..') {
      return 'it has an empty, "." or ".." segment';
    }
    if (seg.startsWith('.'))
      return 'hidden files and folders are not published';
  }
  return null;
}

function decodeBase64(path: string, value: string): Uint8Array {
  const b64 = value.replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(b64) || b64.length % 4 === 1) {
    throw new PublishError(
      `File ${path}: contentBase64 is not valid base64 (send the raw base64, without a data: prefix).`,
    );
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function decodeFiles(files: PublishFileInput[]) {
  if (files.length === 0) throw new PublishError('No files to publish.');
  if (files.length > MAX_FILES) {
    throw new PublishError(
      `Too many files (${files.length}); the limit is ${MAX_FILES} per call. ${CLI_HINT}`,
    );
  }
  const seen = new Set<string>();
  let total = 0;
  return files.map((f) => {
    const path = f.path.replace(/\\/g, '/');
    const problem = invalidPath(path);
    if (problem) {
      throw new PublishError(
        `Invalid path ${JSON.stringify(f.path)}: ${problem}. Use a relative path like "index.html" or "img/logo.png".`,
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
        : decodeBase64(path, f.contentBase64 as string);
    total += bytes.byteLength;
    if (total > MAX_TOTAL_BYTES) {
      throw new PublishError(
        `Files are larger than ${MAX_TOTAL_BYTES / 1024 / 1024} MB in total. ${CLI_HINT}`,
      );
    }
    return { path, bytes };
  });
}

function explain(err: unknown, mode: PublishMode): string {
  if (err instanceof PublishError) return err.message;
  if (!(err instanceof ApiError)) throw err;
  switch (err.status) {
    case 403:
      return mode.kind === 'user'
        ? "You don't have access to this site. Use list-sites to see your sites."
        : 'This claim token is not valid for this site. Publish without siteId to create a new site.';
    case 404:
      return 'Site not found.';
    case 409:
      return 'This site has been added to a Flowershow account, so it can no longer be updated anonymously. The owner can update it from their account.';
    case 410:
      return 'This anonymous site has expired. Publish again without siteId to create a new one.';
    case 429:
      return 'Too many anonymous sites have been published recently. Please try again later, or publish from a Flowershow account.';
    default:
      return err.message;
  }
}

/** Run `fn` over `items` with at most `limit` in flight. */
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      await fn(item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
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
  opts: PublishOptions = {},
): Promise<PublishResult> {
  const {
    pollIntervalMs = 2000,
    pollDeadlineMs = 35_000,
    now = Date.now,
  } = opts;
  const files = decodeFiles(input.files);

  let target: Omit<PublishResult, 'message'>;
  let bearer: string;
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
    let created: AnonCreateSiteResponse;
    try {
      created = await deps.createAnonSite();
    } catch (err) {
      throw new PublishError(explain(err, mode));
    }
    bearer = created.claimToken;
    target = {
      siteId: created.siteId,
      liveUrl: created.liveUrl,
      claimUrl: created.claimUrl,
      claimToken: created.claimToken,
      expiresAt: created.expiresAt,
    };
  }

  // From here on the site exists: never lose its claim link.
  let step = 'sync';
  try {
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

    step = 'upload';
    const byPath = new Map(files.map((f) => [f.path, f.bytes]));
    await mapLimit(
      [...plan.toUpload, ...plan.toUpdate],
      UPLOAD_CONCURRENCY,
      async (u) => {
        const bytes = byPath.get(u.path);
        if (bytes) {
          await deps.upload(u.uploadUrl, bytes, u.contentType, plan.publishId);
        }
      },
    );
  } catch (err) {
    const why =
      step === 'upload'
        ? 'Uploading the files failed. Please try again.'
        : explain(err, mode);
    throw new PublishError(withRetryHint(why, target, mode));
  }

  // Uploads are done; processing errors here shouldn't fail the publish.
  let last: StatusResult | null = null;
  const deadline = now() + pollDeadlineMs;
  for (;;) {
    try {
      last = await deps.status(target.siteId, bearer);
    } catch {
      last = null;
    }
    if (last && last.status !== 'pending') break;
    if (now() + pollIntervalMs > deadline) break;
    await deps.sleep(pollIntervalMs);
  }
  return { ...target, message: summarise(target, last, mode) };
}

function withRetryHint(
  why: string,
  target: Omit<PublishResult, 'message'>,
  mode: PublishMode,
): string {
  if (mode.kind !== 'anon' || !target.claimToken) return why;
  const lines = [
    why,
    `The site was created: retry by calling publish with siteId "${target.siteId}" and claimToken "${target.claimToken}" instead of creating a new site.`,
  ];
  if (target.claimUrl) {
    lines.push(
      `Claim link (show it to the user so they can keep the site): ${target.claimUrl}`,
    );
  }
  return lines.join('\n\n');
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
