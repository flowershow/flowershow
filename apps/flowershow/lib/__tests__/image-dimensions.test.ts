import { describe, expect, it } from 'vitest';
import { buildImageDimensionsMap } from '../image-dimensions';

describe('buildImageDimensionsMap', () => {
  it('builds a lookup map from blob records keyed by resolved URL path', () => {
    const blobs = [
      { path: 'assets/photo.png', width: 800, height: 600 },
      { path: 'images/banner.jpg', width: 1200, height: 400 },
      { path: 'docs/readme.md', width: null, height: null },
    ];

    const result = buildImageDimensionsMap(blobs, '/@user/project');

    expect(result).toEqual({
      '/@user/project/assets/photo.png': { width: 800, height: 600 },
      '/@user/project/images/banner.jpg': { width: 1200, height: 400 },
    });
  });

  it('returns empty map when no blobs have dimensions', () => {
    const blobs = [{ path: 'docs/readme.md', width: null, height: null }];

    const result = buildImageDimensionsMap(blobs, '/@user/project');

    expect(result).toEqual({});
  });

  it('returns empty map for empty input', () => {
    expect(buildImageDimensionsMap([], '/@user/project')).toEqual({});
  });
});
