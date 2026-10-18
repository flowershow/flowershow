// @vitest-environment node
import { EventEmitter } from 'node:events';
import type { LookupAddress } from 'node:dns';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  checkFetchUrl,
  guardedLookup,
  isPublicIp,
  SafeFetchError,
  safeFetch,
} from './safe-fetch';

describe('isPublicIp', () => {
  it.each([
    '127.0.0.1',
    '127.1.2.3',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '64:ff9b::a9fe:a9fe',
    '2002:7f00:1::',
    'ff02::1',
    'not-an-ip',
    '',
  ])('blocks %s', (ip) => {
    expect(isPublicIp(ip)).toBe(false);
  });

  it.each([
    '1.1.1.1',
    '8.8.8.8',
    '172.32.0.1',
    '160.79.104.10',
    '2606:4700::1111',
    '2a00:1450::1',
  ])('allows %s', (ip) => {
    expect(isPublicIp(ip)).toBe(true);
  });
});

describe('checkFetchUrl', () => {
  it('accepts a plain https URL', () => {
    expect(checkFetchUrl('https://claude.ai/oauth/client.json').hostname).toBe(
      'claude.ai',
    );
  });

  it.each([
    ['http://claude.ai/client.json', 'invalid_url'],
    ['ftp://claude.ai/client.json', 'invalid_url'],
    ['https://user:pass@claude.ai/client.json', 'invalid_url'],
    ['https://claude.ai:8443/client.json', 'invalid_url'],
    ['not a url', 'invalid_url'],
    ['https://127.0.0.1/client.json', 'blocked_address'],
    ['https://169.254.169.254/latest/meta-data', 'blocked_address'],
    ['https://[::1]/client.json', 'blocked_address'],
    ['https://[::ffff:7f00:1]/client.json', 'blocked_address'],
    ['https://2130706433/client.json', 'blocked_address'], // decimal 127.0.0.1
    ['https://0x7f.0.0.1/client.json', 'blocked_address'], // hex 127.0.0.1
  ])('rejects %s (%s)', (url, reason) => {
    try {
      checkFetchUrl(url);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(SafeFetchError);
      expect((err as SafeFetchError).reason).toBe(reason);
    }
  });
});

type Addr = LookupAddress[];
const fakeLookup =
  (addresses: Addr | Error) =>
  (
    _h: string,
    _o: { all: true },
    cb: (e: NodeJS.ErrnoException | null, a: Addr) => void,
  ) =>
    addresses instanceof Error ? cb(addresses, []) : cb(null, addresses);

describe('guardedLookup (runs inside the socket connect, after DNS resolution)', () => {
  const run = (addresses: Addr, all = false) =>
    new Promise<{ err: NodeJS.ErrnoException | null; address: unknown }>(
      (resolve) =>
        guardedLookup(fakeLookup(addresses))(
          'example.com',
          { all },
          (err, address) => resolve({ err, address }),
        ),
    );

  it('passes public addresses through', async () => {
    const r = await run([{ address: '93.184.216.34', family: 4 }]);
    expect(r.err).toBeNull();
    expect(r.address).toBe('93.184.216.34');
  });

  it('returns all addresses when asked (happy eyeballs)', async () => {
    const addrs = [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1::1', family: 6 },
    ];
    expect((await run(addrs, true)).address).toEqual(addrs);
  });

  it.each([
    [[{ address: '127.0.0.1', family: 4 }]],
    [[{ address: '10.1.2.3', family: 4 }]],
    [[{ address: '169.254.169.254', family: 4 }]],
    [[{ address: 'fe80::1', family: 6 }]],
    // A rebinding-style answer mixing public and private: refused outright.
    [
      [
        { address: '93.184.216.34', family: 4 },
        { address: '192.168.0.10', family: 4 },
      ],
    ],
  ])('blocks %j', async (addrs) => {
    const r = await run(addrs as Addr);
    expect(r.err?.code).toBe('EBLOCKED');
  });

  it('fails on an empty answer', async () => {
    expect((await run([])).err?.code).toBe('ENOTFOUND');
  });
});

/** A stand-in for https.request that resolves the host via the lookup option, as net.connect would. */
function fakeRequest(
  respond: (
    res: PassThrough & {
      statusCode?: number;
      headers?: Record<string, string>;
    },
  ) => void,
) {
  const calls: { url: URL; opts: Record<string, any> }[] = [];
  const request = vi.fn(
    (url: URL, opts: Record<string, any>, cb: (res: any) => void) => {
      calls.push({ url, opts });
      const req = new EventEmitter() as EventEmitter & {
        end(): void;
        destroy(): void;
      };
      req.destroy = vi.fn();
      req.end = () => {
        opts.lookup(
          url.hostname,
          { all: false },
          (err: NodeJS.ErrnoException | null) => {
            if (err) return req.emit('error', err);
            const res = Object.assign(new PassThrough(), {
              statusCode: 200,
              headers: {},
            });
            respond(res); // sets status/headers and queues body chunks
            cb(res);
          },
        );
      };
      return req;
    },
  );
  return { request: request as never, calls };
}

