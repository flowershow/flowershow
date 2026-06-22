import Link from 'next/link';
import { api } from '@/trpc/server';

interface Props {
  siteId: string;
  blobId: string;
}

export default async function BacklinksPanel({ siteId, blobId }: Props) {
  const backlinks = await api.site.getBacklinks
    .query({ siteId, blobId })
    .catch(() => []);

  if (backlinks.length === 0) return null;

  return (
    <div className="page-backlinks-container">
      <h2 className="page-backlinks-title">Linked from</h2>
      <ul className="page-backlinks-list">
        {backlinks.map((b) => (
          <li key={b.appPath}>
            <Link href={b.appPath!}>{b.title ?? b.appPath}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
