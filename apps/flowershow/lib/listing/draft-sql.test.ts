import { describe, expect, it } from 'vitest';
import { notDraftSql } from './draft-sql';

describe('notDraftSql', () => {
  it('is a null-safe, case- and space-insensitive check on metadata.draft', () => {
    expect(notDraftSql().sql).toBe(
      `lower(btrim("metadata"->>'draft', E' \\t\\r\\n')) IS DISTINCT FROM 'true'`,
    );
    expect(notDraftSql().values).toEqual([]);
  });

  it('can target an aliased Blob', () => {
    expect(notDraftSql('b."metadata"').sql).toContain(`b."metadata"->>'draft'`);
  });
});
