import { tagToHref } from '@flowershow/core';
import { CalendarIcon, ChevronRightIcon, ClockIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { Breadcrumb } from '@/lib/breadcrumbs';
import { formatLongDate } from '@/lib/listing/dates';
import type { ListingItem } from '@/lib/listing/items';
import type { PostHero } from '@/lib/post/hero';
import { safeDate } from '@/lib/utils';

export type PostAuthor = {
  key: string;
  name: string;
  url: string | null;
  avatar?: string;
};

interface PostLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  /** Folders above the post (the breadcrumb trail without the current page). */
  eyebrow?: Breadcrumb[];
  authors?: PostAuthor[];
  date?: unknown;
  locale: string;
  readingTime?: string;
  hero?: PostHero | null;
  tags?: string[];
  /** false when the full-width Hero replaces the page header (showHero: true). */
  showHeader?: boolean;
  /** Rendered after the article, inside main (the previous/next links). */
  after?: ReactNode;
}

const MAX_AVATARS = 3;

/** A frontmatter date worth showing: a string, a number or a Date (never an object or list). */
const isDateValue = (date: unknown) =>
  date instanceof Date ||
  ((typeof date === 'string' || typeof date === 'number') && date !== '');

function PostDate({ date, locale }: { date: unknown; locale: string }) {
  if (!isDateValue(date)) return null;
  const parsed = safeDate(date);
  const iso = parsed?.toISOString().slice(0, 10);
  return (
    <span className="page-header-date">
      <CalendarIcon className="page-header-date-icon" aria-hidden="true" />
      {iso ? (
        <time dateTime={iso}>{formatLongDate(iso, locale)}</time>
      ) : (
        // Not a date (e.g. "1964-1982"): show it as written, as the page header does
        <span>{String(date)}</span>
      )}
    </span>
  );
}

function AuthorNames({ authors }: { authors: PostAuthor[] }) {
  return (
    <span className="page-header-authors-names-container post-byline-names">
      {authors.map((author, i) => (
        <span key={author.key} className="page-header-author-name-wrapper">
          {i > 0 && (i < authors.length - 1 ? ', ' : ' and ')}
          {author.url ? (
            <Link className="page-header-author-name" href={author.url}>
              {author.name}
            </Link>
          ) : (
            <span className="page-header-author-name">{author.name}</span>
          )}
        </span>
      ))}
    </span>
  );
}

