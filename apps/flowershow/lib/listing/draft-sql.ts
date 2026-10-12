import { Prisma } from '@prisma/client';

/**
 * SQL twin of `isDraft` for raw queries on "Blob": true when the row is not a
 * draft (`draft: true`, or the string "true" in any case). Null-safe, so rows
 * without `draft` (or without metadata) pass. `column` is trusted code, never
 * user input.
 */
export function notDraftSql(
  column: '"metadata"' | 'b."metadata"' = '"metadata"',
): Prisma.Sql {
  return Prisma.sql`lower(btrim(${Prisma.raw(column)}->>'draft', E' \\t\\r\\n')) IS DISTINCT FROM 'true'`;
}

/** Ids of a site's draft pages (few, usually none), for filtering rows that do not carry metadata. */
export async function draftBlobIds(
  db: {
    $queryRaw: (q: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
  },
  siteId: string,
): Promise<Set<string>> {
  const rows = (await db.$queryRaw`
    SELECT "id" FROM "Blob"
    WHERE "site_id" = ${siteId} AND NOT (${notDraftSql()})
  `) as { id: string }[];
  return new Set(rows.map((r) => r.id));
}
