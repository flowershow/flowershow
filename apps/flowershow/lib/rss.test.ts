import { describe, expect, it } from 'vitest';
import {
  buildRssFeed,
  buildRssItem,
  escapeXml,
  filterRssBlobs,
  type RssBlob,
} from './rss';

describe('escapeXml', () => {
  it('escapes ampersands, angle brackets, and quotes', () => {
    expect(escapeXml('Tom & Jerry <"friends">')).toBe(
      'Tom &amp; Jerry &lt;&quot;friends&quot;&gt;',
    );
  });

  it('escapes apostrophes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s');
  });

  it('returns plain text unchanged', () => {
    expect(escapeXml('hello world')).toBe('hello world');
  });
});

describe('filterRssBlobs', () => {
  const makeBlob = (
    overrides: Partial<RssBlob> & { metadata?: Record<string, unknown> | null },
  ): RssBlob => ({
    appPath: '/test',
    updatedAt: new Date('2025-01-01'),
    permalink: null,
    metadata: { title: 'Test', date: '2025-01-01' },
    ...overrides,
  });

  it('includes blobs with a date field', () => {
    const blobs = [makeBlob({ metadata: { title: 'A', date: '2025-06-01' } })];
    expect(filterRssBlobs(blobs)).toHaveLength(1);
  });

  it('excludes blobs without a date field', () => {
    const blobs = [makeBlob({ metadata: { title: 'No date' } })];
    expect(filterRssBlobs(blobs)).toHaveLength(0);
  });

  it('excludes blobs with publish: false', () => {
    const blobs = [
      makeBlob({
        metadata: { title: 'Draft', date: '2025-06-01', publish: false },
      }),
    ];
    expect(filterRssBlobs(blobs)).toHaveLength(0);
  });

  it('includes blobs with publish: true', () => {
    const blobs = [
      makeBlob({
        metadata: { title: 'Published', date: '2025-06-01', publish: true },
      }),
    ];
    expect(filterRssBlobs(blobs)).toHaveLength(1);
  });

  it('excludes blobs with null metadata', () => {
    const blobs = [makeBlob({ metadata: null })];
    expect(filterRssBlobs(blobs)).toHaveLength(0);
  });
});

describe('buildRssItem', () => {
  it('generates an item with title, link, guid, and pubDate from frontmatter date', () => {
    const blob: RssBlob = {
      appPath: '/blog/hello',
      updatedAt: new Date('2025-01-01'),
      permalink: null,
      metadata: { title: 'Hello World', date: '2025-06-15' },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).toContain('<title>Hello World</title>');
    expect(item).toContain('<link>https://example.com/blog/hello</link>');
    expect(item).toContain('<guid>https://example.com/blog/hello</guid>');
    expect(item).toContain(
      `<pubDate>${new Date('2025-06-15').toUTCString()}</pubDate>`,
    );
  });

  it('uses permalink over appPath when available', () => {
    const blob: RssBlob = {
      appPath: '/blog/hello',
      updatedAt: new Date('2025-01-01'),
      permalink: '/custom-slug',
      metadata: { title: 'Test', date: '2025-01-01' },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).toContain('<link>https://example.com/custom-slug</link>');
  });

  it('strips leading slash from permalink', () => {
    const blob: RssBlob = {
      appPath: null,
      updatedAt: new Date('2025-01-01'),
      permalink: '/my-page',
      metadata: { title: 'Test', date: '2025-01-01' },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).toContain('<link>https://example.com/my-page</link>');
    expect(item).not.toContain('//my-page');
  });

  it('includes description when present', () => {
    const blob: RssBlob = {
      appPath: '/post',
      updatedAt: new Date('2025-01-01'),
      permalink: null,
      metadata: {
        title: 'Post',
        date: '2025-01-01',
        description: 'A great post',
      },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).toContain('<description>A great post</description>');
  });

  it('omits description tag when not present', () => {
    const blob: RssBlob = {
      appPath: '/post',
      updatedAt: new Date('2025-01-01'),
      permalink: null,
      metadata: { title: 'Post', date: '2025-01-01' },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).not.toContain('<description>');
  });

  it('includes author when authors array is present', () => {
    const blob: RssBlob = {
      appPath: '/post',
      updatedAt: new Date('2025-01-01'),
      permalink: null,
      metadata: {
        title: 'Post',
        date: '2025-01-01',
        authors: ['Alice', 'Bob'],
      },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).toContain('<author>Alice, Bob</author>');
  });

  it('omits author tag when authors is empty', () => {
    const blob: RssBlob = {
      appPath: '/post',
      updatedAt: new Date('2025-01-01'),
      permalink: null,
      metadata: { title: 'Post', date: '2025-01-01', authors: [] },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).not.toContain('<author>');
  });

  it('escapes special XML characters in title and description', () => {
    const blob: RssBlob = {
      appPath: '/post',
      updatedAt: new Date('2025-01-01'),
      permalink: null,
      metadata: {
        title: 'Tom & Jerry <fun>',
        date: '2025-01-01',
        description: 'A "great" post',
      },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).toContain('<title>Tom &amp; Jerry &lt;fun&gt;</title>');
    expect(item).toContain(
      '<description>A &quot;great&quot; post</description>',
    );
  });

  it('falls back to permalink as title when title is missing', () => {
    const blob: RssBlob = {
      appPath: '/blog/fallback-title',
      updatedAt: new Date('2025-01-01'),
      permalink: null,
      metadata: { date: '2025-01-01' },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).toContain('<title>blog/fallback-title</title>');
  });

  it('falls back to updatedAt when date is missing', () => {
    const updatedAt = new Date('2025-03-20T12:00:00Z');
    const blob: RssBlob = {
      appPath: '/post',
      updatedAt,
      permalink: null,
      metadata: { title: 'Post' },
    };

    const item = buildRssItem(blob, 'https://example.com');

    expect(item).toContain(`<pubDate>${updatedAt.toUTCString()}</pubDate>`);
  });
});

