import { describe, expect, it } from 'vitest';
import { backfillMetadata } from './backfill-descriptions';

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
