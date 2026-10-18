import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';

/**
 * SSRF-safe HTTPS GET for fetching client ID metadata documents (CIMD), whose
 * URL is chosen by whoever starts an authorization request.
 *
 * - https only, default port only, no credentials in the URL
 * - every address the hostname resolves to must be public; the check runs in
 *   the socket's own DNS lookup, so the address we connect to is the address
 *   we checked (no DNS-rebinding gap between check and connect)
 * - IP-literal hosts are checked directly (Node skips lookup for them)
 * - redirects are not followed (a 3xx is an error)
 * - overall deadline and response size cap
 */

const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (cloud metadata lives here)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['::', 96], // IPv4-compatible (deprecated)
  ['64:ff9b::', 96], // NAT64
  ['64:ff9b:1::', 48], // local-use NAT64
  ['100::', 64], // discard
  ['2001::', 23], // IETF protocol assignments (incl. Teredo)
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4 (embeds a v4 address)
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['fec0::', 10], // site-local (deprecated)
  ['ff00::', 8], // multicast
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6');
}

// IPv4-mapped IPv6 (::ffff:a.b.c.d) is kept in its own list: BlockList
// applies a mapped subnet to plain IPv4 checks too, which would block
// everything. A mapped address could hide any v4 address, so all are refused.
const mapped = new BlockList();
mapped.addSubnet('::ffff:0:0', 96, 'ipv6');

/** True when `ip` is a syntactically valid, publicly routable address. */
export function isPublicIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return !blocked.check(ip, 'ipv4');
  if (family === 6) {
    return !mapped.check(ip, 'ipv6') && !blocked.check(ip, 'ipv6');
  }
  return false;
}

export class SafeFetchError extends Error {
  constructor(
    public reason:
      | 'invalid_url'
      | 'blocked_address'
      | 'dns_error'
      | 'timeout'
      | 'too_large'
      | 'redirect'
      | 'http_status'
      | 'network',
    message: string,
  ) {
    super(message);
  }
}

type LookupFn = (
  hostname: string,
  options: { all: true },
  callback: (
    err: NodeJS.ErrnoException | null,
    addresses: LookupAddress[],
  ) => void,
) => void;

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  /** Injected for tests; defaults to dns.lookup. */
  lookup?: LookupFn;
  /** Injected for tests; defaults to https.request. */
  request?: typeof https.request;
};

export type SafeFetchResult = {
  status: number;
  contentType: string | null;
  body: string;
};

/**
 * A `lookup` for net.connect that resolves all addresses and fails unless
 * every one is public. Rejecting when any address is private (rather than
 * picking a public one) keeps the behaviour predictable.
 */
export function guardedLookup(lookup: LookupFn) {
  return (
    hostname: string,
    options: { all?: boolean } | number,
    callback: (
      err: NodeJS.ErrnoException | null,
      address: string | LookupAddress[],
      family?: number,
    ) => void,
  ) => {
    lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return callback(err, []);
      if (!addresses?.length) {
        return callback(
          Object.assign(new Error(`No addresses for ${hostname}`), {
            code: 'ENOTFOUND',
          }),
          [],
        );
      }
      const bad = addresses.find((a) => !isPublicIp(a.address));
      if (bad) {
        return callback(
          Object.assign(new Error(`Blocked address for ${hostname}`), {
            code: 'EBLOCKED',
          }),
          [],
        );
      }
      const wantAll = typeof options === 'object' && options?.all;
      if (wantAll) return callback(null, addresses);
      const first = addresses[0] as LookupAddress;
      callback(null, first.address, first.family);
    });
  };
}

/** Parse and vet a URL before any network I/O. */
export function checkFetchUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeFetchError('invalid_url', 'Not a valid URL');
  }
  if (url.protocol !== 'https:') {
    throw new SafeFetchError('invalid_url', 'Only https URLs are allowed');
  }
  if (url.username || url.password) {
    throw new SafeFetchError('invalid_url', 'Credentials are not allowed');
  }
  if (url.port && url.port !== '443') {
    throw new SafeFetchError('invalid_url', 'Only the default port is allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && !isPublicIp(host)) {
    throw new SafeFetchError('blocked_address', 'Address is not public');
  }
  return url;
}

export async function safeFetch(
  raw: string,
  opts: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const {
    timeoutMs = 5000,
    maxBytes = 5 * 1024,
    lookup = dnsLookup as unknown as LookupFn,
    request = https.request,
  } = opts;
  const url = checkFetchUrl(raw);

  return new Promise<SafeFetchResult>((resolve, reject) => {
    let settled = false;
    const finish = (err: SafeFetchError | null, result?: SafeFetchResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) {
        req.destroy();
        reject(err);
      } else resolve(result as SafeFetchResult);
    };
    const timer = setTimeout(
      () => finish(new SafeFetchError('timeout', 'Request timed out')),
      timeoutMs,
    );

    const req = request(
      url,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'Flowershow-OAuth/1',
        },
        lookup: guardedLookup(lookup) as never,
        // A fresh connection per request: never reuse a socket opened for
        // another host.
        agent: false,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return finish(
            new SafeFetchError('redirect', 'Redirects are not followed'),
          );
        }
        if (status !== 200) {
          res.resume();
          return finish(new SafeFetchError('http_status', `HTTP ${status}`));
        }
        const declared = Number(res.headers['content-length']);
        if (Number.isFinite(declared) && declared > maxBytes) {
          res.resume();
          return finish(new SafeFetchError('too_large', 'Response too large'));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            return finish(
              new SafeFetchError('too_large', 'Response too large'),
            );
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          finish(null, {
            status,
            contentType:
              (res.headers['content-type'] as string | undefined) ?? null,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
        res.on('error', () =>
          finish(new SafeFetchError('network', 'Response failed')),
        );
      },
    );
    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EBLOCKED') {
        return finish(
          new SafeFetchError('blocked_address', 'Address is not public'),
        );
      }
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
        return finish(new SafeFetchError('dns_error', 'Host not found'));
      }
      finish(new SafeFetchError('network', 'Request failed'));
    });
    req.end();
  });
}
