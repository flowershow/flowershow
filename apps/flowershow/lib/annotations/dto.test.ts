import { describe, expect, it } from 'vitest';
import { normalizeAnnotationPath, toAnnotationDto } from './dto';

const ROW = {
  id: 'ann-1',
  siteId: 'site-1',
  path: 'notes/draft.md',
  exact: 'brown fox',
  prefix: 'The quick ',
  suffix: ' jumps',
  startOffset: 10,
  endOffset: 19,
  blobSha: 'sha-a',
  status: 'open' as const,
  resolvedAt: null,
  resolvedBy: null,
  note: 'Make it red',
  authorName: null,
  createdAt: new Date('2026-10-03T10:00:00.000Z'),
};
const PAGE = {
  sha: 'sha-a',
  url: 'https://notes-ada.flowershow.me/notes/draft',
};

describe('toAnnotationDto', () => {
  it('maps a row to the API shape', () => {
    expect(toAnnotationDto(ROW, PAGE)).toEqual({
      id: 'ann-1',
      siteId: 'site-1',
      path: 'notes/draft.md',
      pageUrl: 'https://notes-ada.flowershow.me/notes/draft',
      selector: {
        exact: 'brown fox',
        prefix: 'The quick ',
        suffix: ' jumps',
        start: 10,
        end: 19,
      },
      note: 'Make it red',
      authorName: null,
      status: 'open',
      resolvedBy: null,
      replies: [],
      pageEdited: false,
      createdAt: '2026-10-03T10:00:00.000Z',
    });
  });

  it('includes replies, oldest first as given, and resolvedBy', () => {
    const dto = toAnnotationDto(
      {
        ...ROW,
        resolvedBy: 'Maya',
        replies: [
          {
            id: 'r1',
            annotationId: 'ann-1',
            note: 'Done',
            authorName: 'Ada',
            byOwner: true,
            createdAt: new Date('2026-11-07T10:00:00.000Z'),
          },
        ],
      },
      PAGE,
    );
    expect(dto.resolvedBy).toBe('Maya');
    expect(dto.replies).toEqual([
      {
        id: 'r1',
        note: 'Done',
        authorName: 'Ada',
        byOwner: true,
        createdAt: '2026-11-07T10:00:00.000Z',
      },
    ]);
  });

  it('flags pageEdited when the page changed or no longer exists', () => {
    expect(toAnnotationDto(ROW, { ...PAGE, sha: 'sha-b' }).pageEdited).toBe(
      true,
    );
    const gone = toAnnotationDto(ROW, undefined);
    expect(gone.pageEdited).toBe(true);
    expect(gone.pageUrl).toBeNull();
  });
});

describe('normalizeAnnotationPath', () => {
  it('strips leading slashes and keeps spaces', () => {
    expect(normalizeAnnotationPath('/My Notes/draft one.md')).toBe(
      'My Notes/draft one.md',
    );
    expect(normalizeAnnotationPath('notes/draft.md')).toBe('notes/draft.md');
  });
});