const PUBLIC = fakeLookup([{ address: '160.79.104.10', family: 4 }]);
const URL_OK = 'https://claude.ai/oauth/client.json';

describe('safeFetch', () => {
  it('returns the body of a small 200 response', async () => {
    const { request, calls } = fakeRequest((res) => {
      res.headers = { 'content-type': 'application/json' };
      res.end('{"ok":true}');
    });
    const r = await safeFetch(URL_OK, { lookup: PUBLIC, request });
    expect(r).toEqual({
      status: 200,
      contentType: 'application/json',
      body: '{"ok":true}',
    });
    // Never pools sockets across hosts.
    expect(calls[0]?.opts.agent).toBe(false);
  });

  it('blocks a hostname that resolves to a private address, before connecting', async () => {
    const respond = vi.fn();
    const { request } = fakeRequest(respond);
    await expect(
      safeFetch(URL_OK, {
        lookup: fakeLookup([{ address: '169.254.169.254', family: 4 }]),
        request,
      }),
    ).rejects.toMatchObject({ reason: 'blocked_address' });
    expect(respond).not.toHaveBeenCalled();
  });

  it('blocks with the real https.request too (lookup guard is wired in)', async () => {
    await expect(
      safeFetch('https://internal.example/client.json', {
        lookup: fakeLookup([{ address: '127.0.0.1', family: 4 }]),
      }),
    ).rejects.toMatchObject({ reason: 'blocked_address' });
  });

  it('does not follow redirects', async () => {
    const { request } = fakeRequest((res) => {
      res.statusCode = 302;
      res.headers = { location: 'http://169.254.169.254/' };
      res.end();
    });
    await expect(
      safeFetch(URL_OK, { lookup: PUBLIC, request }),
    ).rejects.toMatchObject({
      reason: 'redirect',
    });
  });

  it('rejects non-200 responses', async () => {
    const { request } = fakeRequest((res) => {
      res.statusCode = 404;
      res.end('nope');
    });
    await expect(
      safeFetch(URL_OK, { lookup: PUBLIC, request }),
    ).rejects.toMatchObject({
      reason: 'http_status',
    });
  });

  it('rejects a declared Content-Length over the limit', async () => {
    const { request } = fakeRequest((res) => {
      res.headers = { 'content-length': '999999' };
      res.end('{}');
    });
    await expect(
      safeFetch(URL_OK, { lookup: PUBLIC, request, maxBytes: 5120 }),
    ).rejects.toMatchObject({ reason: 'too_large' });
  });

  it('stops reading a streamed body over the limit', async () => {
    const { request } = fakeRequest((res) => {
      res.write('x'.repeat(4000));
      res.write('x'.repeat(4000));
      res.end();
    });
    await expect(
      safeFetch(URL_OK, { lookup: PUBLIC, request, maxBytes: 5120 }),
    ).rejects.toMatchObject({ reason: 'too_large' });
  });

  it('times out a slow server', async () => {
    const { request } = fakeRequest((res) => {
      res.write('{'); // never ends
    });
    await expect(
      safeFetch(URL_OK, { lookup: PUBLIC, request, timeoutMs: 50 }),
    ).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('times out a server that never answers', async () => {
    const request = vi.fn(() => {
      const req = new EventEmitter() as EventEmitter & {
        end(): void;
        destroy(): void;
      };
      req.end = () => {};
      req.destroy = vi.fn();
      return req;
    }) as never;
    await expect(
      safeFetch(URL_OK, { lookup: PUBLIC, request, timeoutMs: 50 }),
    ).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('reports DNS failures', async () => {
    const { request } = fakeRequest(() => {});
    const err = Object.assign(new Error('nx'), { code: 'ENOTFOUND' });
    await expect(
      safeFetch(URL_OK, { lookup: fakeLookup(err), request }),
    ).rejects.toMatchObject({ reason: 'dns_error' });
  });

  it('refuses http and private IP literals without any I/O', async () => {
    const { request } = fakeRequest(() => {});
    await expect(
      safeFetch('http://claude.ai/x', { request }),
    ).rejects.toMatchObject({
      reason: 'invalid_url',
    });
    await expect(
      safeFetch('https://10.0.0.1/x', { request }),
    ).rejects.toMatchObject({
      reason: 'blocked_address',
    });
    expect(request).not.toHaveBeenCalled();
  });
});
