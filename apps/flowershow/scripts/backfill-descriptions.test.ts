import { describe, expect, it } from 'vitest';
import { backfillMetadata, shouldProcess } from './backfill-descriptions';

const BODY = 'This is a paragraph with some words in it.';

describe('backfillMetadata', () => {
  it('fills a missing description and flags it computed', () => {
    const next = backfillMetadata({ title: 'T' }, BODY);
    expect(next).toEqual({
      title: 'T',
      description: 'This is a paragraph with some words in it.',
      computed: ['description'],
    });
  });

  it('returns null when an author description exists', () => {
    expect(backfillMetadata({ description: 'Mine' }, BODY)).toBeNull();
  });

  it('treats a whitespace-only description as missing', () => {
    const next = backfillMetadata({ description: '   ' }, BODY);
    expect(next?.description).toBe(
      'This is a paragraph with some words in it.',
    );
  });

  it('appends to existing computed flags without duplicating', () => {
    expect(backfillMetadata({ computed: ['title'] }, BODY)?.computed).toEqual([
      'title',
      'description',
    ]);
    expect(
      backfillMetadata({ computed: ['description'] }, BODY)?.computed,
    ).toEqual(['description']);
  });

  it('returns null when the body has no prose', () => {
    expect(backfillMetadata({ title: 'T' }, '# Heading only\n')).toBeNull();
  });

  it('returns null for null metadata', () => {
    expect(backfillMetadata(null, BODY)).toBeNull();
  });
});

describe('backfillMetadata with recompute', () => {
  const recompute = { recompute: true };

  it('replaces a computed description with a fresh extraction', () => {
    const next = backfillMetadata(
      {
        title: 'T',
        description: '#book #reading',
        computed: ['title', 'description'],
      },
      `#book #reading\n\n${BODY}`,
      recompute,
    );
    expect(next).toEqual({
      title: 'T',
      description: 'This is a paragraph with some words in it.',
      computed: ['title', 'description'],
    });
  });

  it('removes the description and its flag when extraction now returns null', () => {
    expect(
      backfillMetadata(
        { title: 'T', description: 'junk', computed: ['title', 'description'] },
        '# Heading only\n',
        recompute,
      ),
    ).toEqual({ title: 'T', computed: ['title'] });
    expect(
      backfillMetadata(
        { title: 'T', description: 'junk', computed: ['description'] },
        '# Heading only\n',
        recompute,
      ),
    ).toEqual({ title: 'T' });
  });

  it('returns null when the recomputed description is unchanged', () => {
    expect(
      backfillMetadata(
        { description: BODY, computed: ['description'] },
        BODY,
        recompute,
      ),
    ).toBeNull();
  });

  it('never touches an author-written description', () => {
    expect(
      backfillMetadata({ description: 'Mine' }, BODY, recompute),
    ).toBeNull();
    expect(
      backfillMetadata(
        { description: 'Mine', computed: ['title'] },
        BODY,
        recompute,
      ),
    ).toBeNull();
  });

  it('still fills a missing description', () => {
    expect(backfillMetadata({ title: 'T' }, BODY, recompute)?.description).toBe(
      BODY,
    );
  });

  it('does not recompute computed descriptions without the flag', () => {
    expect(
      backfillMetadata({ description: 'old', computed: ['description'] }, BODY),
    ).toBeNull();
  });
});

describe('shouldProcess', () => {
  it('selects blobs with a missing description', () => {
    expect(shouldProcess({}, false)).toBe(true);
    expect(shouldProcess({ description: ' ' }, false)).toBe(true);
    expect(shouldProcess({ description: 'Mine' }, false)).toBe(false);
    expect(shouldProcess(null, false)).toBe(false);
  });

  it('selects computed descriptions only in recompute mode', () => {
    const computed = { description: 'x', computed: ['description'] };
    expect(shouldProcess(computed, false)).toBe(false);
    expect(shouldProcess(computed, true)).toBe(true);
    expect(
      shouldProcess({ description: 'Mine', computed: ['title'] }, true),
    ).toBe(false);
  });
});
