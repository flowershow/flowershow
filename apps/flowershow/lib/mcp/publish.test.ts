import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gitBlobSha } from './git-sha';
import {
  ApiError,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  type PublishDeps,
  PublishError,
  publish,
} from './publish';

const ANON = {
  siteId: 'site-1',
  projectName: 'p',
  liveUrl: 'https://p-anon.flowershow.me',
  claimToken: 'fs_claim_new',
  claimUrl: 'https://flowershow.app/claim?siteId=site-1#token=fs_claim_new',
  expiresAt: '2026-10-09T12:00:00.000Z',
};

function makeDeps(over: Partial<PublishDeps> = {}): PublishDeps {
  return {
    createAnonSite: vi.fn().mockResolvedValue(ANON),
    sync: vi.fn().mockImplementation(async (_siteId, files) => ({
      toUpload: files.map((f: { path: string }) => ({
        path: f.path,
        uploadUrl: `https://upload/${f.path}`,
        contentType: 'text/html',
      })),
      toUpdate: [],
      deleted: [],
      unchanged: [],
      summary: {
        toUpload: files.length,
        toUpdate: 0,
        deleted: 0,
        unchanged: 0,
      },
      publishId: 'pub-1',
    })),
    upload: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockResolvedValue({ status: 'complete' }),
    siteUrl: vi.fn().mockResolvedValue('https://notes-alice.flowershow.me'),
    sleep: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

const html = { path: 'index.html', content: '<h1>hi</h1>' };
let deps: PublishDeps;
beforeEach(() => {
  deps = makeDeps();
});

describe('publish (anonymous)', () => {
  it('creates a site, syncs with git blob shas, uploads, waits, and returns the claim link', async () => {
    const png = Buffer.from([1, 2, 3]);
    const res = await publish(
      {
        files: [
          html,
          { path: 'img/logo.png', contentBase64: png.toString('base64') },
        ],
      },
      { kind: 'anon' },
      deps,
    );

    expect(deps.createAnonSite).toHaveBeenCalledTimes(1);
    expect(deps.sync).toHaveBeenCalledWith(
      'site-1',
      [
        {
          path: 'index.html',
          size: 11,
          sha: gitBlobSha(new TextEncoder().encode('<h1>hi</h1>')),
        },
        { path: 'img/logo.png', size: 3, sha: gitBlobSha(png) },
      ],
      'fs_claim_new',
    );
    expect(deps.upload).toHaveBeenCalledTimes(2);
    expect(deps.upload).toHaveBeenCalledWith(
      'https://upload/img/logo.png',
      new Uint8Array(png),
      'text/html',
      'pub-1',
    );
    expect(deps.status).toHaveBeenCalledWith('site-1', 'fs_claim_new');
    expect(res).toMatchObject({
      liveUrl: ANON.liveUrl,
      siteId: 'site-1',
      claimUrl: ANON.claimUrl,
      claimToken: 'fs_claim_new',
      expiresAt: ANON.expiresAt,
    });
    expect(res.message).toContain(ANON.claimUrl);
    expect(res.message).toContain('7 days');
  });

  it('updates an existing anonymous site with its claim token', async () => {
    const res = await publish(
      { files: [html], siteId: 'site-9', claimToken: 'fs_claim_old' },
      { kind: 'anon' },
      deps,
    );
    expect(deps.createAnonSite).not.toHaveBeenCalled();
    expect(deps.sync).toHaveBeenCalledWith(
      'site-9',
      expect.any(Array),
      'fs_claim_old',
    );
    expect(res.siteId).toBe('site-9');
    expect(res.claimToken).toBe('fs_claim_old');
    expect(res.liveUrl).toBe('https://notes-alice.flowershow.me');
    expect(
      (deps.siteUrl as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    ).toBeGreaterThan(
      (deps.sync as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0] ??
        Number.POSITIVE_INFINITY,
    );
  });

  it('requires a claim token to update an anonymous site', async () => {
    await expect(
      publish({ files: [html], siteId: 'site-9' }, { kind: 'anon' }, deps),
    ).rejects.toThrow(/claimToken/);
    expect(deps.sync).not.toHaveBeenCalled();
  });

  it.each([
    [403, /not valid for this site/],
    [409, /added to a Flowershow account/],
    [410, /expired/],
    [429, /try again later/],
  ])('maps API status %i to a clear error', async (status, msg) => {
    deps = makeDeps({
      sync: vi.fn().mockRejectedValue(new ApiError(status, 'x', 'raw')),
    });
    await expect(
      publish(
        { files: [html], siteId: 'site-9', claimToken: 'fs_claim_old' },
        { kind: 'anon' },
        deps,
      ),
    ).rejects.toThrow(msg);
  });

  it('does not retry when site creation is rate limited', async () => {
    deps = makeDeps({
      createAnonSite: vi
        .fn()
        .mockRejectedValue(new ApiError(429, 'rate_limited', 'raw')),
    });
    await expect(
      publish({ files: [html] }, { kind: 'anon' }, deps),
    ).rejects.toThrow(/try again later/);
    expect(deps.createAnonSite).toHaveBeenCalledTimes(1);
  });

  it('passes a 503 (anonymous publishing disabled) message through', async () => {
    deps = makeDeps({
      createAnonSite: vi
        .fn()
        .mockRejectedValue(
          new ApiError(503, 'anon_disabled', 'temporarily unavailable'),
        ),
    });
    await expect(
      publish({ files: [html] }, { kind: 'anon' }, deps),
    ).rejects.toThrow(/temporarily unavailable/);
  });

  it('returns the URL with a note when processing is still running at the deadline', async () => {
    deps = makeDeps({
      status: vi.fn().mockResolvedValue({ status: 'pending' }),
    });
    let t = 0;
    deps.sleep = vi.fn().mockImplementation(async (ms: number) => {
      t += ms;
    });
    const res = await publish({ files: [html] }, { kind: 'anon' }, deps, {
      pollIntervalMs: 1000,
      pollDeadlineMs: 3000,
      now: () => t,
    });
    expect(deps.status).toHaveBeenCalledTimes(4); // t = 0, 1, 2, 3 s
    expect(res.liveUrl).toBe(ANON.liveUrl);
    expect(res.message).toMatch(/still processing/i);
  });

  it('reports files that failed to process', async () => {
    deps = makeDeps({
      status: vi.fn().mockResolvedValue({
        status: 'error',
        blobs: [
          { path: 'index.md', status: 'error', error: 'bad frontmatter' },
        ],
      }),
    });
    const res = await publish({ files: [html] }, { kind: 'anon' }, deps);
    expect(res.message).toContain('index.md: bad frontmatter');
  });
});

describe('publish (input validation, before any API call)', () => {
  it.each([
    '../x.md',
    '/abs.md',
    'a/../../b.md',
    'a\\..\\b.md',
    'a\0b.md',
    '',
    './index.html',
    'a/./b.md',
    '.env',
    '.git/config',
    'a\nb.md',
    `${'x'.repeat(600)}/${'y'.repeat(600)}.md`,
  ])('rejects path %j', async (path) => {
    await expect(
      publish({ files: [{ path, content: 'x' }] }, { kind: 'anon' }, deps),
    ).rejects.toThrow(PublishError);
    expect(deps.createAnonSite).not.toHaveBeenCalled();
  });

  it('rejects duplicate paths', async () => {
    await expect(
      publish({ files: [html, html] }, { kind: 'anon' }, deps),
    ).rejects.toThrow(/duplicate/i);
  });

  it('requires exactly one of content and contentBase64', async () => {
    await expect(
      publish({ files: [{ path: 'a.md' }] }, { kind: 'anon' }, deps),
    ).rejects.toThrow(PublishError);
    await expect(
      publish(
        { files: [{ path: 'a.md', content: 'x', contentBase64: 'eA==' }] },
        { kind: 'anon' },
        deps,
      ),
    ).rejects.toThrow(PublishError);
  });

  it('rejects too many files, pointing at the CLI', async () => {
    const files = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({
      path: `p${i}.md`,
      content: 'x',
    }));
    await expect(publish({ files }, { kind: 'anon' }, deps)).rejects.toThrow(
      /fl/,
    );
    expect(deps.createAnonSite).not.toHaveBeenCalled();
  });

  it('rejects content over the total size limit', async () => {
    const big = 'x'.repeat(MAX_TOTAL_BYTES + 1);
    await expect(
      publish(
        { files: [{ path: 'a.md', content: big }] },
        { kind: 'anon' },
        deps,
      ),
    ).rejects.toThrow(/MB/);
  });

  it('rejects an empty file list', async () => {
    await expect(
      publish({ files: [] }, { kind: 'anon' }, deps),
    ).rejects.toThrow(PublishError);
  });
});

describe('publish (base64)', () => {
  it('accepts a data: URI and whitespace in base64', async () => {
    const png = Buffer.from([137, 80, 78, 71]);
    await publish(
      {
        files: [
          {
            path: 'a.png',
            contentBase64: `data:image/png;base64,${png.toString('base64').slice(0, 4)}\n${png.toString('base64').slice(4)}`,
          },
        ],
      },
      { kind: 'anon' },
      deps,
    );
    expect(deps.sync).toHaveBeenCalledWith(
      'site-1',
      [{ path: 'a.png', size: 4, sha: gitBlobSha(png) }],
      'fs_claim_new',
    );
  });

  it('rejects invalid base64 instead of publishing garbage', async () => {
    await expect(
      publish(
        { files: [{ path: 'a.png', contentBase64: 'not base64!!' }] },
        { kind: 'anon' },
        deps,
      ),
    ).rejects.toThrow(/base64/);
  });
});

describe('publish (failures after the site was created)', () => {
  it('includes the claim link and update details when a later step fails', async () => {
    deps = makeDeps({
      upload: vi
        .fn()
        .mockRejectedValue(new ApiError(403, 'upload_failed', 'x')),
    });
    const err = await publish({ files: [html] }, { kind: 'anon' }, deps).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(PublishError);
    expect(err.message).toMatch(/upload/i);
    expect(err.message).toContain(ANON.claimUrl);
    expect(err.message).toContain('site-1');
    expect(err.message).toContain('fs_claim_new');
  });

  it('treats a status error after a successful upload as still processing', async () => {
    deps = makeDeps({
      status: vi.fn().mockRejectedValue(new ApiError(500, 'x', 'boom')),
    });
    const res = await publish({ files: [html] }, { kind: 'anon' }, deps, {
      pollDeadlineMs: 0,
    });
    expect(res.claimUrl).toBe(ANON.claimUrl);
    expect(res.message).toMatch(/still processing/i);
  });

  it('stops polling at the deadline', async () => {
    let t = 0;
    deps = makeDeps({
      status: vi.fn().mockResolvedValue({ status: 'pending' }),
      sleep: vi.fn().mockImplementation(async (ms: number) => {
        t += ms;
      }),
    });
    const res = await publish({ files: [html] }, { kind: 'anon' }, deps, {
      pollIntervalMs: 2000,
      pollDeadlineMs: 10_000,
      now: () => t,
    });
    expect(t).toBeLessThanOrEqual(10_000);
    expect(res.message).toMatch(/still processing/i);
  });

  it('uploads several files concurrently (bounded)', async () => {
    let inFlight = 0;
    let peak = 0;
    deps = makeDeps({
      upload: vi.fn().mockImplementation(async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
      }),
    });
    const files = Array.from({ length: 20 }, (_, i) => ({
      path: `p${i}.md`,
      content: 'x',
    }));
    await publish({ files }, { kind: 'anon' }, deps);
    expect(deps.upload).toHaveBeenCalledTimes(20);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(6);
  });
});

describe('publish (account token)', () => {
  it('publishes to the given site with the user token and no claim link', async () => {
    const res = await publish(
      { files: [html], siteId: 'site-u' },
      { kind: 'user', token: 'fs_pat_x' },
      deps,
    );
    expect(deps.createAnonSite).not.toHaveBeenCalled();
    expect(deps.sync).toHaveBeenCalledWith(
      'site-u',
      expect.any(Array),
      'fs_pat_x',
    );
    expect(res.liveUrl).toBe('https://notes-alice.flowershow.me');
    expect(res.claimUrl).toBeUndefined();
  });

  it('says the site is not theirs on 403 (not a claim-token message)', async () => {
    deps = makeDeps({
      sync: vi.fn().mockRejectedValue(new ApiError(403, 'forbidden', 'x')),
    });
    await expect(
      publish(
        { files: [html], siteId: 'other' },
        { kind: 'user', token: 'fs_pat_x' },
        deps,
      ),
    ).rejects.toThrow(/don't have access to this site/);
  });

  it('asks for a siteId (use list-sites) when none is given', async () => {
    await expect(
      publish({ files: [html] }, { kind: 'user', token: 'fs_pat_x' }, deps),
    ).rejects.toThrow(/list-sites/);
  });
});
