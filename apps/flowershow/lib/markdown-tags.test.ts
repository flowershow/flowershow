/**
 * The `showTags` gate through the real page pipelines. Inline `#tag` prose
 * compiles to a pill link by default; passing `showTags: false` (the site's
 * config) must leave it as plain text in both the MD renderer
 * (`processMarkdown`, rendered to static HTML) and the MDX renderer
 * (`getMdxOptions` + `serialize`, checked on the compiled source).
 */
import { serialize } from 'next-mdx-remote-client/serialize';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getMdxOptions, processMarkdown } from './markdown';

const base = {
  filePath: 'note.md',
  files: [],
  siteHostname: 'test.flowershow.site',
};

const MD = 'I love #book here';

async function renderMd(showTags?: boolean) {
  return renderToStaticMarkup(await processMarkdown(MD, { ...base, showTags }));
}

async function compileMdx(showTags?: boolean) {
  const result = await serialize({
    source: MD,
    options: getMdxOptions({ ...base, showTags }) as never,
  });
  if ('error' in result) throw result.error;
  return result.compiledSource;
}

describe('showTags gate — MD renderer (processMarkdown)', () => {
  it('renders an inline #tag as a pill link by default', async () => {
    const html = await renderMd();
    expect(html).toContain('tag-pill');
    expect(html).toContain('/tags/book');
  });

  it('leaves #tags as plain text when showTags is false', async () => {
    const html = await renderMd(false);
    expect(html).not.toContain('tag-pill');
    expect(html).not.toContain('/tags/book');
    expect(html).toContain('#book');
  });
});

describe('showTags gate — MDX renderer (getMdxOptions)', () => {
  it('compiles an inline #tag into a pill link by default', async () => {
    const compiled = await compileMdx();
    expect(compiled).toContain('tag-pill');
    expect(compiled).toContain('/tags/book');
  });

  it('leaves #tags as plain text when showTags is false', async () => {
    const compiled = await compileMdx(false);
    expect(compiled).not.toContain('tag-pill');
    expect(compiled).not.toContain('/tags/book');
  });
});
