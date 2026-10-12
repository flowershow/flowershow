import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/image', () => ({
  default: ({ fill: _f, priority: _p, ...p }: Record<string, unknown>) => (
    // biome-ignore lint/a11y/useAltText: alt is passed through
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...(p as object)} />
  ),
}));
import { ListingPage } from './listing-page';

const render = (props: Partial<Parameters<typeof ListingPage>[0]> = {}) =>
  renderToStaticMarkup(
    <ListingPage
      title="Blog"
      view="list"
      listing={<section className="list-component" />}
      {...props}
    />,
  );

describe('ListingPage', () => {
  it('puts the intro under the header and the listing after the rule', () => {
    const html = render({ intro: <p>Notes, weekly.</p>, hasIntro: true });
    expect(html).toContain('<div class="listing-page" data-view="list">');
    expect(html).toMatch(
      /<\/header>.*<div class="rendered-mdx" id="mdxpage"><div class="listing-page-intro"><p>Notes, weekly\.<\/p><\/div><div class="listing-page-listing"><section class="list-component">/,
    );
  });
  it('no empty intro wrapper without intro text (the body still renders, e.g. its page scripts)', () => {
    const html = render({
      intro: <template id="page-scripts" />,
      hasIntro: false,
    });
    expect(html).not.toContain('listing-page-intro');
    expect(html).toContain('<template id="page-scripts"></template>');
  });
  it('a feed link with an accessible name, only when there is a feed', () => {
    const html = render({ feedUrl: '/rss.xml' });
    expect(html).toContain('class="page-header-title-row"');
    expect(html).toMatch(
      /<a class="listing-page-feed-link" href="\/rss.xml" type="application\/rss\+xml" title="RSS feed" aria-label="RSS feed">/,
    );
    expect(render()).not.toContain('listing-page-feed-link');
    expect(render()).not.toContain('page-header-title-row');
  });
});
