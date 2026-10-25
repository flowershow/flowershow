import type {
  AnonCreateSiteResponse,
  FileMetadata,
  SyncMode,
  SyncResponse,
} from '@flowershow/api-contract';
import { validateSiteName } from '@/lib/validate-site-name';
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
/** Paths per call in `delete` (matches the sync route's limit). */
export const MAX_DELETE = 1000;
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
  /** Name for a new account site (signed in, no siteId). */
  name?: string;
  /** Paths to remove from an existing site (siteId only; not with replace). */
  delete?: string[];
  /**
   * Make `files` the site's complete content, removing every other file.
   * Default false: an update only adds or changes the files sent.
   */
  replace?: boolean;
};

/** Who is publishing: anonymous (claim-token sites) or an authenticated user. */
export type PublishMode = { kind: 'anon' } | { kind: 'user'; userId: string };

/**
 * How the in-process REST calls are authorized: an anonymous site's claim
 * token, or a user the MCP endpoint has already authenticated.
 */
export type PublishCredential = { claimToken: string } | { userId: string };

type StatusResult = {
  status: 'pending' | 'complete' | 'error';
  blobs?: { path: string; status: string; error: string | null }[];
};

export interface PublishDeps {
  createAnonSite(): Promise<AnonCreateSiteResponse>;
  /** Create a new site in the user's account. */
  createUserSite(
    userId: string,
    name: string,
  ): Promise<{ siteId: string; liveUrl: string }>;
  sync(
    siteId: string,
    files: FileMetadata[],
    credential: PublishCredential,
    options: { mode: SyncMode; delete: string[] },
  ): Promise<SyncResponse>;
  upload(
    url: string,
    bytes: Uint8Array,
    contentType: string,
    publishId?: string,
  ): Promise<void>;
  status(siteId: string, credential: PublishCredential): Promise<StatusResult>;
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

function decodeFiles(files: PublishFileInput[], allowEmpty: boolean) {
  if (files.length === 0 && !allowEmpty) {
    throw new PublishError('No files to publish.');
  }
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

function explain(
  err: unknown,
  mode: PublishMode,
  input: Pick<PublishInput, 'claimToken'> = {},
): string {
  if (err instanceof PublishError) return err.message;
  if (!(err instanceof ApiError)) throw err;
  if (mode.kind === 'user' && (err.status === 403 || err.status === 404)) {
    // Same answer for "not yours" and "doesn't exist": don't reveal other
    // accounts' site ids.
    return input.claimToken
      ? 'This site is not in your account. If it is an anonymous site published earlier in this conversation, call claim-site with its siteId and claimToken to move it into your account, then publish with siteId.'
      : 'Site not found in your account. Use list-sites to see your sites, or publish without siteId to create a new site.';
  }
  switch (err.status) {
    case 403:
      return 'This claim token is not valid for this site. Publish without siteId to create a new site.';
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

/** Validate and normalise the `delete` list (same path rules as files). */
function decodeDeletes(input: PublishInput, filePaths: Set<string>): string[] {
  const list = input.delete ?? [];
  if (list.length === 0) return [];
  if (!input.siteId) {
    throw new PublishError(
      'delete only applies when updating an existing site (pass its siteId).',
    );
  }
  if (input.replace) {
    throw new PublishError(
      'Use either delete or replace, not both: with replace, every file not sent is removed anyway.',
    );
  }
  if (list.length > MAX_DELETE) {
    throw new PublishError(
      `Too many paths to delete (${list.length}); the limit is ${MAX_DELETE} per call.`,
    );
  }
  const paths = new Set<string>();
  for (const raw of list) {
    const path = raw.replace(/\\/g, '/');
    const problem = invalidPath(path);
    if (problem) {
      throw new PublishError(
        `Invalid path to delete ${JSON.stringify(raw)}: ${problem}.`,
      );
    }
    if (filePaths.has(path)) {
      throw new PublishError(
        `${path} is in both files and delete: send it to update it, or list it in delete to remove it.`,
      );
    }
    paths.add(path);
  }
  return [...paths];
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
 * account token, an existing site of that account (siteId). An update only
 * adds or changes the files sent and removes the paths in `delete`; other
 * files are kept. With `replace`, the files sent become the whole site.
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
  const toDelete = decodeDeletes(
    input,
    new Set(input.files.map((f) => f.path.replace(/\\/g, '/'))),
  );
  // Deleting from an existing site needs no files.
  const files = decodeFiles(input.files, toDelete.length > 0);
  const syncMode: SyncMode = input.replace ? 'replace' : 'merge';

  let target: Omit<PublishResult, 'message'>;
  let credential: PublishCredential;
  let createdNow = false;
  if (mode.kind === 'user') {
    credential = { userId: mode.userId };
    if (input.siteId) {
      target = { siteId: input.siteId, liveUrl: '' };
    } else {
      const name = siteNameFor(input.name, files);
      let created: { siteId: string; liveUrl: string };
      try {
        created = await deps.createUserSite(mode.userId, name);
      } catch (err) {
        throw new PublishError(explain(err, mode));
      }
      createdNow = true;
      target = { siteId: created.siteId, liveUrl: created.liveUrl };
    }
  } else if (input.siteId) {
    if (!input.claimToken) {
      throw new PublishError(
        'To update an anonymous site, pass the claimToken returned when it was first published.',
      );
    }
    credential = { claimToken: input.claimToken };
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
    credential = { claimToken: created.claimToken };
    createdNow = true;
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
  let deleted: string[] = [];
  try {
    const plan = await deps.sync(
      target.siteId,
      files.map((f) => ({
        path: f.path,
        size: f.bytes.byteLength,
        sha: gitBlobSha(f.bytes),
      })),
      credential,
      { mode: syncMode, delete: toDelete },
    );
    deleted = plan.deleted;
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
        : explain(err, mode, input);
    throw new PublishError(createdNow ? withRetryHint(why, target) : why);
  }

  // Uploads are done; processing errors here shouldn't fail the publish.
  let last: StatusResult | null = null;
  const deadline = now() + pollDeadlineMs;
  for (;;) {
    try {
      last = await deps.status(target.siteId, credential);
    } catch {
      last = null;
    }
    if (last && last.status !== 'pending') break;
    if (now() + pollIntervalMs > deadline) break;
    await deps.sleep(pollIntervalMs);
  }
  const notDeleted = toDelete.filter((p) => !deleted.includes(p));
  return {
    ...target,
    message: summarise(target, last, mode, {
      deleted,
      notDeleted,
      replace: !!input.replace,
    }),
  };
}

function withRetryHint(
  why: string,
  target: Omit<PublishResult, 'message'>,
): string {
  // Only for a site this call created: on an update the caller already has
  // its siteId and claimToken, and the token may be the thing that failed.
  if (!target.claimToken) {
    return `${why}\n\nThe site was created in the user's account: retry by calling publish with siteId "${target.siteId}" instead of creating another site.`;
  }
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
  removed: { deleted: string[]; notDeleted: string[]; replace: boolean },
): string {
  const parts = [`Published: ${target.liveUrl}`];
  if (removed.replace && removed.deleted.length) {
    parts.push(
      `Replaced the site's content: removed ${removed.deleted.length} file(s) that were not sent.`,
    );
  } else if (removed.deleted.length) {
    parts.push(`Deleted: ${removed.deleted.join(', ')}`);
  }
  if (removed.notDeleted.length) {
    parts.push(
      `Not deleted (no such file on the site): ${removed.notDeleted.join(', ')}`,
    );
  }
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
      `To change the site later in this conversation, call publish again with siteId and claimToken and only the files that changed (other files are kept). ${UPDATE_HINT}`,
    );
  } else {
    parts.push(
      `The site is in the user's Flowershow account (siteId ${target.siteId}). To change it later, call publish with this siteId and only the files that changed (other files are kept). ${UPDATE_HINT}`,
    );
  }
  return parts.join('\n\n');
}

const UPDATE_HINT =
  'To remove files, list their paths in delete; to make the files you send the whole site, set replace to true.';

const NAME_MAX = 60;

function cleanName(raw: string): string | null {
  const name = raw
    .replace(/<[^>]*>/g, '')
    .replace(/[*_`~[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  const v = validateSiteName(name);
  return v.ok ? v.name : null;
}

function firstHeading(path: string, text: string): string | null {
  if (path.endsWith('.md')) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    const title = fm && /^title:\s*["']?(.+?)["']?\s*$/m.exec(fm[1] as string);
    if (title?.[1]) return title[1];
    const h = /^#\s+(.+?)\s*#*\s*$/m.exec(text);
    return h?.[1] ?? null;
  }
  if (path.endsWith('.html') || path.endsWith('.htm')) {
    const t =
      /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text) ??
      /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(text);
    return t?.[1] ?? null;
  }
  return null;
}

/**
 * Name for a new account site: the given name, else the home page's first
 * heading (or title), else "site-" plus a random suffix.
 */
export function siteNameFor(
  given: string | undefined,
  files: { path: string; bytes: Uint8Array }[],
  random: () => string = () => Math.random().toString(36).slice(2, 8),
): string {
  if (given !== undefined) {
    const v = validateSiteName(given);
    if (!v.ok) throw new PublishError(`Invalid site name: ${v.error}`);
    return v.name;
  }
  const ordered = [
    ...files.filter((f) => /^index\.(md|html?)$/i.test(f.path)),
    ...files.filter((f) => /\.(md|html?)$/i.test(f.path)),
  ];
  for (const f of ordered) {
    const heading = firstHeading(
      f.path.toLowerCase(),
      new TextDecoder().decode(f.bytes),
    );
    const name = heading && cleanName(heading);
    if (name) return name;
  }
  return `site-${random()}`;
}
