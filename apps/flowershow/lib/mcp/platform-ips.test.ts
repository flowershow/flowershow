import { describe, expect, it } from 'vitest';
import { parseCidr, platformForIp } from './platform-ips';

describe('platformForIp', () => {
  it("recognises Anthropic's published outbound range", () => {
    expect(platformForIp('160.79.104.1')).toBe('anthropic');
    expect(platformForIp('160.79.111.255')).toBe('anthropic');
    expect(platformForIp('160.79.112.0')).toBeNull();
  });

  it("recognises ChatGPT's connector egress ranges (bundled snapshot)", () => {
    expect(platformForIp('9.129.5.6')).toBe('openai'); // 9.129.0.0/17
    expect(platformForIp('52.6.94.121')).toBe('openai'); // /32
  });

  it('treats other, malformed and IPv6 addresses as not a platform', () => {
    expect(platformForIp('203.0.113.7')).toBeNull();
    expect(platformForIp('unknown')).toBeNull();
    expect(platformForIp('2001:db8::1')).toBeNull();
  });

  it('handles IPv4-mapped IPv6', () => {
    expect(platformForIp('::ffff:160.79.104.9')).toBe('anthropic');
  });
});

describe('parseCidr', () => {
  it('parses prefixes and rejects garbage', () => {
    expect(parseCidr('10.0.0.0/8')).toEqual({
      base: 0x0a000000,
      mask: 0xff000000,
    });
    expect(parseCidr('1.2.3.4')).toEqual({
      base: 0x01020304,
      mask: 0xffffffff,
    });
    expect(parseCidr('300.0.0.0/8')).toBeNull();
    expect(parseCidr('1.2.3.4/33')).toBeNull();
  });
});
