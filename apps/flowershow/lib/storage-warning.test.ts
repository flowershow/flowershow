import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  site: { updateMany: vi.fn() },
  user: { updateMany: vi.fn(), findUnique: vi.fn() },
}));
vi.mock('@/server/db', () => ({ default: db }));

const send = vi.hoisted(() => vi.fn());
vi.mock('@/lib/transactional-email', () => ({
  sendTransactionalEmail: send,
}));

vi.mock('@/env.mjs', () => ({
  env: { NEXT_PUBLIC_CLOUD_DOMAIN: 'cloud.example.com' },
}));

import { GB, MB } from './entitlements';
import {
  STORAGE_EMAILS_LIVE,
  STORAGE_WARNING_INTERVAL_MS,
  sendStorageWarning,
} from './storage-warning';

const site = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  userId: 'u1',
  plan: 'FREE' as const,
  projectName: 'notes',
  storageAllowanceBytes: null,
  ...over,
});
const siteViolation = {
  scope: 'site' as const,
  limitBytes: 200 * MB,
  projectedBytes: 250 * MB,
};
const poolViolation = {
  scope: 'pool' as const,
  limitBytes: GB,
  projectedBytes: 1.5 * GB,
};

describe('sendStorageWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.site.updateMany.mockResolvedValue({ count: 1 });
    db.user.updateMany.mockResolvedValue({ count: 1 });
    db.user.findUnique.mockResolvedValue({
      email: 'ada@example.com',
      name: 'Ada',
    });
    send.mockResolvedValue({ sent: true });
  });

  it('ships switched off', () => {
    expect(STORAGE_EMAILS_LIVE).toBe(false);
    expect(STORAGE_WARNING_INTERVAL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('does nothing when not live (default)', async () => {
    await sendStorageWarning({ site: site(), violation: siteViolation });
    expect(db.site.updateMany).not.toHaveBeenCalled();
    expect(db.user.updateMany).not.toHaveBeenCalled();
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends once for a site over its limit when live', async () => {
    await sendStorageWarning({
      site: site(),
      violation: siteViolation,
      live: true,
    });
    expect(db.site.updateMany).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    const params = send.mock.calls[0]![0];
    expect(params.to).toBe('ada@example.com');
    expect(params.type).toBe('storage_over_limit');
    expect(params.userId).toBe('u1');
    expect(params.subject).toBe('notes has grown past the Free plan');
    expect(params.idempotencyKey).toMatch(
      /^storage-over-limit:site:s1:\d{4}-\d{2}-\d{2}$/,
    );
    expect(params.react.props.upgradeUrl).toBe(
      'https://cloud.example.com/site/s1/settings#billing',
    );
    expect(params.react.props.isPremium).toBe(false);
  });

  it('claims with a where clause covering null and older than 30 days', async () => {
    const before = Date.now();
    await sendStorageWarning({
      site: site(),
      violation: siteViolation,
      live: true,
    });
    const arg = db.site.updateMany.mock.calls[0]![0];
    expect(arg.where.id).toBe('s1');
    const [a, b] = arg.where.OR;
    expect(a).toEqual({ storageWarningSentAt: null });
    const cutoff: Date = b.storageWarningSentAt.lt;
    expect(
      Math.abs(before - STORAGE_WARNING_INTERVAL_MS - cutoff.getTime()),
    ).toBeLessThan(5000);
    expect(arg.data.storageWarningSentAt).toBeInstanceOf(Date);
  });

  it('does not send when the claim matches no rows', async () => {
    db.site.updateMany.mockResolvedValue({ count: 0 });
    await sendStorageWarning({
      site: site(),
      violation: siteViolation,
      live: true,
    });
    expect(send).not.toHaveBeenCalled();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('claims on User for pool scope', async () => {
    await sendStorageWarning({
      site: site(),
      violation: poolViolation,
      live: true,
    });
    expect(db.site.updateMany).not.toHaveBeenCalled();
    const arg = db.user.updateMany.mock.calls[0]![0];
    expect(arg.where.id).toBe('u1');
    expect(arg.where.OR[0]).toEqual({ storagePoolWarningSentAt: null });
    expect(arg.data.storagePoolWarningSentAt).toBeInstanceOf(Date);
    const params = send.mock.calls[0]![0];
    expect(params.subject).toBe(
      'Your Flowershow sites have grown past the Free plan',
    );
    expect(params.react.props.upgradeUrl).toBe('https://cloud.example.com');
    expect(params.idempotencyKey).toMatch(/^storage-over-limit:pool:u1:/);
  });

  it('marks grandfathered sites for site scope only', async () => {
    const g = site({ storageAllowanceBytes: BigInt(500 * MB) });
    await sendStorageWarning({ site: g, violation: siteViolation, live: true });
    expect(send.mock.calls[0]![0].react.props.grandfathered).toBe(true);
    await sendStorageWarning({ site: g, violation: poolViolation, live: true });
    expect(send.mock.calls[1]![0].react.props.grandfathered).toBe(false);
  });

  it('gives Premium no button URL', async () => {
    await sendStorageWarning({
      site: site({ plan: 'PREMIUM' }),
      violation: { ...siteViolation, limitBytes: 10 * GB },
      live: true,
    });
    const params = send.mock.calls[0]![0];
    expect(params.react.props.isPremium).toBe(true);
    expect(params.react.props.upgradeUrl).toBeUndefined();
  });

  it('does not send when the owner has no email', async () => {
    db.user.findUnique.mockResolvedValue({ email: null, name: null });
    await sendStorageWarning({
      site: site(),
      violation: siteViolation,
      live: true,
    });
    expect(send).not.toHaveBeenCalled();
  });
});