function Byline({
  authors,
  date,
  locale,
  readingTime,
}: {
  authors: PostAuthor[];
  date: unknown;
  locale: string;
  readingTime?: string;
}) {
  const hasDate = isDateValue(date);
  if (authors.length === 0 && !hasDate && !readingTime) return null;
  const avatars = authors.filter((a) => a.avatar).slice(0, MAX_AVATARS);
  // Same wrappers as the page header (themes lay the byline out with them):
  // the authors container holds avatars and names, the date and reading time follow
  return (
    <div
      className="page-header-metadata-container post-byline"
      data-avatars={avatars.length > 0 ? '' : undefined}
    >
      {authors.length > 0 && (
        <div className="page-header-authors-container post-byline-authors">
          {avatars.length > 0 && (
            <span
              className="page-header-authors-avatars-container post-byline-avatars"
              aria-hidden="true"
            >
              {avatars.map((a) => (
                <Image
                  key={a.key}
                  className="page-header-author-avatar post-byline-avatar"
                  src={a.avatar!}
                  alt=""
                  width={40}
                  height={40}
                  sizes="40px"
                />
              ))}
            </span>
          )}
          <AuthorNames authors={authors} />
        </div>
      )}
      {(hasDate || readingTime) && (
        <div className="post-byline-meta">
          {hasDate && <PostDate date={date} locale={locale} />}
          {readingTime && (
            <span className="page-header-reading-time">
              <ClockIcon
                className="page-header-reading-time-icon"
                aria-hidden="true"
              />
              <span>{readingTime}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Eyebrow({ crumbs }: { crumbs: Breadcrumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="page-header-breadcrumbs post-eyebrow"
    >
      <ol className="page-header-breadcrumbs-list">
        {crumbs.map((crumb, i) => (
          <li
            key={`${i}-${crumb.label}`}
            className="page-header-breadcrumb-item"
          >
            {i > 0 && (
              <ChevronRightIcon
                className="page-header-breadcrumb-separator"
                aria-hidden="true"
              />
            )}
            {crumb.href ? (
              <Link href={crumb.href} className="page-header-breadcrumb-link">
                {crumb.label}
              </Link>
            ) : (
              <span>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Hero({ hero }: { hero: PostHero }) {
  const style =
    hero.ratio != null
      ? ({ '--_post-hero-ratio': String(hero.ratio) } as CSSProperties)
      : undefined;
  return (
    <figure className="post-hero">
      <div className="post-hero-media" style={style}>
        <Image
          className="post-hero-img"
          src={hero.src}
          alt={hero.alt}
          fill
          sizes="(min-width: 768px) 44rem, 100vw"
          priority
          style={{ objectFit: 'cover' }}
        />
      </div>
      {hero.caption && (
        <figcaption className="post-hero-caption">{hero.caption}</figcaption>
      )}
    </figure>
  );
}

/** An individual post (docs/plans/2026-10-11-post-page-layout.md): the page header classes plus post hooks. */
export function PostLayout({
  children,
  title,
  description,
  eyebrow = [],
  authors = [],
  date,
  locale,
  readingTime,
  hero,
  tags = [],
  showHeader = true,
  after,
}: PostLayoutProps) {
  return (
    <>
      <article className="post-page" data-layout="post">
        {showHeader && (
          <header className="page-header post-header">
            {eyebrow.length > 0 && <Eyebrow crumbs={eyebrow} />}
            {title && <h1 className="page-header-title">{title}</h1>}
            {description && (
              <p className="page-header-description post-dek">{description}</p>
            )}
            <Byline
              authors={authors}
              date={date}
              locale={locale}
              readingTime={readingTime}
            />
            {hero && <Hero hero={hero} />}
          </header>
        )}
        <div className="page-body">{children}</div>
        {tags.length > 0 && (
          <footer className="post-footer">
            <div className="page-header-tags post-tags">
              {tags.map((tag) => (
                <Link key={tag} href={tagToHref(tag)} className="tag-pill">
                  #{tag}
                </Link>
              ))}
            </div>
          </footer>
        )}
      </article>
      {after}
    </>
  );
}

export function PostNav({
  previous,
  next,
}: {
  previous: Pick<ListingItem, 'url' | 'title'> | null;
  next: Pick<ListingItem, 'url' | 'title'> | null;
}) {
  if (!previous && !next) return null;
  return (
    <nav className="post-nav" aria-label="Previous and next posts">
      {previous ? (
        <Link
          className="post-nav-link post-nav-link--prev"
          href={previous.url}
          rel="prev"
        >
          <span className="post-nav-label">
            <span aria-hidden="true">← </span>Previous
          </span>
          <span className="post-nav-title">{previous.title}</span>
        </Link>
      ) : (
        <div className="post-nav-placeholder" aria-hidden="true" />
      )}
      {next ? (
        <Link
          className="post-nav-link post-nav-link--next"
          href={next.url}
          rel="next"
        >
          <span className="post-nav-label">
            Next<span aria-hidden="true"> →</span>
          </span>
          <span className="post-nav-title">{next.title}</span>
        </Link>
      ) : (
        <div className="post-nav-placeholder" aria-hidden="true" />
      )}
    </nav>
  );
}

export function PostReadMore({ cards }: { cards: ReactNode }) {
  if (!cards) return null;
  return (
    <section className="post-read-more" aria-labelledby="post-read-more-title">
      <h2 className="post-read-more-title" id="post-read-more-title">
        Read more
      </h2>
      {cards}
    </section>
  );
}
