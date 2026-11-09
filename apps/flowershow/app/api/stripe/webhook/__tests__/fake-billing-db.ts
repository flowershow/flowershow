import { vi } from 'vitest';

// In-memory fake of the Prisma methods the billing webhooks use, so replay and
// out-of-order tests can assert on the resulting state. Methods are vi.fn so a
// test can also check that a replay wrote nothing.

type Row = Record<string, any>;

export type FakeBillingState = {
  accountSubscriptions: Row[];
  subscriptions: Row[];
  sites: Row[];
  users: Row[];
};

const emptyState = (): FakeBillingState => ({
  accountSubscriptions: [],
  subscriptions: [],
  sites: [],
  users: [],
});

const matches = (row: Row, where: Row = {}) =>
  Object.entries(where).every(([key, value]) => row[key] === value);

export function createFakeBillingDb() {
  let state = emptyState();

  const findOne = (rows: Row[], where: Row) =>
    rows.find((row) => matches(row, where));

  const updateOne = (rows: Row[], where: Row, data: Row) => {
    const row = findOne(rows, where);
    if (!row) throw new Error(`Row not found: ${JSON.stringify(where)}`);
    Object.assign(row, data);
    return structuredClone(row);
  };

  const updateAll = (rows: Row[], where: Row, data: Row) => {
    const found = rows.filter((row) => matches(row, where));
    found.forEach((row) => Object.assign(row, data));
    return { count: found.length };
  };

  // Sites come back with the relations the reconciler selects.
  const withRelations = (site: Row) =>
    structuredClone({
      publishes: [],
      ...site,
      subscription:
        state.subscriptions.find((sub) => sub.siteId === site.id) ?? null,
    });

  const clone = <T>(value: T): T | null =>
    value === undefined ? null : structuredClone(value);

  return {
    seed(partial: Partial<FakeBillingState>) {
      state = { ...emptyState(), ...structuredClone(partial) };
    },
    snapshot: (): FakeBillingState => structuredClone(state),

    accountSubscription: {
      findUnique: vi.fn(async ({ where }: any) =>
        clone(findOne(state.accountSubscriptions, where)),
      ),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const row = findOne(state.accountSubscriptions, where);
        if (row) {
          Object.assign(row, update);
          return structuredClone(row);
        }
        state.accountSubscriptions.push(structuredClone(create));
        return structuredClone(create);
      }),
      update: vi.fn(async ({ where, data }: any) =>
        updateOne(state.accountSubscriptions, where, data),
      ),
    },
    subscription: {
      findUnique: vi.fn(async ({ where }: any) =>
        clone(findOne(state.subscriptions, where)),
      ),
      findMany: vi.fn(async ({ where }: any = {}) =>
        structuredClone(
          state.subscriptions.filter((row) => matches(row, where)),
        ),
      ),
      update: vi.fn(async ({ where, data }: any) =>
        updateOne(state.subscriptions, where, data),
      ),
    },
    site: {
      findMany: vi.fn(async ({ where }: any = {}) =>
        state.sites.filter((row) => matches(row, where)).map(withRelations),
      ),
      update: vi.fn(async ({ where, data }: any) =>
        updateOne(state.sites, where, data),
      ),
      updateMany: vi.fn(async ({ where, data }: any) =>
        updateAll(state.sites, where, data),
      ),
    },
    user: {
      findUnique: vi.fn(async ({ where }: any) =>
        clone(findOne(state.users, where)),
      ),
      updateMany: vi.fn(async ({ where, data }: any) =>
        updateAll(state.users, where, data),
      ),
    },
  };
}

export type FakeBillingDb = ReturnType<typeof createFakeBillingDb>;
