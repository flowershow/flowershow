import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: { NEXT_PUBLIC_CLOUD_DOMAIN: 'cloud.example.com' },
}));

import {
  deleteExpiredInvites,
  generateInviteToken,
  hashInviteToken,
  inviteUrl,
  normalizeInviteEmail,
} from './site-invites';

describe('site invites', () => {
  it('generates a prefixed token with 32 random bytes; two calls differ', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a.startsWith('fs_inv_')).toBe(true);
    expect(Buffer.from(a.slice('fs_inv_'.length), 'base64url')).toHaveLength(
      32,
    );
    expect(a).not.toBe(b);
  });

  it('hashes to deterministic 64-char hex that is not the token', () => {
    const token = generateInviteToken();
    const hash = hashInviteToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).toBe(hash);
    expect(hash).not.toBe(token);
  });

  it('normalises emails', () => {
    expect(normalizeInviteEmail('  Ada@Example.COM ')).toBe('ada@example.com');
  });

  it('builds an https invite url on the cloud domain', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(inviteUrl('fs_inv_x')).toBe(
      'https://cloud.example.com/invite/fs_inv_x',
    );
    vi.stubEnv('NODE_ENV', 'development');
    expect(inviteUrl('fs_inv_x')).toBe(
      'http://cloud.example.com/invite/fs_inv_x',
    );
    vi.unstubAllEnvs();
  });

  it('deletes only expired invites for the site', async () => {
    const db = { siteInvite: { deleteMany: vi.fn().mockResolvedValue({}) } };
    await deleteExpiredInvites(db as any, 'site-1');
    expect(db.siteInvite.deleteMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1', expiresAt: { lt: expect.any(Date) } },
    });
  });
});
