import { describe, expect, it } from 'vitest';
import { derivedAssetR2Key, isDerivedRequestPath } from './derived-asset';

describe('derived asset requests (/_derived/...)', () => {
  it('recognises the reserved _derived prefix', () => {
    expect(isDerivedRequestPath(['_derived', 'r.docx', 'abc', 'i.png'])).toBe(
      true,
    );
    expect(isDerivedRequestPath(['derived', 'x.png'])).toBe(false);
    expect(isDerivedRequestPath(['notes', '_derived', 'x.png'])).toBe(false);
  });

  it('maps the request path to the derived key under the site prefix', () => {
    expect(
      derivedAssetR2Key('site1', [
        '_derived',
        'My Notes',
        'r.docx',
        'abc',
        'image1.png',
      ]),
    ).toBe('site1/main/derived/My Notes/r.docx/abc/image1.png');
  });

  it('rejects traversal and empty segments', () => {
    expect(
      derivedAssetR2Key('site1', ['_derived', '..', 'other', 'x.png']),
    ).toBeNull();
    expect(
      derivedAssetR2Key('site1', ['_derived', 'a', '..', '..', 'x.png']),
    ).toBeNull();
    // A decoded `%2F` inside one segment must not smuggle `..` through.
    expect(
      derivedAssetR2Key('site1', ['_derived', '../../site2', 'x.png']),
    ).toBeNull();
    expect(derivedAssetR2Key('site1', ['_derived', '', 'x.png'])).toBeNull();
    expect(derivedAssetR2Key('site1', ['_derived'])).toBeNull();
    expect(derivedAssetR2Key('site1', ['raw', 'x.png'])).toBeNull();
  });
});
