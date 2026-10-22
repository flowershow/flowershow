import { describe, expect, it } from 'vitest';
import {
  buildLlmsTxt,
  LLMS_TXT_MAX_PAGES,
  llmsTxtDescription,
} from './llms-txt';

const page = (path: string, metadata: Record<string, unknown> | null = {}) => ({
  path,
  metadata,
});

describe('buildLlmsTxt', () => {
  it('follows the llms.txt format: H1, blockquote, sections of .md links', () => {
    const txt = buildLlmsTxt({
      siteName: 'My Docs',
      siteUrl: 'https://docs.example.com/',
      description: 'Docs for\nthe thing.',
      pages: [
        page('docs/setup.md', { title: 'Setup', description: 'Install it.' }),
        page('README.md', { title: 'Home' }),
        page('docs/README.mdx', { title: 'Docs' }),
        page('about.md', { title: 'About', description: 'Who we are' }),
        page('blog/getting-started/first.md', { title: 'First post' }),
      ],
    });

    expect(txt).toBe(
      [
        '# My Docs',
        '',
        '> Docs for the thing.',
        '',
        'Each link below points to the Markdown source of a page on this site.',
        '',
        '## Pages',
        '',
        '- [Home](https://docs.example.com/README.md)',
        '- [About](https://docs.example.com/about.md): Who we are',
        '',
        '## Blog',
        '',
        '- [First post](https://docs.example.com/blog/getting-started/first.md)',
        '',
        '## Docs',
        '',
        '- [Docs](https://docs.example.com/docs/README.mdx)',
        '- [Setup](https://docs.example.com/docs/setup.md): Install it.',
        '',
      ].join('\n'),
    );
  });

  it('leaves out drafts, unpublished, unprocessed, hidden and non-Markdown files', () => {
    const txt = buildLlmsTxt({
      siteName: 'S',
      siteUrl: 'https://s.test',
      contentHide: ['/private/', '/secret.md'],
      pages: [
        page('kept.md', { title: 'Kept' }),
        page('draft.md', { title: 'Draft', draft: true }),
        page('draft-string.md', { title: 'Draft 2', draft: 'TRUE' }),
        page('unpublished.md', { title: 'Unpublished', publish: false }),
        page('unprocessed.md', null),
        page('private/a.md', { title: 'Private' }),
        page('secret.md', { title: 'Secret' }),
        page('page.html', { title: 'HTML' }),
      ],
    });
    expect(txt).toContain('[Kept]');
    for (const t of [
      'Draft',
      'Unpublished',
      'unprocessed',
      'Private',
      'Secret',
      'HTML',
    ]) {
      expect(txt).not.toContain(t);
    }
  });

  it('escapes link text and encodes paths', () => {
    const txt = buildLlmsTxt({
      siteName: 'S',
      siteUrl: 'https://s.test',
      pages: [page('My Notes/a [b].md', { title: 'A [b] ] c' })],
    });
    expect(txt).toContain(
      '- [A \\[b\\] \\] c](https://s.test/My%20Notes/a%20%5Bb%5D.md)',
    );
    expect(txt).toContain('## My Notes');
  });

  it('falls back to the file name when there is no title', () => {
    const txt = buildLlmsTxt({
      siteName: 'S',
      siteUrl: 'https://s.test',
      pages: [page('notes/some-note.md', { title: { not: 'text' } })],
    });
    expect(txt).toContain('- [some-note](https://s.test/notes/some-note.md)');
  });

  it('caps the number of listed pages', () => {
    const pages = Array.from({ length: LLMS_TXT_MAX_PAGES + 5 }, (_, i) =>
      page(`p/${String(i).padStart(5, '0')}.md`, { title: `P${i}` }),
    );
    const txt = buildLlmsTxt({
      siteName: 'S',
      siteUrl: 'https://s.test',
      pages,
    });
    expect(txt.match(/^- \[/gm)).toHaveLength(LLMS_TXT_MAX_PAGES);
    expect(txt).toContain('https://s.test/sitemap.xml');
  });
});

describe('llmsTxtDescription', () => {
  it('prefers the config description, then the home page description', () => {
    const pages = [page('README.md', { description: 'From home' })];
    expect(llmsTxtDescription('From config', pages)).toBe('From config');
    expect(llmsTxtDescription(undefined, pages)).toBe('From home');
    expect(llmsTxtDescription('', [])).toBe('');
  });
});
