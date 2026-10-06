import { serialize } from 'next-mdx-remote-client/serialize';
import { describe, expect, it } from 'vitest';
import { getMdxOptions } from './markdown';

async function compileMdx(source: string) {
  const result = await serialize({
    source,
    options: getMdxOptions({
      filePath: 'notes/page.mdx',
      files: [],
      siteHostname: 'test.flowershow.site',
    }) as never,
  });
  if ('error' in result) throw result.error;
  return result.compiledSource;
}

describe('rehypeZoomableJsxImages', () => {
  it('routes a block JSX <img> through components.JsxImage', async () => {
    const code = await compileMdx('<img src="/a.png" alt="A" />');

    expect(code).toContain('JsxImage');
    expect(code).not.toMatch(/_jsx\("img"/);
  });

  it('routes an inline JSX <img> through components.JsxImage', async () => {
    const code = await compileMdx('Text <img src="/a.png" alt="A" /> text');

    expect(code).toContain('JsxImage');
    expect(code).not.toMatch(/_jsx\("img"/);
  });

  it('still resolves the src path', async () => {
    const code = await compileMdx('<img src="a.png" alt="A" />');

    expect(code).toContain('JsxImage');
    expect(code).toContain('/notes/a.png');
  });

  it('keeps expression attributes', async () => {
    const code = await compileMdx(
      '<img src="/a.png" alt="A" style={{ width: 200 }} />',
    );

    expect(code).toMatch(/width: 200/);
  });

  it('leaves other JSX elements alone', async () => {
    const code = await compileMdx('<video src="/a.mp4" />');

    expect(code).toMatch(/_jsx\("video"/);
    expect(code).not.toContain('JsxImage');
  });
});
