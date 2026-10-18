/**
 * Invalid YAML frontmatter must not break a page (flowershow-hi1): the page
 * renders its body without the frontmatter block.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { processMarkdown, stripFrontmatter } from './markdown';

describe('stripFrontmatter', () => {
  it('strips valid frontmatter', () => {
    expect(stripFrontmatter('---\ntitle: Hi\n---\n# Body\n')).toBe('# Body\n');
  });

  it('strips invalid frontmatter instead of throwing', () => {
    expect(
      stripFrontmatter('---\ndescription: Publish: fast\n---\n# Body\n'),
    ).toBe('# Body\n');
    expect(stripFrontmatter('---\ntitle: "unclosed\n---\n# Body')).toBe(
      '# Body',
    );
  });

  it('leaves content without frontmatter unchanged', () => {
    expect(stripFrontmatter('# Body\n\n---\n\nmore')).toBe(
      '# Body\n\n---\n\nmore',
    );
  });
});

describe('processMarkdown with invalid frontmatter', () => {
  it('renders the body without the frontmatter block', async () => {
    const element = await processMarkdown(
      '---\ntitle: foo: bar\n---\n\nHello world.',
      {
        filePath: '/index.md',
        files: [],
        siteHostname: 'test.flowershow.site',
      },
    );
    const html = renderToStaticMarkup(element);
    expect(html).toContain('Hello world.');
    expect(html).not.toContain('foo: bar');
  });
});
