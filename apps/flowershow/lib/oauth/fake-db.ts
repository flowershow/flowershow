/**
 * In-memory stand-in for the Prisma models used by lib/oauth, for unit tests
 * only. Supports exactly the query shapes lib/oauth uses (equality, `null`,
 * `{ lt }`/`{ gt }` on dates, `{ in }`, `grants: { none: {} }` on clients,
 * `take`); `select`/`include` return the full row plus the `grant`,
 * `grant.client` and `client` relations.
 */

type Row = Record<string, any>;

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    const actual = row[k];
    if (v === null) return actual === null || actual === undefined;
    if (v instanceof Date) return actual?.getTime() === v.getTime();
    if (v && typeof v === 'object') {
      if ('lt' in v) return actual instanceof Date && actual < v.lt;
      if ('gt' in v) return actual instanceof Date && actual > v.gt;
      if ('in' in v) return v.in.includes(actual);
    }
    return actual === v;
  });
}

let seq = 0;

export function createFakeDb() {
  const tables = {
    oAuthClient: new Map<string, Row>(),
    oAuthGrant: new Map<string, Row>(),
    oAuthAuthorizationCode: new Map<string, Row>(),
    oAuthToken: new Map<string, Row>(),
    oAuthPendingRequest: new Map<string, Row>(),
    oAuthRateLimit: new Map<string, Row>(),
  };
  const keys: Record<keyof typeof tables, string> = {
    oAuthClient: 'id',
    oAuthGrant: 'id',
    oAuthAuthorizationCode: 'codeHash',
    oAuthToken: 'tokenHash',
    oAuthPendingRequest: 'id',
    oAuthRateLimit: 'key',
  };

  const withRelations = (name: keyof typeof tables, row: Row | undefined) => {
    if (!row) return null;
    const out: Row = { ...row };
    if (name === 'oAuthGrant') {
      out.client = tables.oAuthClient.get(row.clientId);
    }
    if (name === 'oAuthAuthorizationCode' || name === 'oAuthToken') {
      const grant = tables.oAuthGrant.get(row.grantId);
      out.grant = grant
        ? { ...grant, client: tables.oAuthClient.get(grant.clientId) }
        : null;
    }
    if (name === 'oAuthPendingRequest') {
      out.client = tables.oAuthClient.get(row.clientId);
    }
    return out;
  };

  const find = (name: keyof typeof tables, where: Row) => {
    const { grants, ...rest } = where;
    return [...tables[name].values()].filter((r) => {
      if (!matches(r, rest)) return false;
      if (name === 'oAuthClient' && grants && 'none' in grants) {
        return ![...tables.oAuthGrant.values()].some(
          (g) => g.clientId === r.id,
        );
      }
      return true;
    });
  };

  const model = (name: keyof typeof tables) => ({
    async create({ data }: { data: Row }) {
      const row: Row = { ...data };
      if (
        name === 'oAuthClient' ||
        name === 'oAuthGrant' ||
        name === 'oAuthPendingRequest'
      ) {
        row.id ??= `${name}-${++seq}`;
        row.createdAt ??= new Date();
      }
      if (name === 'oAuthGrant') {
        row.lastUsedAt ??= null;
        row.revokedAt ??= null;
      }
      if (name === 'oAuthAuthorizationCode' || name === 'oAuthToken') {
        row.usedAt ??= null;
        row.createdAt ??= new Date();
      }
      if (name === 'oAuthClient') row.metadataFetchedAt ??= null;
      const key = row[keys[name]];
      if (tables[name].has(key))
        throw Object.assign(new Error('Unique'), { code: 'P2002' });
      tables[name].set(key, row);
      return withRelations(name, row);
    },
    async findUnique({ where }: { where: Row }) {
      return withRelations(name, find(name, where)[0]);
    },
    async findFirst({ where }: { where?: Row } = {}) {
      return withRelations(name, find(name, where ?? {})[0]);
    },
    async findMany({ where, take }: { where?: Row; take?: number } = {}) {
      return find(name, where ?? {})
        .slice(0, take)
        .map((r) => withRelations(name, r));
    },
    async update({ where, data }: { where: Row; data: Row }) {
      const row = find(name, where)[0];
      if (!row) throw Object.assign(new Error('Not found'), { code: 'P2025' });
      Object.assign(row, data);
      return withRelations(name, row);
    },
    async updateMany({ where, data }: { where: Row; data: Row }) {
      const rows = find(name, where);
      for (const r of rows) Object.assign(r, data);
      return { count: rows.length };
    },
    async delete({ where }: { where: Row }) {
      const row = find(name, where)[0];
      if (!row) throw Object.assign(new Error('Not found'), { code: 'P2025' });
      tables[name].delete(row[keys[name]]);
      return withRelations(name, row);
    },
    async deleteMany({ where }: { where?: Row } = {}) {
      const rows = find(name, where ?? {});
      for (const r of rows) tables[name].delete(r[keys[name]]);
      return { count: rows.length };
    },
    async upsert({
      where,
      create,
      update,
    }: {
      where: Row;
      create: Row;
      update: Row;
    }) {
      const row = find(name, where)[0];
      if (!row) return this.create({ data: create });
      for (const [k, v] of Object.entries(update)) {
        if (v && typeof v === 'object' && 'increment' in v)
          row[k] += v.increment;
        else row[k] = v;
      }
      return withRelations(name, row);
    },
    async count({ where }: { where?: Row } = {}) {
      return find(name, where ?? {}).length;
    },
  });

  const db = {
    tables,
    oAuthClient: model('oAuthClient'),
    oAuthGrant: model('oAuthGrant'),
    oAuthAuthorizationCode: model('oAuthAuthorizationCode'),
    oAuthToken: model('oAuthToken'),
    oAuthPendingRequest: model('oAuthPendingRequest'),
    oAuthRateLimit: model('oAuthRateLimit'),
    async $transaction(
      ops: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
    ) {
      if (typeof ops === 'function') return ops(db);
      return Promise.all(ops);
    },
    reset() {
      for (const t of Object.values(tables)) t.clear();
    },
  };
  return db;
}

export type FakeDb = ReturnType<typeof createFakeDb>;

/** Shared instance for `vi.mock('@/server/db', ...)` factories. */
export const fakeDb = createFakeDb();
