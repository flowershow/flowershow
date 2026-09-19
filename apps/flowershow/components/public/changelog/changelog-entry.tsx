import Link from 'next/link';
import { type ChangelogEntryMeta, formatChangelogDate } from '@/lib/changelog';
import type { ChangelogAuthor } from './types';

function Authors({ authors }: { authors: ChangelogAuthor[] }) {
  if (authors.length === 0) return null;
  return (
    <div className="changelog-entry-authors">
      {authors.map((a) => {
        const inner = (
          <>
            {a.avatar && (
              // Plain <img>: avatars come from arbitrary user domains.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.avatar}
                alt=""
                width={22}
                height={22}
                className="changelog-entry-author-avatar"
              />
            )}
            <span>{a.name}</span>
          </>
        );
        return a.url ? (
          <Link key={a.key} href={a.url} className="changelog-entry-author">
            {inner}
          </Link>
        ) : (
          <span key={a.key} className="changelog-entry-author">
            {inner}
          </span>
        );
      })}
    </div>
  );
}

interface Props extends React.PropsWithChildren {
  entry: ChangelogEntryMeta;
  authors: ChangelogAuthor[];
  variant: 'index' | 'page';
  indexUrl?: string;
}

export function ChangelogEntry({
  entry,
  authors,
  variant,
  indexUrl,
  children,
}: Props) {
  const isIndex = variant === 'index';
  const time = entry.date && (
    <time dateTime={entry.date}>{formatChangelogDate(entry.date)}</time>
  );
  const meta = (
    <>
      {time &&
        (isIndex ? (
          <a className="changelog-entry-date" href={`#${entry.anchor}`}>
            {time}
          </a>
        ) : (
          <span className="changelog-entry-date">{time}</span>
        ))}
      {entry.version && (
        <span className="changelog-entry-version">{entry.version}</span>
      )}
      <Authors authors={authors} />
    </>
  );
  const content = (
    <>
      {entry.description && (
        <p className="changelog-entry-description">{entry.description}</p>
      )}
      {entry.image && (
        <figure className="changelog-entry-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.image} alt="" />
        </figure>
      )}
      <div className="changelog-entry-body rendered-mdx">{children}</div>
    </>
  );

  if (isIndex) {
    return (
      <li className="changelog-entry" id={entry.anchor}>
        <div className="changelog-entry-meta">
          <div className="changelog-entry-meta-inner">{meta}</div>
        </div>
        <div className="changelog-entry-content">
          <h2 className="changelog-entry-title">
            <Link href={entry.url}>{entry.title}</Link>
          </h2>
          {content}
        </div>
      </li>
    );
  }

  return (
    <article className="changelog-single">
      {indexUrl && (
        <Link className="changelog-back" href={indexUrl}>
          ← Changelog
        </Link>
      )}
      <div className="changelog-entry-meta">{meta}</div>
      <h1 className="changelog-entry-title">{entry.title}</h1>
      {content}
    </article>
  );
}
