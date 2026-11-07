import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/fixed-window-limit', () => ({ hitFixedWindow: vi.fn() }));

import { hitFixedWindow } from '@/lib/fixed-window-limit';
import {
  SITE_CREATE_LIMIT_MESSAGE,
  SITE_CREATE_LIMIT_PER_HOUR,
  siteCreateAllowed,
} from './site-create-limit';

const hit = hitFixedWindow as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('siteCreateAllowed', () => {
  it('allows hits 1 to 20 and refuses hit 21', async () => {
    expect(SITE_CREATE_LIMIT_PER_HOUR).toBe(20);
    hit.mockResolvedValue(1);
    expect(await siteCreateAllowed('u1')).toBe(true);
    hit.mockResolvedValue(20);
    expect(await siteCreateAllowed('u1')).toBe(true);
    hit.mockResolvedValue(21);
    expect(await siteCreateAllowed('u1')).toBe(false);
  });

  it('counts per user in a one-hour window', async () => {
    hit.mockResolvedValue(1);
    await siteCreateAllowed('u1');
    expect(hit).toHaveBeenCalledWith('site-create:u1', 3_600_000);
  });

  it('has the agreed message', () => {
    expect(SITE_CREATE_LIMIT_MESSAGE).toBe(
      "You've created 20 sites in the last hour. Try again later, or get in touch if you need more.",
    );
  });
});
