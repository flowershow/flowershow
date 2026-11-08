import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock('@/server/auth', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/server/db', () => ({ db: {} }));
vi.mock('@/lib/stripe', () => ({ stripe: {} }));
vi.mock('@/lib/typesense', () => ({ deleteSiteCollection: vi.fn() }));
vi.mock('@/lib/server-posthog', () => {
  const client = {
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  return { default: () => client, __esModule: true };
});
vi.mock('@/lib/domains', () => ({
  addDomainToVercel: vi.fn(),
  removeDomainAndVariantFromVercelProject: vi.fn(),
  validDomainRegex: /./,
}));
vi.mock('@/lib/github', () => ({
  fetchGitHubScopes: vi.fn(),
  fetchGitHubScopeRepositories: vi.fn(),
}));
vi.mock('@/lib/transactional-email', () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

import { render } from '@react-email/components';
import { appRouter } from '@/server/api/root';
import { sendTransactionalEmail } from '@/lib/transactional-email';
import PostHogClient from '@/lib/server-posthog';
import { INVITE_TTL_MS } from '@/lib/site-invites';
import SiteInviteEmail from '@/emails/site-invite';

type Site = {
  id: string;
  userId: string;
  plan: 'FREE' | 'PREMIUM';
  projectName: string;
  user: { email: string; name: string; username: string };
};

const premium: Site = {
  id: 'site-1',
  userId: 'owner-1',
  plan: 'PREMIUM',
  projectName: 'notes',
  user: { email: 'Owner@Example.com', name: 'Olu', username: 'olu' },
};

function makeDb({
  site,
  members = [],
  invites = [],
  users = [],
}: {
  site: Site | null;
  members?: any[];
  invites?: any[];
  users?: any[];
}) {
  const db: any = {
    site: {
      // Mirrors siteAuthzSelect: members filtered to the caller.
      findUnique: vi.fn(async ({ select }: any) => {
        if (!site) return null;
        const callerFilter = select?.members?.where?.userId;
        return {
          ...site,
          members: members
            .filter((m) => m.userId === callerFilter)
            .map((m) => ({ userId: m.userId })),
        };
      }),
    },
    siteMember: {
      findMany: vi.fn(async () =>
        members.map((m) => ({
          userId: m.userId,
          createdAt: new Date('2026-01-01'),
          user: {
            username: m.username ?? m.userId,
            name: m.name ?? null,
            email: m.email ?? `${m.userId}@example.com`,
          },
        })),
      ),
      count: vi.fn(async () => members.length),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    siteInvite: {
      findMany: vi.fn(async () => invites),
      count: vi.fn(async () => invites.length),
      create: vi.fn(async ({ data }: any) => ({
        id: 'inv-1',
        email: data.email,
        expiresAt: data.expiresAt,
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findFirst: vi.fn(
        async ({ where }: any) =>
          invites.find((i) => i.email === where.email) ?? null,
      ),
    },
    user: {
      findFirst: vi.fn(
        async ({ where }: any) =>
          users.find(
            (u) => u.email.toLowerCase() === where.email.equals.toLowerCase(),
          ) ?? null,
      ),
    },
    $transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

function createCallerAs(db: unknown, id: string) {
  return appRouter.createCaller({
    session: { user: { id }, expires: '' } as any,
    db: db as any,
    headers: new Headers(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('siteMember.invite', () => {
  it("normalises the email and refuses the owner's address in any case", async () => {
    const db = makeDb({ site: premium });
    await createCallerAs(db, 'owner-1').siteMember.invite({
      siteId: 'site-1',
      email: '  Ada@Example.COM ',
    });
    expect(db.siteInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'ada@example.com',
          tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      }),
    );
    await expect(
      createCallerAs(db, 'owner-1').siteMember.invite({
        siteId: 'site-1',
        email: 'OWNER@example.com',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('stores only the hash, sets a 14-day expiry and emails the raw link', async () => {
    const db = makeDb({ site: premium });
    const before = Date.now();
    const res = await createCallerAs(db, 'owner-1').siteMember.invite({
      siteId: 'site-1',
      email: 'ada@example.com',
    });
    expect(
      Math.abs(res.expiresAt.getTime() - (before + INVITE_TTL_MS)),
    ).toBeLessThan(1000);
    const data = db.siteInvite.create.mock.calls[0][0].data;
    expect(Object.keys(data)).not.toContain('token');
    expect(JSON.stringify(data)).not.toContain('fs_inv_');

    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    const arg = (sendTransactionalEmail as any).mock.calls[0][0];
    expect(arg.to).toBe('ada@example.com');
    expect(arg.type).toBe('site_invite');
    expect(arg.subject).toBe('Olu invited you to edit notes on Flowershow');
    expect(arg.idempotencyKey).toBe('site-invite:inv-1');
    expect(await render(arg.react)).toContain('/invite/fs_inv_');
  });

  it('editor cannot invite', async () => {
    const db = makeDb({ site: premium, members: [{ userId: 'editor-1' }] });
    await expect(
      createCallerAs(db, 'editor-1').siteMember.invite({
        siteId: 'site-1',
        email: 'ada@example.com',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(db.siteInvite.create).not.toHaveBeenCalled();
  });

  it('requires Premium', async () => {
    const db = makeDb({ site: { ...premium, plan: 'FREE' } });
    await expect(
      createCallerAs(db, 'owner-1').siteMember.invite({
        siteId: 'site-1',
        email: 'ada@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Inviting editors requires a Premium plan',
    });
    expect(db.siteInvite.create).not.toHaveBeenCalled();
  });

  it('refuses an address that is already a member or already invited', async () => {
    const withMember = makeDb({
      site: premium,
      users: [{ email: 'ada@example.com' }],
    });
    await expect(
      createCallerAs(withMember, 'owner-1').siteMember.invite({
        siteId: 'site-1',
        email: 'ada@example.com',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const withInvite = makeDb({
      site: premium,
      invites: [{ id: 'i', email: 'ada@example.com' }],
    });
    await expect(
      createCallerAs(withInvite, 'owner-1').siteMember.invite({
        siteId: 'site-1',
        email: 'ADA@example.com',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(withInvite.siteInvite.create).not.toHaveBeenCalled();
  });

  it('refuses a 21st member and a 21st pending invite', async () => {
    const members = Array.from({ length: 20 }, (_, i) => ({ userId: `m${i}` }));
    const full = makeDb({ site: premium, members });
    await expect(
      createCallerAs(full, 'owner-1').siteMember.invite({
        siteId: 'site-1',
        email: 'ada@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'This site already has 20 editors',
    });

    const invites = Array.from({ length: 20 }, (_, i) => ({
      id: `i${i}`,
      email: `p${i}@example.com`,
    }));
    const manyInvites = makeDb({ site: premium, invites });
    await expect(
      createCallerAs(manyInvites, 'owner-1').siteMember.invite({
        siteId: 'site-1',
        email: 'ada@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'This site already has 20 pending invites',
    });
  });

  it('deletes expired invites before counting and checking duplicates', async () => {
    const db = makeDb({ site: premium });
    await createCallerAs(db, 'owner-1').siteMember.invite({
      siteId: 'site-1',
      email: 'ada@example.com',
    });
    expect(db.siteInvite.deleteMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1', expiresAt: { lt: expect.any(Date) } },
    });
    const sweepOrder = db.siteInvite.deleteMany.mock.invocationCallOrder[0];
    expect(sweepOrder).toBeLessThan(
      db.siteInvite.count.mock.invocationCallOrder[0],
    );
    expect(sweepOrder).toBeLessThan(
      db.siteInvite.findFirst.mock.invocationCallOrder[0],
    );
  });
});

describe('siteMember.revokeInvite / remove / leave', () => {
  it('owner can revoke and remove on a FREE site, scoped by siteId', async () => {
    const db = makeDb({
      site: { ...premium, plan: 'FREE' },
      members: [{ userId: 'editor-1' }],
    });
    const caller = createCallerAs(db, 'owner-1');
    await expect(
      caller.siteMember.revokeInvite({ siteId: 'site-1', inviteId: 'inv-9' }),
    ).resolves.toEqual({ ok: true });
    expect(db.siteInvite.deleteMany).toHaveBeenCalledWith({
      where: { id: 'inv-9', siteId: 'site-1' },
    });
    await expect(
      caller.siteMember.remove({ siteId: 'site-1', userId: 'editor-1' }),
    ).resolves.toEqual({ ok: true });
    expect(db.siteMember.deleteMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1', userId: 'editor-1' },
    });
    const posthog = (PostHogClient as any)();
    expect(posthog.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'owner-1',
        event: 'site_members_changed',
        properties: expect.objectContaining({
          siteId: 'site-1',
          change: 'removed',
        }),
      }),
    );
  });

  it('editor cannot remove or revoke', async () => {
    const db = makeDb({ site: premium, members: [{ userId: 'editor-1' }] });
    const caller = createCallerAs(db, 'editor-1');
    await expect(
      caller.siteMember.remove({ siteId: 'site-1', userId: 'editor-1' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      caller.siteMember.revokeInvite({ siteId: 'site-1', inviteId: 'inv-1' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(db.siteMember.deleteMany).not.toHaveBeenCalled();
    expect(db.siteInvite.deleteMany).not.toHaveBeenCalled();
  });

  it('a stranger cannot remove or revoke', async () => {
    const db = makeDb({ site: premium, members: [{ userId: 'editor-1' }] });
    await expect(
      createCallerAs(db, 'stranger').siteMember.remove({
        siteId: 'site-1',
        userId: 'editor-1',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(db.siteMember.deleteMany).not.toHaveBeenCalled();
  });

  it('editor can leave, even on a FREE site', async () => {
    const db = makeDb({
      site: { ...premium, plan: 'FREE' },
      members: [{ userId: 'editor-1' }],
    });
    await expect(
      createCallerAs(db, 'editor-1').siteMember.leave({ siteId: 'site-1' }),
    ).resolves.toEqual({ ok: true });
    expect(db.siteMember.deleteMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1', userId: 'editor-1' },
    });
  });

  it('a non-member (and the owner) cannot leave', async () => {
    const db = makeDb({ site: premium, members: [{ userId: 'editor-1' }] });
    await expect(
      createCallerAs(db, 'stranger').siteMember.leave({ siteId: 'site-1' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      createCallerAs(db, 'owner-1').siteMember.leave({ siteId: 'site-1' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(db.siteMember.deleteMany).not.toHaveBeenCalled();
  });
});

describe('siteMember.list', () => {
  it('hides emails and invites from editors; shows both to the owner', async () => {
    const db = makeDb({
      site: premium,
      members: [{ userId: 'editor-1', username: 'ed' }],
      invites: [
        {
          id: 'i1',
          email: 'p@example.com',
          expiresAt: new Date(),
          createdAt: new Date(),
        },
      ],
    });
    const asEditor = await createCallerAs(db, 'editor-1').siteMember.list({
      siteId: 'site-1',
    });
    expect(asEditor.role).toBe('editor');
    expect(asEditor.owner).toEqual({ username: 'olu' });
    expect(asEditor.members[0]).not.toHaveProperty('email');
    expect(asEditor).not.toHaveProperty('invites');

    const asOwner: any = await createCallerAs(db, 'owner-1').siteMember.list({
      siteId: 'site-1',
    });
    expect(asOwner.role).toBe('owner');
    expect(asOwner.members[0].email).toBe('editor-1@example.com');
    expect(asOwner.invites).toHaveLength(1);
  });

  it('refuses a removed editor, a lapsed editor and a missing site', async () => {
    const removed = makeDb({ site: premium, members: [] });
    await expect(
      createCallerAs(removed, 'editor-1').siteMember.list({ siteId: 'site-1' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const lapsed = makeDb({
      site: { ...premium, plan: 'FREE' },
      members: [{ userId: 'editor-1' }],
    });
    await expect(
      createCallerAs(lapsed, 'editor-1').siteMember.list({ siteId: 'site-1' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const missing = makeDb({ site: null });
    await expect(
      createCallerAs(missing, 'owner-1').siteMember.list({ siteId: 'x' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('SiteInviteEmail', () => {
  it('renders inviter, site name, accept url and the 14-day expiry', async () => {
    const html = await render(
      SiteInviteEmail({
        inviterName: 'Olu',
        projectName: 'notes',
        acceptUrl: 'https://cloud.example.com/invite/fs_inv_abc',
      }),
    );
    expect(html).toContain('Olu');
    expect(html).toContain('notes');
    expect(html).toContain('https://cloud.example.com/invite/fs_inv_abc');
    expect(html).toContain('Accept invite');
    expect(html).toContain('14 days');
  });
});
