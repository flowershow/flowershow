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

export function filterRssBlobs(blobs: RssBlob[]): RssBlob[] {
  return blobs.filter((blob) => {
    const metadata = blob.metadata;
    return metadata?.publish !== false && metadata?.date;
  });
}

export function buildRssItem(blob: RssBlob, siteUrl: string): string {
  const metadata = blob.metadata as Record<string, unknown>;
  const permalink = (blob.permalink ?? blob.appPath)?.replace(/^\//, '');
  const link = `${siteUrl}/${permalink}`;
  const title = escapeXml(
    (metadata.title as string) || permalink || 'Untitled',
  );
  const description = metadata.description
    ? escapeXml(metadata.description as string)
    : '';
  const pubDate = metadata.date
    ? new Date(metadata.date as string).toUTCString()
    : blob.updatedAt.toUTCString();
  const authors = metadata.authors as string[] | undefined;
  const author = authors?.length ? escapeXml(authors.join(', ')) : '';

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
      const dateA = new Date(a.metadata?.date as string).getTime();
      const dateB = new Date(b.metadata?.date as string).getTime();
      return dateB - dateA;
    })
    .slice(0, maxItems);
  const items = filtered.map((blob) => buildRssItem(blob, channel.siteUrl));
  const rssUrl = `${channel.siteUrl}/rss.xml`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${channel.siteUrl}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>en</language>
    <lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>
    <atom:link href="${rssUrl}" rel="self" type="application/rss+xml"/>
${items.join('\n')}
  </channel>
</rss>`;
}
