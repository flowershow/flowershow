import chatgptSnapshot from './data/chatgpt-connectors.json';

/**
 * Published egress ranges of the chat platforms that call our MCP endpoint.
 * Requests from these IPs carry many users each, so they are not limited per
 * IP (lib/mcp/limits.ts).
 *
 * - Anthropic: https://platform.claude.com/docs/en/api/ip-addresses
 *   (outbound, "will not change without notice").
 * - OpenAI (ChatGPT connectors/apps): https://openai.com/chatgpt-connectors.json.
 *   A snapshot ships with the code; it is refreshed in the background once a
 *   day per instance, and the snapshot is kept if the fetch fails.
 */

export type Platform = 'anthropic' | 'openai';

const ANTHROPIC_RANGES = ['160.79.104.0/21'];
const OPENAI_RANGES_URL = 'https://openai.com/chatgpt-connectors.json';
const REFRESH_MS = 24 * 60 * 60 * 1000;

type Range = { base: number; mask: number };

function parseIpv4(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return (
    (((parts[0] as number) << 24) |
      ((parts[1] as number) << 16) |
      ((parts[2] as number) << 8) |
      (parts[3] as number)) >>>
    0
  );
}

export function parseCidr(cidr: string): Range | null {
  const [ip, bits = '32'] = cidr.split('/');
  const base = parseIpv4(ip ?? '');
  const n = Number(bits);
  if (base === null || !Number.isInteger(n) || n < 0 || n > 32) return null;
  const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0;
  return { base: (base & mask) >>> 0, mask };
}

function toRanges(cidrs: string[]): Range[] {
  return cidrs.map(parseCidr).filter((r): r is Range => r !== null);
}

function openaiPrefixes(data: unknown): string[] {
  const prefixes = (data as { prefixes?: { ipv4Prefix?: unknown }[] })
    ?.prefixes;
  if (!Array.isArray(prefixes)) return [];
  return prefixes
    .map((p) => p?.ipv4Prefix)
    .filter((p): p is string => typeof p === 'string');
}

const anthropic = toRanges(ANTHROPIC_RANGES);
let openai = toRanges(openaiPrefixes(chatgptSnapshot));
let openaiFetchedAt = Date.now();

function refreshOpenAiRanges(now: number) {
  if (now - openaiFetchedAt < REFRESH_MS) return;
  openaiFetchedAt = now;
  fetch(OPENAI_RANGES_URL, { signal: AbortSignal.timeout(3000) })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const ranges = toRanges(openaiPrefixes(data));
      // A truncated or empty answer must not drop the snapshot.
      if (ranges.length >= 10) openai = ranges;
    })
    .catch(() => {});
}

function inRanges(ip: number, ranges: Range[]): boolean {
  return ranges.some((r) => (ip & r.mask) >>> 0 === r.base);
}

/** The chat platform whose published egress ranges contain `ip`, if any. */
export function platformForIp(ip: string, now = Date.now()): Platform | null {
  refreshOpenAiRanges(now);
  const n = parseIpv4(ip.replace(/^::ffff:/, ''));
  if (n === null) return null;
  if (inRanges(n, anthropic)) return 'anthropic';
  if (inRanges(n, openai)) return 'openai';
  return null;
}
