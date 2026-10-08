import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/typesense-client', () => ({ searchClient: {} }));

import { transformSearchHits } from './search-modal';

describe('transformSearchHits', () => {
  it('drops a stale search doc for the reserved root _footer.md', () => {
    const result = transformSearchHits([
      { id: '1', path: '_footer.md' },
      { id: '2', path: 'about.md' },
    ]);
    expect(result.map((h) => h.id)).toEqual(['2']);
  });

  it('keeps a nested notes/_footer.md page and resolves hit paths to URLs', () => {
    const result = transformSearchHits([{ id: '1', path: 'notes/_footer.md' }]);
    expect(result).toHaveLength(1);
    expect(result[0]!.path).not.toMatch(/\.md$/);
  });
});
