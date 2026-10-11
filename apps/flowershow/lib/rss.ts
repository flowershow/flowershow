import { isDraft } from '@/lib/listing/rules';
import { safeDate } from './utils';

export interface RssBlob {
  appPath: string | null;
  updatedAt: Date;
  permalink: string | null;
  metadata: Record<string, unknown> | null;
}

export interface RssChannel {
  siteUrl: string;
  title: string;
  description: string;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** A frontmatter scalar as text; objects and arrays are not text. */
function textOf(value: unknown): string {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value).trim()
    : '';
}

export function filterRssBlobs(blobs: RssBlob[]): RssBlob[] {
  return blobs.filter((blob) => {
    const metadata = blob.metadata;
    return metadata?.publish !== false && !isDraft(metadata) && metadata?.date;
  });
}

export function buildRssItem(blob: RssBlob, siteUrl: string): string {
  const metadata = blob.metadata as Record<string, unknown>;
  const permalink = (blob.permalink ?? blob.appPath)?.replace(/^\//, '');
  const link = escapeXml(`${siteUrl}/${permalink}`);
  const title = escapeXml(textOf(metadata.title) || permalink || 'Untitled');
  const descriptionText = textOf(metadata.description);
  const description = descriptionText ? escapeXml(descriptionText) : '';
  const pubDate = (safeDate(metadata.date) ?? blob.updatedAt).toUTCString();
  // Frontmatter is untrusted: `authors: "[[ada]]"` (a scalar) or objects must not throw
  const raw = metadata.authors;
  const authors = (Array.isArray(raw) ? raw : raw == null ? [] : [raw])
    .map(textOf)
    .map((a) =>
      a.replace(
        /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/,
        (_, t, alias) => alias ?? t,
      ),
    )
    .filter(Boolean);
  const author = authors.length ? escapeXml(authors.join(', ')) : '';

  return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pubDate}</pubDate>${description ? `\n      <description>${description}</description>` : ''}${author ? `\n      <author>${author}</author>` : ''}
    </item>`;
}

export function buildRssFeed(
  channel: RssChannel,
  blobs: RssBlob[],
  buildDate: Date,
  maxItems = 50,
): string {
  const filtered = filterRssBlobs(blobs)
    .sort((a, b) => {
      const dateA = safeDate(a.metadata?.date)?.getTime() ?? 0;
      const dateB = safeDate(b.metadata?.date)?.getTime() ?? 0;
      return dateB - dateA;
    })
    .slice(0, maxItems);
  const items = filtered.map((blob) => buildRssItem(blob, channel.siteUrl));
  const siteUrl = escapeXml(channel.siteUrl);
  const rssUrl = escapeXml(`${channel.siteUrl}/rss.xml`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>en</language>
    <lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>
    <atom:link href="${rssUrl}" rel="self" type="application/rss+xml"/>
${items.join('\n')}
  </channel>
</rss>`;
}
