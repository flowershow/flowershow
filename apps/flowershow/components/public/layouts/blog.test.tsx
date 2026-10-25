import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BlogLayout } from './blog';

// YAML reads an unfilled Obsidian template placeholder (`date: {{date}}`) as a
// nested map, so the frontmatter value is an object, not text.
const PLACEHOLDER = { '{ date }': null };

const render = (props: Partial<Parameters<typeof BlogLayout>[0]> = {}) =>
  renderToStaticMarkup(
    <BlogLayout title="Hello" {...props}>
      <p>Body</p>
    </BlogLayout>,
  );

describe('BlogLayout date', () => {
  it('renders the page without a date when the date is a template placeholder', () => {
    const html = render({ date: PLACEHOLDER });
    expect(html).toContain('<p>Body</p>');
    expect(html).not.toContain('page-header-date');
  });

  it('shows an unparseable date string as written', () => {
    expect(render({ date: '1964-1982' })).toContain('<span>1964-1982</span>');
  });
});
