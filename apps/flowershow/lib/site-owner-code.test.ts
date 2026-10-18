// @vitest-environment node
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// In-memory stand-in for the SiteOwnerCode table, with Prisma's delete semantics
// (throws P2025 when the row is gone), so single use is tested for real.
const rows = new Map<
  string,
  { codeHash: string; siteId: string; userId: string; expiresAt: Date }
>();
vi.mock('@/server/db', () => ({
  default: {
    siteOwnerCode: {
      create: vi.fn(async ({ data }) => {
        rows.set(data.codeHash, data);
        return data;
      }),
      delete: vi.fn(async ({ where }) => {
        const row = rows.get(where.codeHash);
        if (!row)
          throw new Prisma.PrismaClientKnownRequestError('not found', {
            code: 'P2025',
            clientVersion: 'test',
          });
        rows.delete(where.codeHash);
        return row;
      }),
      deleteMany: vi.fn(async ({ where }) => {
        let count = 0;
        for (const [key, row] of rows)
          if (row.expiresAt < where.expiresAt.lt) {
            rows.delete(key);
            count++;
          }
        return { count };
      }),
    },
  },
}));

import {
  consumeOwnerCode,
  createOwnerCode,
  hashOwnerCode,
  OWNER_CODE_TTL_MS,
} from './site-owner-code';

beforeEach(() => rows.clear());

describe('owner sign-in codes', () => {
  it('redeems once for the right site and user', async () => {
    const code = await createOwnerCode('site-1', 'owner-1');
    expect(await consumeOwnerCode(code, 'site-1')).toBe('owner-1');
  });

  it('is single use', async () => {
    const code = await createOwnerCode('site-1', 'owner-1');
    expect(await consumeOwnerCode(code, 'site-1')).toBe('owner-1');
    expect(await consumeOwnerCode(code, 'site-1')).toBeNull();
  });

  it('expires after 60 seconds', async () => {
    const issued = new Date('2026-10-18T12:00:00Z');
    const code = await createOwnerCode('site-1', 'owner-1', issued);
    const late = new Date(issued.getTime() + OWNER_CODE_TTL_MS + 1);
    expect(await consumeOwnerCode(code, 'site-1', late)).toBeNull();
    expect(OWNER_CODE_TTL_MS).toBeLessThanOrEqual(60_000);
  });

  it('works just inside the window', async () => {
    const issued = new Date('2026-10-18T12:00:00Z');
    const code = await createOwnerCode('site-1', 'owner-1', issued);
    const inTime = new Date(issued.getTime() + OWNER_CODE_TTL_MS - 1000);
    expect(await consumeOwnerCode(code, 'site-1', inTime)).toBe('owner-1');
  });

  it('is rejected on another site, and that attempt burns it', async () => {
    const code = await createOwnerCode('site-1', 'owner-1');
    expect(await consumeOwnerCode(code, 'site-2')).toBeNull();
    expect(await consumeOwnerCode(code, 'site-1')).toBeNull();
  });

  it('rejects unknown, empty and oversized codes', async () => {
    expect(await consumeOwnerCode('made-up', 'site-1')).toBeNull();
    expect(await consumeOwnerCode('', 'site-1')).toBeNull();
    expect(await consumeOwnerCode(null, 'site-1')).toBeNull();
    expect(await consumeOwnerCode('x'.repeat(500), 'site-1')).toBeNull();
  });

  it('stores only a hash of a 256-bit random code', async () => {
    const code = await createOwnerCode('site-1', 'owner-1');
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect([...rows.keys()]).toEqual([await hashOwnerCode(code)]);
    expect([...rows.keys()][0]).not.toContain(code);
  });

  it('issues a different code every time', async () => {
    const a = await createOwnerCode('site-1', 'owner-1');
    const b = await createOwnerCode('site-1', 'owner-1');
    expect(a).not.toBe(b);
  });
});