describe('buildRssFeed', () => {
  const buildDate = new Date('2025-07-01T00:00:00Z');
  const channel = {
    siteUrl: 'https://example.com',
    title: 'My Site',
    description: 'A test site',
  };

  it('generates valid RSS 2.0 XML structure', () => {
    const xml = buildRssFeed(channel, [], buildDate);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('</channel>');
    expect(xml).toContain('</rss>');
  });

  it('includes channel metadata', () => {
    const xml = buildRssFeed(channel, [], buildDate);

    expect(xml).toContain('<title>My Site</title>');
    expect(xml).toContain('<link>https://example.com</link>');
    expect(xml).toContain('<description>A test site</description>');
    expect(xml).toContain('<language>en</language>');
    expect(xml).toContain(
      `<lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>`,
    );
  });

  it('includes atom self-link', () => {
    const xml = buildRssFeed(channel, [], buildDate);

    expect(xml).toContain(
      '<atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"/>',
    );
  });

  it('escapes special characters in channel title and description', () => {
    const xml = buildRssFeed(
      {
        siteUrl: 'https://example.com',
        title: 'Tom & Jerry',
        description: '<script>alert("xss")</script>',
      },
      [],
      buildDate,
    );

    expect(xml).toContain('<title>Tom &amp; Jerry</title>');
    expect(xml).toContain(
      '<description>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</description>',
    );
  });

  it('filters out blobs without date and includes those with date', () => {
    const blobs: RssBlob[] = [
      {
        appPath: '/with-date',
        updatedAt: new Date('2025-01-01'),
        permalink: null,
        metadata: { title: 'Has Date', date: '2025-06-01' },
      },
      {
        appPath: '/no-date',
        updatedAt: new Date('2025-01-01'),
        permalink: null,
        metadata: { title: 'No Date' },
      },
    ];

    const xml = buildRssFeed(channel, blobs, buildDate);

    expect(xml).toContain('<title>Has Date</title>');
    expect(xml).not.toContain('<title>No Date</title>');
  });

  it('filters out blobs with publish: false', () => {
    const blobs: RssBlob[] = [
      {
        appPath: '/draft',
        updatedAt: new Date('2025-01-01'),
        permalink: null,
        metadata: { title: 'Draft', date: '2025-06-01', publish: false },
      },
    ];

    const xml = buildRssFeed(channel, blobs, buildDate);

    expect(xml).not.toContain('<title>Draft</title>');
    expect(xml).not.toContain('<item>');
  });

  it('renders multiple items', () => {
    const blobs: RssBlob[] = [
      {
        appPath: '/post-1',
        updatedAt: new Date('2025-01-01'),
        permalink: null,
        metadata: { title: 'Post 1', date: '2025-06-01' },
      },
      {
        appPath: '/post-2',
        updatedAt: new Date('2025-01-02'),
        permalink: null,
        metadata: { title: 'Post 2', date: '2025-06-02' },
      },
    ];

    const xml = buildRssFeed(channel, blobs, buildDate);

    expect(xml).toContain('<title>Post 1</title>');
    expect(xml).toContain('<title>Post 2</title>');
  });

  it('sorts items by date descending (newest first)', () => {
    const blobs: RssBlob[] = [
      {
        appPath: '/old',
        updatedAt: new Date('2025-01-01'),
        permalink: null,
        metadata: { title: 'Old Post', date: '2024-01-01' },
      },
      {
        appPath: '/new',
        updatedAt: new Date('2025-01-01'),
        permalink: null,
        metadata: { title: 'New Post', date: '2025-06-01' },
      },
      {
        appPath: '/mid',
        updatedAt: new Date('2025-01-01'),
        permalink: null,
        metadata: { title: 'Mid Post', date: '2024-06-01' },
      },
    ];

    const xml = buildRssFeed(channel, blobs, buildDate);

    const newIdx = xml.indexOf('New Post');
    const midIdx = xml.indexOf('Mid Post');
    const oldIdx = xml.indexOf('Old Post');
    expect(newIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(oldIdx);
  });

  it('limits items to maxItems', () => {
    const blobs: RssBlob[] = Array.from({ length: 5 }, (_, i) => ({
      appPath: `/post-${i}`,
      updatedAt: new Date('2025-01-01'),
      permalink: null,
      metadata: { title: `Post ${i}`, date: `2025-0${i + 1}-01` },
    }));

    const xml = buildRssFeed(channel, blobs, buildDate, 3);

    const itemCount = (xml.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(3);
  });
});
